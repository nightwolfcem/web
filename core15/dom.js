'use strict';
import CLASS from './CLASS.js';
import { ensureBodySublayers } from './ensureBodySublayers.js';
import { maxDefaultLayers } from './layers.defaults.js';
// core/dom.js
// Tdom: DOM yardımcıları + yükleyici + seçim katmanı kurulumu
// Kurallar: T-name (^T[a-z][A-Za-z0-9]*$), CLASS merkezli, eksiltme yok, ns otomatik.


/* global CLASS, TpointerController, Tlayer, TeventBinder, TeventBridge, TfunctionRegistry */

export const TdomVersion = '1.1.0'; // rev: APPEND içerikleri entegre edildi; duplikasyonlar temizlendi

// ===== Kayıtlı başlangıç fonksiyonları =====
const __loadFuncs = new Set();
let __ranInitializers = false;

/**
 * DOM tamamen yüklendiğinde çalıştırılmak üzere bir fonksiyon kaydeder.
 * DOM zaten hazırsa, fonksiyon mikro-görev olarak anında çağrılır.
 */
export function onDOMLoad(func){
  if (typeof func !== 'function') return;
  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    queueMicrotask(() => { try{ func(); }catch(e){ console.error('[Tdom] onDOMLoad(fn) error:', e); } });
  } else {
    __loadFuncs.add(func);
  }
}

/** İç çalıştırıcı: kayıtlı tüm fonksiyonları güvenle çağırır (tek sefer). */
function runAll(){
  if (__ranInitializers) return;
  __ranInitializers = true;
  for (const fn of Array.from(__loadFuncs)){
    try{ fn(); }catch(err){ console.error('[Tdom] Başlangıç fonksiyonu hatası:', err); }
  }
  __loadFuncs.clear();
}

/** Yol yardımcıları */
function upPath(url, up=1){
  try{
    const base = (typeof window!=='undefined' && window.location) ? window.location.href : 'http://localhost/';
    const u = new URL(url ?? base, base);
    const segs = u.pathname.split('/').filter(Boolean);
    for (let i=0;i<up;i++){ if (segs.length) segs.pop(); }
    return (u.origin + '/' + segs.join('/') + (segs.length?'/':''));
  }catch(e){
    return './';
  }
}

/** <link rel="stylesheet"> ekler; aynı href varsa tekrar eklemez. */
function addStyleSheet(href, attrs={}){
  if (!href) return null;
  const id = 'css:' + btoa(unescape(encodeURIComponent(href))).replace(/=+$/,'');
  const old = document.getElementById(id);
  if (old) return old;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  for (const [k,v] of Object.entries(attrs||{})){ try{ link.setAttribute(k, v);}catch{} }
  document.head.appendChild(link);
  return link;
}

/** <script> ekler (defer); aynı src varsa tekrar eklemez. */
function addScript(srcOrOpts){
  const opts = (typeof srcOrOpts==='string') ? { src: srcOrOpts } : (srcOrOpts||{});
  if (!opts.src) return null;
  const id = 'js:' + btoa(unescape(encodeURIComponent(opts.src))).replace(/=+$/,'');
  const old = document.getElementById(id);
  if (old) return old;
  const s = document.createElement('script');
  s.id = id; s.src = opts.src; s.defer = opts.defer!==false;
  if (opts.type) s.type = opts.type;
  document.head.appendChild(s);
  return s;
}

/** Sayfa başlığı */
function setTitle(text){ try{ document.title = String(text??''); }catch{} }



// ===== Tdom Sınıfı (entegre, APPEND yok) =====
export const Tdom = CLASS(class Tdom{
  static TNAME = 'Tdom';

  constructor(opts={}){
    this.opts = opts;
    this.pointer = null;            // TpointerController örneği
    this.baseLayer = null;          // Tlayer kökü (varsa)
    this.selectionRectangle = null; // HTMLElement
    this.loaded = false;
  }

  // Yardımcılar
  addStyleSheet(href, attrs){ return addStyleSheet(href, attrs); }
  addScript(srcOrOpts){ return addScript(srcOrOpts); }
  setTitle(text){ return setTitle(text); }

  /** import.meta.url tabanlı yukarı yol üretir */
  getUpPath(baseUrl=null, up=1){
    let url = baseUrl;
    try {
      // import.meta.url guard (bundle dışı ortamlarda sorun çıkmasın)
      if (!url) { url = (import.meta && import.meta.url) ? import.meta.url : url; }
    } catch {}
    if (!url){
      const cs = document.currentScript;
      url = cs && cs.src ? cs.src : window.location.href;
    }
    return upPath(url, up);
  }

  /** Başlangıç kurulumu */
  initialize(){
    if (this.loaded) return;
    this.loaded = true;
    ensureBodySublayers(document.body, { order: maxDefaultLayers });
    // 1) CSS dosyasını bağla (opsiyonel; kendi yol çözümleyicinle)
    try{
      const cssHref = this.getUpPath(null, 2) + '../css/dom.css';
      this.addStyleSheet(cssHref);
    }catch(e){ /* yol sorunları kritik değil */ }

    // 2 Pointer Controller
    try{
      if (typeof TpointerController==='function'){
        const host = this.baseLayer?.htmlObject || document.documentElement;
        this.pointer = new TpointerController(host);
      }
    }catch(e){ console.warn('[Tdom] TpointerController kurulamadı:', e); }

    // 3 Base layer + alt katmanlar
    try{
      if (!this.baseLayer && typeof Tlayer==='function'){
        this.baseLayer = new Tlayer('div', { parent: document.body, layerName: 'base' });
        if (typeof this.baseLayer.createSubLayers==='function'){
          this.baseLayer.createSubLayers();
        }
      }
    }catch(e){ console.warn('[Tdom] Tlayer bulunamadı/kurulamadı:', e); }

    // 4 Seçim dikdörtgeni
    try{
      if (this.baseLayer && this.baseLayer.subLayers && this.baseLayer.subLayers['selection']){
        const selLayer = this.baseLayer.subLayers['selection'];
        const sel = new Tlayer('div', { parent: selLayer, layerName: 'selectionRectangle' });
        this.selectionRectangle = sel.htmlObject;
      }else{
        const sel = document.createElement('div');
        sel.className = 'selection-rectangle';
        document.body.appendChild(sel);
        this.selectionRectangle = sel;
      }
      if (this.selectionRectangle){
        this.selectionRectangle.classList.add('selection-rectangle');
        this.selectionRectangle.style.display = 'none';
      }
    }catch(e){ console.warn('[Tdom] selectionRectangle oluşturulamadı:', e); }

    // 5 CLASS.byOrder -> body()/mount()/load()
    try{
      if (typeof CLASS==='object' && Array.isArray(CLASS.byOrder)){
        for (const el of CLASS.byOrder){
          if (typeof el?.body === 'function' && !el.loaded){
            try{ el.mount?el.mount():el.load?el.load():el.body(); el.loaded = true; }catch(err){ console.error('[Tdom] body() hata:', err); }
          }
        }
      }
    }catch(e){ /* kritik değil */ }
  }

  // === Event köprüleri ===

  /** Event bağla; TeventBinder varsa onu kullanır, yoksa native addEventListener. */
  on(el, type, fn, opts){
    try {
      if (typeof TeventBinder !== 'undefined' && TeventBinder && typeof TeventBinder.bind === 'function'){
        return TeventBinder.bind(el, type, fn, opts);
      }
    } catch {}
    el.addEventListener(type, fn, opts);
    return ()=>{ try{ el.removeEventListener(type, fn, opts); }catch{} };
  }

  /** Kimlikli event bağla; TeventBridge yoksa TfunctionRegistry ile id üretir. */
  onWithId(el, type, ns, name, fn, opts){
    try {
      if (typeof TeventBridge !== 'undefined' && TeventBridge && typeof TeventBridge.bindWithId === 'function'){
        return TeventBridge.bindWithId(el, type, ns, name, fn, opts);
      }
    } catch {}
    el.addEventListener(type, fn, opts);
    let id = null;
    try {
      if (typeof TfunctionRegistry !== 'undefined' && TfunctionRegistry && typeof TfunctionRegistry.register === 'function'){
        id = TfunctionRegistry.register(ns||'events', name||fn?.name||'event', fn);
      }
    } catch {}
    return { id };
  }

  /** Event snapshot al (TeventBridge varsa). */
  snapshotEvents(el){
    try {
      if (typeof TeventBridge !== 'undefined' && TeventBridge && typeof TeventBridge.snapshot === 'function'){
        return TeventBridge.snapshot(el);
      }
    } catch {}
    return null;
  }

  /** Event snapshot geri yükle (TeventBridge varsa). */
  restoreEvents(el, snap){
    try {
      if (typeof TeventBridge !== 'undefined' && TeventBridge && typeof TeventBridge.restore === 'function'){
        TeventBridge.restore(el, snap);
      }
    } catch {}
    return this;
  }

  // === Pointer & Layer köprüleri ===

  usePointer(ptr, { attachTo } = {}){
    this.pointer = ptr;
    if (ptr && attachTo){
      try { ptr.attach ? ptr.attach(attachTo) : null; } catch {}
    }
    return this;
  }

  useLayer(layer, { mountTo } = {}){
    this.baseLayer = layer;
    if (layer && mountTo && typeof layer.mount === 'function'){
      try { layer.mount(mountTo); } catch {}
    }
    return this;
  }

  // === Seçim dikdörtgeni API ===

  setSelectionRect(rectEl){
    this.selectionRectangle = rectEl || null;
    return this;
  }

  showSelectionRect(r){
    const el = this.selectionRectangle;
    if (!el || !r) return this;
    try {
      el.style.display = '';
      el.style.left = r.x+'px'; el.style.top = r.y+'px';
      el.style.width = r.w+'px'; el.style.height = r.h+'px';
    } catch {}
    return this;
  }

  hideSelectionRect(){
    const el = this.selectionRectangle;
    if (!el) return this;
    try { el.style.display = 'none'; } catch {}
    return this;
  }
});

// Tekil örnek ve global bağlama (ns otomatik)
export const DOM = new Tdom();
if (typeof window !== 'undefined'){ window.DOM = DOM; }

// Yükleme bağlayıcısı
if (document.readyState === 'loading' || document.readyState === 'interactive'){
  document.addEventListener('DOMContentLoaded', () => { runAll(); DOM.initialize(); }, { once:true });
}else{
  runAll(); DOM.initialize();
}

// === P2: Event bridge helpers (id'li bağlama desteği) ===
if (typeof Tdom !== 'undefined') {
  const P = Tdom.prototype || Tdom;
  if (typeof P.on !== 'function'){
    P.on = function(el, type, fn, opts){
      try {
        if (typeof TeventBinder !== 'undefined' && TeventBinder && typeof TeventBinder.bind === 'function'){
          return TeventBinder.bind(el, type, fn, opts);
        }
      } catch {}
      el.addEventListener(type, fn, opts);
      return ()=>{ try{ el.removeEventListener(type, fn, opts); }catch{} };
    };
  }
  if (typeof P.onWithId !== 'function'){
    P.onWithId = function(el, type, ns, name, fn, opts){
      try {
        if (typeof TeventBridge !== 'undefined' && TeventBridge && typeof TeventBridge.bindWithId === 'function'){
          return TeventBridge.bindWithId(el, type, ns, name, fn, opts);
        }
      } catch {}
      // Fallback to native addEventListener if bridge yoksa
      el.addEventListener(type, fn, opts);
      let removed = false;
      return {
        id: ns + ':' + name,
        off(){ if (!removed){ try{ el.removeEventListener(type, fn, opts); }catch{} removed=true; } }
      };
    };
  }
}

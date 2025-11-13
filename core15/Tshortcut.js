'use strict';
// Tshortcut.js — Cem-spec unified (syntax-safe, complete, TLAYER-LESS)
// Klavye kısayolları (undo/redo/copy/cut/paste/select/nudge/delete) + özelleştirilebilir aksiyonlar
// Chord (ardışık tuş dizileri) ve combo (mod + key) desteği
// Not: Tlayer bağımlılığı kaldırıldı; katman işlemleri için isteğe bağlı `layers` servisinin API'si kullanılır.

import CLASS from './CLASS.js'
import { Tevents } from './Tevents.js';
import { isObj,getElement  } from './utils.js';

/* =============== yardımcılar =============== */
function _isMac(){ try{ return /Mac|iPhone|iPad|iPod/.test(navigator.platform||'') || /Mac OS/.test(navigator.userAgent||''); }catch{ return false; } }
function _ensurePx(v){ const n = parseFloat(v||0) || 0; return n; }
function _nudgeStyle(el, dx, dy){
  if (!el || !el.style) return;
  const L = _ensurePx(el.style.left);
  const T = _ensurePx(el.style.top);
  el.style.left = (L + dx) + 'px';
  el.style.top  = (T + dy) + 'px';
}
function _isTypingTarget(t){
  const el = t && (t.shadowRoot ? t.shadowRoot.activeElement : t);
  if (!el) return false;
  const tag = (el.tagName||'').toLowerCase();
  const editable = el.isContentEditable || el.getAttribute?.('contenteditable') === 'true';
  return editable || tag==='input' || tag==='textarea' || tag==='select';
}
function _comboFromEvent(e, { useCode=false } = {}){
  // Normalizasyon: Shift,Alt,Mod + KEY
  const parts = [];
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  const isMac = _isMac();
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (mod) parts.push('Mod');
  let key = useCode ? e.code : e.key;
  if (!key) key = '';
  if (key.length===1) key = key.toUpperCase();
  // Normalize bazı özel tuş adları
  const map = { 'Esc':'Escape', 'Left':'ArrowLeft', 'Right':'ArrowRight', 'Up':'ArrowUp', 'Down':'ArrowDown', 'Del':'Delete' };
  key = map[key] || key;
  // Tek başına Mod gelmişse atla (sadece modifier basımı)
  if (key==='Control' || key==='Meta' || key==='Alt' || key==='Shift') key = '';
  if (key) parts.push(key);
  return parts.join('+');
}
function _prevent(e){ try{ e.preventDefault(); e.stopPropagation(); }catch{} }

/* Katman nesnesi sezgisel tespiti (Tlayer yokken) */
function _isLayerLike(it, layers){
  if (!it) return false;
  // Tercihen servis API'si
  try{
    if (layers && typeof layers.isLayer === 'function'){
      if (layers.isLayer(it)) return true;
    }
  }catch{}
  // Yumuşak sezgiler: data-slot/data-layer ya da t-layer-slot sınıfı
  const el = getElement(it);
  if (!el) return false;
  try{
    if (el.hasAttribute?.('data-slot') || el.hasAttribute?.('data-layer')) return true;
    if (el.classList?.contains('t-layer-slot')) return true;
  }catch{}
  return false;
}

/* dahili durum deposu */
const __S = new WeakMap();
function __ensure(self){
  let s = __S.get(self);
  if (!s){
    s = {
      map: new Map(),            // combo -> Set<fn>
      context: 'global',
      chordMap: new Map(),       // "A B" -> { handler, prevent }
      chordBuf: [],
      chordTimer: null,
      chordTimeout: 750
    };
    __S.set(self, s);
  }
  return s;
}

/* =============== Tshortcut =============== */
export const Tshortcut = CLASS(class Tshortcut extends CLASS.extends(Tevents) {
  /**
   * @param {object} opts
   *  - target: EventTarget (document gibi). Varsayılan: document
   *  - enabled: başlangıçta açık mı
   *  - scope: Element — yalnız bu scope içinde çalış (opsiyonel)
   *  - history: ThistoryManager — undo/redo için
   *  - selection: Tselection — seçim işlemleri için
   *  - layers: subLayers/Tlayer benzeri servis — layer işlemleri için
   *  - clipboard: Tclipboard — copy/cut/paste için
   *  - render: Trender — DOM style/move gibi işlemler için
   *  - keymap: { 'Mod+Z':'undo', ... } — özelleştirilebilir
   */
  constructor(opts={}){
    super();
    const {
      target=null, enabled=true, scope=null,
      history=null, selection=null, layers=null, clipboard=null, render=null,
      keymap=null
    } = opts||{};

    this.target = target || (typeof document!=='undefined' ? document : null);
    this.scope = scope || null;
    this.enabled = !!enabled;
    this.history = history || null;
    this.selection = selection || null;
    this.layers = layers || null;
    this.clipboard = clipboard || null;
    this.render = render || null;

    this.keymap = Object.assign({
      'Mod+Z': 'undo',
      'Shift+Mod+Z': 'redo',
      'Mod+Y': 'redo',
      'Mod+C': 'copy',
      'Mod+X': 'cut',
      'Mod+V': 'paste',
      'Mod+A': 'selectAll',
      'Escape': 'clearSelection',
      'Delete': 'delete',
      'Backspace': 'delete',
      'ArrowLeft': 'nudgeLeft',
      'ArrowRight': 'nudgeRight',
      'ArrowUp': 'nudgeUp',
      'ArrowDown': 'nudgeDown',
      'Shift+ArrowLeft': 'nudgeLeftBig',
      'Shift+ArrowRight': 'nudgeRightBig',
      'Shift+ArrowUp': 'nudgeUpBig',
      'Shift+ArrowDown': 'nudgeDownBig'
    }, isObj(keymap) ? keymap : {});

    this.actions = new Map(); // name -> handler({e, shortcut:this})
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._pressed = new Set();

    if (this.enabled) this.attach();
    this._installDefaultActions();
  }

  /* ---------- lifecycle ---------- */
  attach(){
    if (!this.target) this.target = (typeof document!=='undefined' ? document : null);
    if (!this.target) return this;
    this.target.addEventListener('keydown', this._onKeyDown, true);
    this.target.addEventListener('keyup', this._onKeyUp, true);
    this.emit('attach');
    return this;
  }
  detach(){
    if (!this.target) return this;
    this.target.removeEventListener('keydown', this._onKeyDown, true);
    this.target.removeEventListener('keyup', this._onKeyUp, true);
    this.emit('detach');
    return this;
  }
  enable(){ if (!this.enabled){ this.enabled=true; this.attach(); this.emit('enable');} return this; }
  disable(){ if (this.enabled){ this.enabled=false; this.detach(); this.emit('disable');} return this; }
  setScope(el){ this.scope = el || null; return this; }
  setKeymap(map){ if (isObj(map)) Object.assign(this.keymap, map); return this; }

  /* ---------- event handlers ---------- */
  _inScope(e){
    if (!this.scope) return true;
    try{
      const t = e.target;
      if (!t) return true;
      return this.scope.contains ? this.scope.contains(t) : true;
    }catch{ return true; }
  }

  _handleChord(combo, e){
    const s = __ensure(this);
    if (!combo) return false;
    // buffer ekle
    s.chordBuf.push(combo);
    // prefix var mı?
    const prefix = s.chordBuf.join(' ').toLowerCase();
    let hasPrefix = false, matched = null;
    for (const [k, rec] of s.chordMap){
      if (k.startsWith(prefix)){
        hasPrefix = true;
        if (k === prefix) matched = rec;
      }
    }
    if (!hasPrefix){
      // sadece son komboyu tutarak yeniden dene
      s.chordBuf = [combo];
      const single = combo.toLowerCase();
      matched = s.chordMap.get(single) || null;
      if (!matched){
        // eşleşme yok → temizle
        s.chordBuf.length = 0;
        return false;
      }
    }
    // zamanlayıcıyı yenile
    clearTimeout(s.chordTimer);
    s.chordTimer = setTimeout(()=>{ s.chordBuf.length=0; }, s.chordTimeout);

    if (matched){
      if (matched.prevent) _prevent(e);
      try{ matched.handler({ comboSeq: s.chordBuf.slice(), e, shortcut:this }); }catch{}
      s.chordBuf.length = 0;
      return true;
    }
    return false;
  }

  _dispatchCombo(combo, e){
    // önce kullanıcı kayıtlı dinleyiciler
    const s = __ensure(this);
    const set = s.map.get(combo);
    if (set && set.size){
      for (const fn of set){
        try{ if (fn({ e, combo, shortcut:this })) return true; }catch{}
      }
    }
    // sonra keymap aksiyonu
    const name = this.keymap[combo];
    if (name){
      const ok = this.run(name, { e, combo });
      if (ok) return true;
    }
    return false;
  }

  _onKeyDown(e){
    if (!this.enabled) return;
    // sistem kısayollarına karışma (bazı Windows özel tuşlar)
    if (!_isMac() && (e.key==='F5' || e.key==='F12' || (e.altKey && e.key==='F4'))) return;

    // metin alanında yazarken, sadece Mod içerenler devreye girsin
    const typing = _isTypingTarget(e.target);
    if (typing && !(e.metaKey || e.ctrlKey)) return;

    if (!this._inScope(e)) return;

    const combo = _comboFromEvent(e);
    if (!combo) return;

    // önce chord dene
    const chordHandled = this._handleChord(combo, e);
    if (chordHandled) return;

    // ardından tekli combo dispatch
    const handled = this._dispatchCombo(combo, e);
    if (handled){ _prevent(e); return; }

    // tekrar (hold) için
    if (e.repeat){
      const handledRep = this._dispatchCombo(combo, e);
      if (handledRep){ _prevent(e); return; }
    }

    this._pressed.add(e.key);
  }

  _onKeyUp(e){
    this._pressed.delete(e.key);
  }

  /* ---------- public action API ---------- */
  registerAction(name, fn){ this.actions.set(String(name), fn); return this; }
  unregisterAction(name){ this.actions.delete(String(name)); return this; }
  run(name, ctx={}){
    const h = this.actions.get(String(name));
    if (typeof h === 'function'){
      try{ return !!h({ ...ctx, shortcut:this }); }catch{ return false; }
    }
    return !!this._runDefault(name, ctx);
  }

  /* ---------- default actions ---------- */
  _installDefaultActions(){
    const A = (n, f)=> this.registerAction(n, f);

    A('undo', ({ shortcut })=> !!shortcut.history?.undo?.());
    A('redo', ({ shortcut })=> !!shortcut.history?.redo?.());

    A('copy', ({ shortcut })=>{
      const S = shortcut.selection; const CB = shortcut.clipboard; if (!CB) return false;
      const items = S?.list?.() || S?.items?.() || [];
      const anyLayer = items.some(it => _isLayerLike(it, shortcut.layers));
      if (anyLayer && CB.copyLayers) return !!CB.copyLayers(items);
      const els = items.map(getElement).filter(Boolean);
      if (els.length) return !!(CB.copyDOM?.(els));
      return false;
    });
    A('cut', ({ shortcut })=>{
      const S = shortcut.selection; const CB = shortcut.clipboard; if (!CB) return false;
      const items = S?.list?.() || S?.items?.() || [];
      const anyLayer = items.some(it => _isLayerLike(it, shortcut.layers));
      if (anyLayer && CB.cutLayers) return !!CB.cutLayers(items);
      const els = items.map(getElement).filter(Boolean);
      if (els.length) return !!(CB.cutDOM?.(els));
      return false;
    });
    A('paste', ({ shortcut })=>{
      const CB = shortcut.clipboard; if (!CB) return false;
      const type = CB.buffer?.type;
      if (type==='layers' && CB.pasteLayers) return !!CB.pasteLayers({ selectAfter:true });
      if (type==='dom'    && CB.pasteDOM)    return !!CB.pasteDOM({ selectAfter:true });
      if (type==='doc'    && CB.pasteDoc)    return !!CB.pasteDoc({});
      // plain clipboard
      return !!CB.paste?.({});
    });

    A('selectAll', ({ shortcut })=>{
      const S = shortcut.selection; if (!S) return false;
      const L = shortcut.layers;
      // Eğer layer servisi flatten sağlıyorsa oradan topla:
      if (L && typeof L.flatten==='function'){
        const all = L.flatten().filter(n=> n!==L.root);
        S.set?.(all); return true;
      }
      // Aksi halde scope içindeki tüm DOM
      const scope = shortcut.scope || (typeof document!=='undefined' ? document.body : null);
      const els = scope ? Array.from((scope.querySelectorAll?.('*')||[])) : [];
      if (els.length){ S.set?.(els); return true; }
      return false;
    });

    A('clearSelection', ({ shortcut })=> !!shortcut.selection?.clear?.());

    const nud = (dx, dy)=>({ shortcut })=>{
      const S = shortcut.selection; if (!S) return false;
      const items = S.list ? S.list() : (S.items ? S.items() : []);
      if (!items.length) return false;
      const R = shortcut.render;
      if (R && typeof R.withBatch==='function'){
        R.withBatch('nudge', ()=>{
          for (const it of items){
            const el = getElement(it); if (!el) continue;
            if (R.style) R.style(el, { left: (_ensurePx(el.style.left)+dx)+'px', top: (_ensurePx(el.style.top)+dy)+'px' }, { label:'dom@nudge' });
            else _nudgeStyle(el, dx, dy);
          }
        });
        return true;
      }
      for (const it of items){ const el=getElement(it); if (el) _nudgeStyle(el, dx, dy); }
      return true;
    };
    A('nudgeLeft', nud(-1, 0));
    A('nudgeRight', nud(1, 0));
    A('nudgeUp', nud(0, -1));
    A('nudgeDown', nud(0, 1));
    A('nudgeLeftBig', nud(-10, 0));
    A('nudgeRightBig', nud(10, 0));
    A('nudgeUpBig', nud(0, -10));
    A('nudgeDownBig', nud(0, 10));

    A('delete', ({ shortcut })=>{
      const S = shortcut.selection; const L = shortcut.layers; const R = shortcut.render;
      const items = S?.list?.() || S?.items?.() || [];
      if (!items.length) return false;

      // Katman nesneleri varsa servis üzerinden kaldır
      if (L && typeof L.remove==='function'){
        const layersOnly = items.filter(it => _isLayerLike(it, L));
        if (layersOnly.length){
          for (const it of layersOnly){ try{ L.remove(it, { label:'layer:delete' }); }catch{} }
          return true;
        }
      }

      // DOM fallback
      const nodes = items.map(getElement).filter(Boolean);
      if (nodes.length){
        if (R && R.remove){ for (const n of nodes) R.remove(n, { label:'dom@remove' }); }
        else { for (const n of nodes){ if (n.parentNode) n.parentNode.removeChild(n); } }
        return true;
      }
      return false;
    });
  }

  /* ---------- default fallback ---------- */
  _runDefault(name, ctx){
    // Gerekirse burada ek defaultlar tanımlanabilir.
    return false;
  }

  /* ---------- combo/chord dinleyicileri ---------- */
  on(combo, fn){
    const s = __ensure(this);
    const key = String(combo);
    let set = s.map.get(key);
    if (!set){ set = new Set(); s.map.set(key, set); }
    set.add(fn);
    return this;
  }
  off(combo, fn){
    const s = __ensure(this);
    if (!combo){ s.map.clear(); return this; }
    const key = String(combo);
    const set = s.map.get(key);
    if (!set) return this;
    if (fn) set.delete(fn); else set.clear();
    if (set.size === 0) s.map.delete(key);
    return this;
  }
  setContext(ctx){ const s = __ensure(this); s.context = ctx || 'global'; return this; }
  setChordTimeout(ms){ const s = __ensure(this); s.chordTimeout = Math.max(150, Number(ms)||750); return this; }
  onChord(seq, handler, { prevent=true } = {}){
    const s = __ensure(this);
    if (!Array.isArray(seq) || typeof handler !== 'function') return this;
    const key = seq.map(s=>String(s)).join(' ').toLowerCase();
    s.chordMap.set(key, { handler, prevent });
    return this;
  }
});

export default { Tshortcut };

export function installShortcut(app, opts = {}){
  const service = new Tshortcut(opts);
  if (service && service.bindDefault) service.bindDefault(app);
  if (app && app.use) app.use('shortcut', service);
  return service;
}

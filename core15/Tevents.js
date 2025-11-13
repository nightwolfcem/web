'use strict';
// Teevents.js — TEK SINIF, APPEND’SİZ, GERİYE UYUMLU

import CLASS from './CLASS.js';
import {
  isFn, isStr, isArr, isObj, isElement, isDomNode, defineHidden
} from './utils.js';
import TfunctionRegistry from './TfunctionRegistry.js';

/* -----------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------- */
const SPLIT = /[\s,]+/g;
const toList = (v)=> isArr(v) ? v : String(v||'').split(SPLIT).filter(Boolean);

function parseKey(key){
  const s = String(key||'').trim();
  if (!s) return { type:'', ns:[] };
  const parts = s.split('.');
  const type = parts.shift() || '';
  const ns = parts.filter(Boolean);
  return { type, ns };
}
function wildcardToReg(pat){
  // destek: '*', 'group:*', 'user:*', 'a*b'
  const esc = pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + esc + '$');
}
function nsMatch(listenerNs, filterNs){
  if (!filterNs || !filterNs.length) return true;
  const have = new Set(listenerNs||[]);
  for (const n of filterNs){ if (!have.has(n)) return false; }
  return true;
}
function makeEvent(target, type, detail, meta){
  const e = {
    type, target,
    timeStamp: Date.now(),
    detail, meta,
    defaultPrevented:false,
    propagationStopped:false,
    immediateStopped:false,
    preventDefault(){ this.defaultPrevented = true; },
    stopPropagation(){ this.propagationStopped = true; },
    stopImmediatePropagation(){ this.immediateStopped = true; this.propagationStopped = true; }
  };
  return e;
}
function resolveHandler(h){
  if (typeof h==='function') return h;
  if (h && typeof h==='object' && h.key){
    try { return TfunctionRegistry.resolve(h.key) || null; } catch { return null; }
  }
  return null;
}

/* -----------------------------------------------------------
 * Tevents
 * ----------------------------------------------------------- */
export const Tevents = CLASS(class Tevents {
  constructor(opts = {}){
    this.opts = Object.assign({
      maxListeners: Infinity,
      bubbleTo: null,           // üst emiter
      rememberEvents: ['ready'],
      queueOnSuspend: true
    }, opts||{});

    defineHidden(this, '_exact', new Map());   // name -> [{handler, ns[], once, prio, ctx, signal}]
    defineHidden(this, '_wild',  []);          // [{ re, pattern, handler, ns[], once, prio, ctx, signal }]
    defineHidden(this, '_any',   []);          // [{ handler, ns[], once, prio, ctx, signal }]
    defineHidden(this, '_remember', new Map());// name -> lastArgs
    defineHidden(this, '_suspended', new Set());// suspended event names
    defineHidden(this, '_queue', new Map());   // name -> [args[]]
    defineHidden(this, '_middleware', new Set());
    defineHidden(this, '_dom', new Set());     // DOM kayıtları
  }

  /* ------------ middleware ------------ */
  use(fn){ this._middleware.add(fn); return ()=> this._middleware.delete(fn); }

  /* ------------ on/off/once ------------ */
  on(keys, handler, opts = {}){
    const list = toList(keys);
    const recBase = {
      once: !!opts.once, prio: (+opts.prio)|0, ctx: opts.ctx||this,
      signal: opts.signal || null
    };
    for (const key of list){
      const { type, ns } = parseKey(key);
      if (!type) continue;
      const h = isStr(handler) ? { key: handler } : handler;

      if (type === '*' || type === 'any'){
        this._any.push({ handler: h, ns, ...recBase });
        this._any.sort((a,b)=> b.prio - a.prio);
      } else if (type.includes('*')){
        const rec = { re: wildcardToReg(type), pattern:type, handler:h, ns, ...recBase };
        this._wild.push(rec);
        this._wild.sort((a,b)=> b.prio - a.prio);
      } else {
        const arr = this._exact.get(type) || [];
        arr.push({ handler:h, ns, ...recBase });
        arr.sort((a,b)=> b.prio - a.prio);
        this._exact.set(type, arr);
        // replay remembered
        if (opts.replay===true || (this.opts.rememberEvents && this.opts.rememberEvents.includes(type))){
          if (this._remember.has(type)){
            const args = this._remember.get(type);
            try { const fn = resolveHandler(h); if (fn) fn.apply(recBase.ctx, args); } catch {}
          }
        }
      }

      if (recBase.signal && typeof recBase.signal.addEventListener==='function'){
        recBase.signal.addEventListener('abort', ()=> this.off(key, handler));
      }
    }
    return ()=> this.off(keys, handler);
  }
  once(keys, handler, opts={}){ return this.on(keys, handler, Object.assign({}, opts, { once:true })); }

  off(keys='*', handler=null, { ns=null } = {}){
    const list = keys==='*' ? ['*'] : toList(keys);
    const nsNeed = isArr(ns) ? ns : (ns ? String(ns).split('.').filter(Boolean) : null);

    const matchRec = (rec)=>{
      if (nsNeed && !nsMatch(rec.ns, nsNeed)) return false;
      if (!handler) return true;
      if (isStr(handler)) return (typeof rec.handler==='object' && rec.handler && rec.handler.key===handler);
      if (isFn(handler))  return (typeof rec.handler==='function' && rec.handler===handler);
      return false;
    };

    for (const key of list){
      const { type } = parseKey(key);
      if (type==='*' || type==='any'){
        this._any = this._any.filter(rec => !matchRec(rec));
        this._wild = this._wild.filter(rec => !matchRec(rec));
        for (const [name, arr] of this._exact){ this._exact.set(name, arr.filter(rec => !matchRec(rec))); }
        continue;
      }
      if (type.includes('*')){
        this._wild = this._wild.filter(rec => !(rec.pattern===type && matchRec(rec)));
        continue;
      }
      const arr = this._exact.get(type);
      if (!arr) continue;
      const kept = arr.filter(rec => !matchRec(rec));
      if (kept.length) this._exact.set(type, kept); else this._exact.delete(type);
    }
    return this;
  }

  totalListenerCount(){
    let n = this._any.length + this._wild.length;
    for (const arr of this._exact.values()) n += arr.length;
    return n;
  }

  /* ------------ emit ------------ */
  emit(type, detail=null, meta=null){
    if (!type) return 0;
    if (this._suspended.has(type)){
      if (this.opts.queueOnSuspend){
        const q = this._queue.get(type) || []; q.push([detail, meta]); this._queue.set(type, q);
      }
      return 0;
    }

    let e = makeEvent(this, type, detail, meta);

    // middleware zinciri
    for (const mw of this._middleware){
      const r = mw(e);
      if (r === false) return 0;
      if (isObj(r)) e = Object.assign(e, r);
      if (e.immediateStopped) break;
    }
    if (e.immediateStopped) return 0;

    // remember last
    this._remember.set(type, [e.detail, e.meta]);

    const callList = [];
    const pushArr = (arr)=> { for (const rec of arr) callList.push(rec); };

    // exact
    pushArr(this._exact.get(type)||[]);
    // wild
    for (const rec of this._wild){ if (rec.re.test(type)) callList.push(rec); }
    // any
    pushArr(this._any);

    // invoke by priority (already sorted)
    let called = 0;
    for (const rec of callList){
      const fn = resolveHandler(rec.handler);
      if (!fn) continue;
      try { fn.call(rec.ctx||this, e); called++; } catch (err){ try{ console.error('Tevents handler error', err); }catch{} }
      if (rec.once){
        if (rec.re){
          this._wild = this._wild.filter(r=> r!==rec);
        } else {
          const arr = this._exact.get(type) || [];
          this._exact.set(type, arr.filter(r=> r!==rec));
        }
      }
      if (e.immediateStopped) break;
    }

    // bubble
    if (!e.immediateStopped && !e.propagationStopped && this.opts.bubbleTo && isFn(this.opts.bubbleTo.emit)){
      try { this.opts.bubbleTo.emit(type, e.detail, Object.assign({ bubbled:true }, e.meta||{})); } catch {}
    }

    return called;
  }

  emitCancelable(type, detail=null, meta=null){
    const res = this.emit(type, detail, meta);
    // emit içindeki e referansı local; defaultPrevented'ı dışarı taşımıyoruz.
    // Kullanıcı cancel kontrolünü handler içinde set edip meta üzerinden takip edebilir.
    return res > 0;
  }

  emitAsync(type, detail=null, meta=null){
    return Promise.resolve().then(()=> this.emit(type, detail, meta));
  }

  /* ------------ wait / flow ------------ */
  waitOnce(type, pred=null, { timeout=null } = {}){
    return new Promise((resolve, reject)=>{
      let to=null;
      const off = this.on(type, (e)=>{
        if (isFn(pred) && pred(e) !== true) return;
        if (to) clearTimeout(to);
        off(); resolve(e);
      }, { once:true });
      if (timeout!=null){ to = setTimeout(()=>{ off(); reject(new Error('Tevents.waitOnce: timeout')); }, timeout); }
    });
  }

  suspend(type, { queue=this.opts.queueOnSuspend } = {}){
    this._suspended.add(type);
    if (!queue) this._queue.delete(type);
    return this;
  }
  resume(type){
    if (!this._suspended.has(type)) return this;
    this._suspended.delete(type);
    const q = this._queue.get(type) || [];
    this._queue.delete(type);
    for (const [d,m] of q) this.emit(type, d, m);
    return this;
  }
  clearQueue(type=null){
    if (type==null) this._queue.clear(); else this._queue.delete(type);
    return this;
  }

  /* ------------ pipe / relay ------------ */
  pipe(toEmitter, map=null){
    if (!toEmitter || !isFn(toEmitter.emit)) return ()=>{};
    const self = this;
    const mapper = isFn(map) ? map : (name,e)=> (map && map[name]) ? { name: map[name], event:e } : { name, event:e };
    const unsub = this.on('*', (e)=> {
      const m = mapper(e.type, e);
      if (!m || !m.name) return;
      toEmitter.emit(m.name, m.event.detail, Object.assign({ piped:true, from:self }, m.event.meta||{}));
    });
    return ()=> unsub();
  }
  relayFrom(source, events){
    const evs = toList(events);
    const unsubs = [];
    for (const t of evs){ unsubs.push(source.on(t, (e)=> this.emit(t, e.detail, e.meta))); }
    return ()=> { for (const u of unsubs) try{ u(); }catch{} };
  }

  /* ------------ DOM bridge ------------ */
  onDOM(el, type, handler, opts){
    if (!el || !el.addEventListener) return ()=>{};
    const fn = (ev)=> handler?.call(this, ev, el);
    el.addEventListener(type, fn, opts||false);
    const rec = { el, type, fn, opts: opts||false };
    this._dom.add(rec);
    return ()=> this.offDOM(rec);
  }
  offDOM(recOrEl, type=null){
    if (!this._dom.size) return this;
    for (const rec of Array.from(this._dom)){
      if (recOrEl && recOrEl!==rec && rec.el!==recOrEl) continue;
      if (type && rec.type!==type) continue;
      try{ rec.el.removeEventListener(rec.type, rec.fn, rec.opts); }catch{}
      this._dom.delete(rec);
    }
    return this;
  }
  bindDOM(el, spec={}, opts={}){
    const unsubs = [];
    for (const [domType, mapped] of Object.entries(spec||{})){
      if (isFn(mapped)){
        unsubs.push(this.onDOM(el, domType, mapped, opts));
      } else if (isStr(mapped)){
        unsubs.push(this.onDOM(el, domType, (ev)=> this.emit(mapped, { originalEvent:true, ev }, { dom:true, domEvent:domType, el }), opts));
      } else {
        unsubs.push(this.onDOM(el, domType, (ev)=> this.emit(domType, { originalEvent:true, ev }, { dom:true, domEvent:domType, el }), opts));
      }
    }
    return ()=> { for (const u of unsubs) try{ u(); }catch{} };
  }
  delegate(el, selector, types, handler, opts){
    const unsubs = [];
    for (const t of toList(types)){
      const fn = (ev)=>{
        const root = ev.currentTarget || el;
        const n = ev.target && ev.target.closest ? ev.target.closest(selector) : null;
        if (!n || !root.contains(n)) return;
        handler.call(n, ev);
      };
      unsubs.push(this.onDOM(el, t, fn, opts));
    }
    return ()=> { for (const u of unsubs) try{ u(); }catch{} };
  }

  /* ------------ serialization ------------ */
  toMinJSON(){
    return { $type: 'Tevents', id:this.id, opts: { bubbleTo: !!this.opts.bubbleTo, rememberEvents: this.opts.rememberEvents||[] } };
  }
  static __ctorArgsOf(inst){ return [ { id: inst?.id, opts: inst?.opts } ]; }

  /* ------------ Entegre yardımcılar (append’siz) ------------ */
  static eventSnapshot(el, { includeOptions = true } = {}){
    if (!el) return null;
    // Eğer modül dışı bir event map sunuyorsa (örn. TeventBinder.getEventMap) onu kullan:
    let map = null;
    try {
      map = (typeof globalThis.TeventBinder!=='undefined' && globalThis.TeventBinder && typeof globalThis.TeventBinder.getEventMap==='function')
        ? globalThis.TeventBinder.getEventMap(el)
        : null;
    } catch {}
    if (map && typeof map.forEach === 'function'){
      const out = {};
      map.forEach((list, type) => {
        const arr = [];
        for (const rec of list){
          let id = rec.id;
          if (!id){
            const name = rec.fn && rec.fn.name ? rec.fn.name : 'anon';
            id = TfunctionRegistry.register('app', name, rec.fn);
          }
          const item = { id };
          if (includeOptions && rec.options) item.o = rec.options;
          arr.push(item);
        }
        if (arr.length) out[type] = arr;
      });
      return Object.keys(out).length ? out : null;
    }
    return null;
  }

  static eventRestore(el, snapshot){
    if (!el || !snapshot) return;
    for (const type of Object.keys(snapshot)){
      const arr = snapshot[type];
      for (const rec of arr){
        const fn = TfunctionRegistry.getById(rec.id);
        if (typeof fn === 'function'){
          if (typeof globalThis.TeventBinder !== 'undefined' && globalThis.TeventBinder && typeof globalThis.TeventBinder.bind === 'function'){
            globalThis.TeventBinder.bind(el, type, fn, rec.o);
          } else {
            el.addEventListener(type, fn, rec.o);
          }
        }
      }
    }
  }

  static bindWithId(el, type, ns, name, fn, options){
    const id = TfunctionRegistry.register(ns||'app', name||fn?.name||'fn', fn);
    let unbind;
    if (typeof globalThis.TeventBinder !== 'undefined' && globalThis.TeventBinder && typeof globalThis.TeventBinder.bind === 'function'){
      unbind = globalThis.TeventBinder.bind(el, type, fn, options);
    } else {
      el.addEventListener(type, fn, options);
      unbind = ()=> el.removeEventListener(type, fn, options);
    }
    return { id, off: unbind };
  }
});

export default Tevents;

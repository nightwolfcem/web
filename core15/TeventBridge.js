'use strict';
// TeventBridge.js — Cem-spec unified (integrated, syntax-safe)
// Deklaratif/event-köprü: bind, rebind, update, delegate + snapshot/restore + fn registry köprüsü.
// APPEND fonksiyonları SINIF içine entegre edildi: toId, fromId, getEventMap, snapshot, restore, bindWithId.

import CLASS from './CLASS.js'
import { isFn, isStr, isObj } from './utils.js';

/* ===================== yardımcılar ===================== */
const IS_DOC = (typeof document !== 'undefined');
const toArr  = (x)=> Array.isArray(x) ? x : (x==null ? [] : [x]);
const now    = ()=> (globalThis.performance?.now?.() || Date.now());

function safeClosest(el, sel){
  if (!el || !sel) return null;
  try { return el.closest(sel); } catch { return null; }
}
function qOne(base, sel){
  try { return base.querySelector(sel); } catch { return null; }
}
function throttleWrap(fn, ms){
  if (!ms || ms<=0) return fn;
  let last = 0, lastRet;
  return function(...args){
    const t = now();
    if (t - last >= ms){ last = t; lastRet = fn.apply(this, args); }
    return lastRet;
  };
}
function debounceWrap(fn, ms){
  if (!ms || ms<=0) return fn;
  let to = null;
  return function(...args){
    if (to) clearTimeout(to);
    to = setTimeout(()=> fn.apply(this, args), ms);
  };
}
function normalizeOptions(opt, policy, type){
  const p = policy?.[type] || {};
  const o = Object.assign({}, p, opt || {});
  if (o.passive == null){
    o.passive = (type === 'wheel' || type.startsWith('touch') || type.startsWith('pointer'));
  }
  if (o.capture == null) o.capture = false;
  if (o.once == null)    o.once = false;
  return o;
}
function makeKey(type, targetDesc, handlerId, options){
  const opts = options ? JSON.stringify({once:!!options.once,capture:!!options.capture,passive:!!options.passive}) : '';
  return `${type}|${targetDesc}|${handlerId||'__fn__'}|${opts}`;
}
function describeTarget(target){
  if (!target) return '@self';
  if (isStr(target)) return target;
  if (target && target.query){ return `${target.mode||'one'}@${target.in||'self'}:${target.query}`; }
  return 'custom';
}

/* ===================== dahili fn-registry (fallback) ===================== */
const __fnIdMap = new WeakMap();   // fn -> id
const __idFnMap = new Map();       // id -> fn
let __seq = 1;
function __pref(ns){ ns=String(ns||'events').trim(); return ns||'events'; }
function __mkId(ns, name){
  const n = (__seq++);
  const nm = (name && String(name).trim()) || 'event';
  return `${__pref(ns)}:${nm}#${n}`;
}
function __globalReg(){
  try { return (typeof globalThis!=='undefined' && globalThis.TfunctionRegistry) ? globalThis.TfunctionRegistry : null; }
  catch { return null; }
}

/* ===================== çekirdek köprü ===================== */
export const TeventBridge = CLASS(class TeventBridge {
  /**
   * @param {{ resolveFn?:(id:string)=>Promise<Function>, defaultTarget?:string,
   *           passivePolicy?:Record<string,Partial<AddEventListenerOptions>>, allowEvents?:Set<string>|string[],
   *           blockEvents?:Set<string>|string[], evalFilters?:boolean, root?:Element|Document,
   *           log?:(...a:any[])=>void, ctxProvider?:()=>any }} opts
   */
  constructor({ resolveFn=null, defaultTarget='@self', passivePolicy=null, allowEvents=null, blockEvents=null, evalFilters=false, root=null, log=null, ctxProvider=null } = {}){
    this.resolveFn = resolveFn;
    this.defaultTarget = defaultTarget;
    this.passivePolicy = passivePolicy || Object.create(null);
    this.allowEvents = allowEvents ? new Set(Array.isArray(allowEvents)?allowEvents:allowEvents) : null;
    this.blockEvents = blockEvents ? new Set(Array.isArray(blockEvents)?blockEvents:blockEvents) : null;
    this.evalFilters = !!evalFilters;
    this.root  = root || (IS_DOC ? document : null);
    this.log   = isFn(log) ? log : null;
    this._ctxProvider = isFn(ctxProvider) ? ctxProvider : null;

    /** @type {Map<any, Map<string,{ el:EventTarget, type:string, wrapped:Function, original:any, options:any, spec:any }>>} */
    this.bindings = new Map();

    /** handler cache & resolve dedup */
    this._fnCache = new Map();   // id -> fn
    this._pending = new Map();   // id -> Promise<fn>
    this._fnProvider = null;     // .get(id) / .getSync?(id)

    // instance set (snapshot desteği)
    TeventBridge.__instances.add(this);
  }

  destroy(){ try{ TeventBridge.__instances.delete(this); }catch{} }

  /* ---------- provider/ctx/policy ---------- */
  setFunctionProvider(provider){ this._fnProvider = provider || null; return this; }
  setContextProvider(fn){ this._ctxProvider = isFn(fn) ? fn : null; return this; }
  setPassivePolicy(map){ this.passivePolicy = map || Object.create(null); return this; }
  setAllow(list){ this.allowEvents = list ? new Set(list) : null; return this; }
  setBlock(list){ this.blockEvents = list ? new Set(list) : null; return this; }
  setRoot(root){ this.root = root || this.root; return this; }

  /* ---------- ana API ---------- */
  bind(node, specs, { root=null, ctx=null } = {}){
    const list = toArr(specs);
    if (!node || list.length===0) return ()=>{};
    const store = this._ensureNodeStore(node);
    const baseRoot = root || this.root || (IS_DOC ? document : null);

    const unbinders = [];
    for (const spec of list){
      if (!spec || !spec.type) continue;
      const type = String(spec.type);
      if (this.blockEvents && this.blockEvents.has(type)) continue;
      if (this.allowEvents && !this.allowEvents.has(type)) continue;

      const targetDesc = describeTarget(spec.target || this.defaultTarget);
      const key = makeKey(type, targetDesc, (isStr(spec.handler)? spec.handler : spec.handler?.id), spec.options);
      if (store.has(key)){ unbinders.push(()=> this._unbindKey(node, key)); continue; }

      const el = this._resolveTarget(node, spec.target || this.defaultTarget, baseRoot);
      if (!el || !el.addEventListener){ this._log('skip(bind): target null', spec); continue; }

      const wrapped = this._makeWrappedHandler(node, el, spec, ctx);
      const options = normalizeOptions(spec.options, this.passivePolicy, type);

      el.addEventListener(type, wrapped, options);
      store.set(key, { el, type, wrapped, original: spec.handler, options, spec });
      unbinders.push(()=> this._unbindKey(node, key));
    }
    return ()=> { for (const u of unbinders) try{ u(); }catch{} };
  }

  rebind(node, specs, opt){ this.unbind(node); return this.bind(node, specs, opt); }

  async update(node, nextSpecs, opt){
    const list = toArr(nextSpecs);
    const baseRoot = (opt && opt.root) || this.root || (IS_DOC ? document : null);
    const store = this.bindings.get(node);
    const nextKeys = new Set(list.map(s => makeKey(String(s.type), describeTarget(s.target || this.defaultTarget), (isStr(s.handler)? s.handler : s.handler?.id), s.options)));

    // remove
    if (store){
      for (const [k, rec] of Array.from(store.entries())){
        if (!nextKeys.has(k)){
          try { rec.el.removeEventListener(rec.type, rec.wrapped, rec.options); } catch {}
          store.delete(k);
        }
      }
      if (store.size===0) this.bindings.delete(node);
    }

    // add
    for (const spec of list){
      const type = String(spec.type);
      if (this.blockEvents && this.blockEvents.has(type)) continue;
      if (this.allowEvents && !this.allowEvents.has(type)) continue;

      const key = makeKey(type, describeTarget(spec.target || this.defaultTarget), (isStr(spec.handler)? spec.handler : spec.handler?.id), spec.options);
      if (store && store.has(key)) continue;

      const el = this._resolveTarget(node, spec.target || this.defaultTarget, baseRoot);
      if (!el || !el.addEventListener) continue;

      const wrapped = this._makeWrappedHandler(node, el, spec, opt?.ctx);
      const options = normalizeOptions(spec.options, this.passivePolicy, type);
      el.addEventListener(type, wrapped, options);
      this._ensureNodeStore(node).set(key, { el, type, wrapped, original: spec.handler, options, spec });
    }
  }

  unbind(node, filter=null){
    const store = this.bindings.get(node);
    if (!store) return;
    for (const [key, rec] of Array.from(store.entries())){
      if (filter && !key.startsWith(filter)) continue;
      try { rec.el.removeEventListener(rec.type, rec.wrapped, rec.options); } catch {}
      store.delete(key);
    }
    if (store.size===0) this.bindings.delete(node);
  }

  async bindTree(nodes, ctx){
    const list = toArr(nodes);
    for (const n of list){
      if (!n) continue;
      if (Array.isArray(n.events) && n.events.length) this.bind(n, n.events, { ctx });
      if (Array.isArray(n.children) && n.children.length) await this.bindTree(n.children, ctx);
    }
  }

  async rebindAll(){
    const pairs = Array.from(this.bindings.entries());
    for (const [node, store] of pairs){
      const specs = Array.from(store.values()).map(rec => rec.spec);
      this.unbind(node);
      this.bind(node, specs);
    }
  }

  async delegate(rootEl, type, selector, handler, options={}, ctx){
    if (!IS_DOC || !rootEl || !rootEl.addEventListener) return null;
    if (this.blockEvents && this.blockEvents.has(type)) return null;
    if (this.allowEvents && !this.allowEvents.has(type)) return null;

    const fn = await this._resolveHandler(handler);
    if (!isFn(fn)) throw new Error(`TeventBridge.delegate: handler çözümlenemedi → ${handler}`);

    const wrappedBase = async (evt)=>{
      const match = safeClosest(evt.target, selector);
      if (!match) return;
      const args = [evt, (this._ctxProvider ? this._ctxProvider() : ctx), { root: rootEl, selector, match }];
      return fn.apply(match, args);
    };
    let wrapped = wrappedBase;
    const t = Number(options.throttle||0), d = Number(options.debounce||0);
    if (t>0) wrapped = throttleWrap(wrapped, t);
    if (d>0) wrapped = debounceWrap(wrapped, d);

    const opts = normalizeOptions(options, this.passivePolicy, type);
    rootEl.addEventListener(type, wrapped, opts);
    return ()=> { try { rootEl.removeEventListener(type, wrapped, opts); } catch {} };
  }

  /* ---------- Dahili ---------- */
  _ensureNodeStore(node){
    let m = this.bindings.get(node);
    if (!m){ m = new Map(); this.bindings.set(node, m); }
    return m;
  }
  _unbindKey(node, key){
    const store = this.bindings.get(node);
    if (!store) return;
    const rec = store.get(key);
    if (!rec) return;
    try { rec.el.removeEventListener(rec.type, rec.wrapped, rec.options); } catch {}
    store.delete(key);
    if (store.size===0) this.bindings.delete(node);
  }

  _resolveTarget(node, target, baseRoot){
    const el = node?.$el || node?.el || node || null;
    const root = baseRoot || this.root || (IS_DOC ? document : null);
    if (isStr(target)){
      if (target === '@self') return el;
      if (target === '@root') return root;
      if (target === 'window') return window;
      if (target === 'document') return (root?.ownerDocument || document);
      if (target.startsWith('#')) return (root?.getElementById ? root.getElementById(target.slice(1)) : document.getElementById(target.slice(1)));
      if (target.startsWith('closest:')) return safeClosest(el, target.slice('closest:'.length));
      if (target.startsWith('delegate:')) return el || root;
      if (target.startsWith('.') || target.startsWith('[') || target.startsWith(':')) return el ? qOne(el, target) : (root?.querySelector ? qOne(root, target) : null);
      return el;
    } else if (target && typeof target==='object'){
      const scope = target.in || 'self';
      const base = scope==='self' ? (el || root) : scope==='root' ? root : document;
      if (!base) return null;
      if (target.mode === 'all') return base; // wrapper içinde delegation ile çözülecek
      if (target.mode === 'closest') return safeClosest(el, target.query);
      try { return base.querySelector(target.query); } catch { return null; }
    }
    return el;
  }

  _evalWhen(expr, ctx, ev, el){
    if (!expr) return true;
    if (isFn(expr)) { try { return !!expr(ctx, ev, el); } catch { return false; } }
    if (!this.evalFilters) return true;
    try {
      // eslint-disable-next-line no-new-func
      const test = Function('ctx','event','el', `try{return !!(${expr})}catch(e){return false}`);
      return !!test(ctx, ev, el);
    } catch { return false; }
  }

  _makeWrappedHandler(node, baseEl, spec, ctx){
    const self = this;
    const target = spec.target || this.defaultTarget;
    const when = spec.when;
    const throttle = Number(spec.throttle||0);
    const debounce = Number(spec.debounce||0);
    const preventDefault = !!spec.preventDefault;
    const stopPropagation = !!spec.stopPropagation;
    const stopImmediate = !!spec.stopImmediate;

    const isDelegate = (isStr(target) && target.startsWith('delegate:')) || (spec.target && spec.target.mode==='all');
    const delegateSel = isStr(target) && target.startsWith('delegate:') ? target.slice('delegate:'.length) : (spec.target && spec.target.query || null);

    const baseCall = async (ev)=>{
      let matched = null;
      if (isDelegate && delegateSel){
        matched = safeClosest(ev.target, delegateSel);
        if (!matched) return;
      }
      const useCtx = (self._ctxProvider ? self._ctxProvider() : ctx);
      const el = matched || baseEl;
      if (!self._evalWhen(when, useCtx, ev, el)) return;

      if (preventDefault) try{ ev.preventDefault(); }catch{}
      if (stopImmediate) try{ ev.stopImmediatePropagation(); }catch{}
      if (stopPropagation) try{ ev.stopPropagation(); }catch{}

      const fn = await self._resolveHandler(spec.handler);
      if (!isFn(fn)) return;

      let args;
      if (isFn(spec.map)) args = spec.map(ev, useCtx, node, el);
      if (!Array.isArray(args)) args = [ev, useCtx, node, el];
      try { return await fn(...args); } catch {}
    };

    let wrapped = baseCall;
    if (throttle>0) wrapped = throttleWrap(wrapped, throttle);
    if (debounce>0) wrapped = debounceWrap(wrapped, debounce);
    return wrapped;
  }

  async _resolveHandler(h){
    if (isFn(h)) return h;
    const id = isStr(h) ? h : (h && h.id ? h.id : null);
    if (!id) return null;

    if (this._fnCache.has(id)) return this._fnCache.get(id);
    if (this._pending.has(id)) return this._pending.get(id);

    const p = (async ()=>{
      let fn = null;
      const G = __globalReg();
      if (!fn && G && isFn(G.getById)) { try { fn = await G.getById(id); } catch {} }
      if (!fn && this._fnProvider && isFn(this._fnProvider.get)){ try { fn = await this._fnProvider.get(id); } catch {} }
      if (!fn && isFn(this.resolveFn)){ try { fn = await this.resolveFn(id); } catch {} }
      if (!isFn(fn)) fn = __idFnMap.get(id) || null;

      if (isFn(fn)) this._fnCache.set(id, fn);
      this._pending.delete(id);
      return fn;
    })();

    this._pending.set(id, p);
    return p;
  }

  _log(...a){ if (this.log) try{ this.log(...a); }catch{} }

  /* ===================== APPEND entegre: static API ===================== */

  /** fn -> id (TfunctionRegistry varsa onu kullanır; yoksa dahili map) */
  static toId(fn, ns='events', name='event'){
    if (!isFn(fn)) return null;
    try {
      const G = __globalReg();
      if (G && isFn(G.register)) return G.register(__pref(ns), name || fn.name || 'event', fn);
    } catch {}
    let id = __fnIdMap.get(fn);
    if (!id){ id = __mkId(ns, name||fn.name); __fnIdMap.set(fn, id); __idFnMap.set(id, fn); }
    return id;
  }
  /** id -> fn (TfunctionRegistry varsa oradan çözer; yoksa dahili map) */
  static fromId(id){
    try {
      const G = __globalReg();
      if (G && isFn(G.getById)) return G.getById(id);
    } catch {}
    return __idFnMap.get(id);
  }

  /** Seçilen element için Map(type -> Array<{id,o,fn}>) */
  static getEventMap(el){
    const map = new Map();
    for (const inst of TeventBridge.__instances){
      for (const store of inst.bindings.values()){
        for (const rec of store.values()){
          if (rec.el !== el) continue;
          const arr = map.get(rec.type) || [];
          const id = (isStr(rec.original) ? rec.original : TeventBridge.toId(rec.original)) || null;
          arr.push({ id, o: rec.options, fn: rec.original });
          map.set(rec.type, arr);
        }
      }
    }
    return map;
  }

  /** Snapshot (opsiyonel includeOptions) */
  static snapshot(el, { includeOptions = true } = {}){
    const map = TeventBridge.getEventMap(el);
    if (!map || map.size===0) return null;
    const out = {};
    map.forEach((arr, type)=>{
      const list = [];
      for (const rec of arr){
        if (!rec.id) continue;
        const item = { id: rec.id };
        if (includeOptions && rec.o) item.o = rec.o;
        list.push(item);
      }
      if (list.length) out[type] = list;
    });
    return Object.keys(out).length ? out : null;
  }

  /** Restore (TeventBinder varsa onu kullanır) */
  static restore(el, snap){
    if (!el || !snap) return;
    for (const type of Object.keys(snap)){
      const arr = snap[type] || [];
      for (const rec of arr){
        const fn = (rec && rec.id) ? TeventBridge.fromId(rec.id) : null;
        if (typeof fn === 'function'){
          try {
            if (typeof TeventBinder !== 'undefined' && TeventBinder && typeof TeventBinder.bind === 'function'){
              TeventBinder.bind(el, type, fn, rec.o);
            } else {
              el.addEventListener(type, fn, rec.o);
            }
          } catch {}
        }
      }
    }
  }

  /** Bind + id döndür (registry ile) */
  static bindWithId(el, type, ns, name, fn, options){
    const id = TeventBridge.toId(fn, ns, name);
    try {
      if (typeof TeventBinder !== 'undefined' && TeventBinder && typeof TeventBinder.bind === 'function'){
        TeventBinder.bind(el, type, fn, options);
      } else {
        el.addEventListener(type, fn, options);
      }
    } catch {}
    return { id };
  }
});
TeventBridge.__instances = TeventBridge.__instances || new Set();

/* ===================== CLASS plugin ===================== */
export function installTo(CLASS, opts={}){
  const fnProvider = CLASS?.getPluginProvider?.('fn') || null;
  const inst = new TeventBridge({ ...(opts||{}) });
  if (fnProvider) inst.setFunctionProvider(fnProvider);
  if (opts?.ctxProvider) inst.setContextProvider(opts.ctxProvider);

  const api = {
    bind: (node, specs, ctx)=> inst.bind(node, specs, ctx),
    bindOne: (node, spec, ctx)=> inst.bind(node, spec?[spec]:[], ctx),
    update: (node, specs, ctx)=> inst.update(node, specs, ctx),
    rebind: (node, specs, ctx)=> inst.rebind(node, specs, ctx),
    unbind: (node, filter)=> inst.unbind(node, filter),
    bindTree: (nodes, ctx)=> inst.bindTree(nodes, ctx),
    rebindAll: ()=> inst.rebindAll(),

    delegate: (rootEl, type, selector, handler, options, ctx)=> inst.delegate(rootEl, type, selector, handler, options, ctx),

    setFunctionProvider: (p)=> inst.setFunctionProvider(p),
    setContextProvider: (p)=> inst.setContextProvider(p),
    setPassivePolicy: (m)=> inst.setPassivePolicy(m),
    setAllow: (l)=> inst.setAllow(l),
    setBlock: (l)=> inst.setBlock(l),
    setRoot: (el)=> inst.setRoot(el),

    instance: inst
  };

  CLASS?.use?.('events', api);
  return api;
}

/* ===================== Serializer hook entegrasyonu ===================== */
try{
  if (typeof Tserializer !== 'undefined' && Tserializer){
    Tserializer.hooks = Tserializer.hooks || {};
    const H = (Tserializer.hooks.events = Tserializer.hooks.events || {});
    if (!H.snapshot) H.snapshot = (el)=>TeventBridge.snapshot(el);
    if (!H.restore)  H.restore  = (el, snap)=>TeventBridge.restore(el, snap);
  }
}catch{}

export function getEventMap(el){ return TeventBridge.getEventMap(el); }

export default { TeventBridge, installTo, getEventMap };


/* P2: unbindWithId fallback (additive, backward compatible) */
export function unbindWithId(el, type, ns, name, fn, opts){
  try {
    if (el && el.removeEventListener) el.removeEventListener(type, fn, opts);
  } catch {}
  return true;
}


'use strict';
// utils.js — full pack: helpers, deepCopy (owner/enum/ord aware), DOM adopt,
// event snapshot/restore, forEach*, deepMerge, timing, and legacy aliases.

/* ------------------------------------------------------------------ */
/* Event bridge (optional integration)                                */
/* ------------------------------------------------------------------ */
import {
  getEventMap,
  getFnById,
  patchEventTargetPrototypes
} from './eventHandling.js';

try {
  if (typeof patchEventTargetPrototypes === 'function') patchEventTargetPrototypes();
} catch {}

/* ------------------------------------------------------------------ */
/* Tiny helpers                                                        */
/* ------------------------------------------------------------------ */
export const isArr  = Array.isArray;
export const isFn   = (v) => typeof v === 'function';
export const isStr  = (v) => typeof v === 'string';
export const isNum  = (v) => typeof v === 'number' && Number.isFinite(v);
export const isBool = (v) => v === true || v === false;
export const isObj  = (v) => v !== null && typeof v === 'object';
export const isPlainObj = (v) => isObj(v) && (Object.getPrototypeOf(v) === Object.prototype);

export const isDomNode   = (v)=> (typeof Node    !== 'undefined') && v instanceof Node;
export const isElement   = (v)=> (typeof Element !== 'undefined') && v instanceof Element;
export const isEventLike = (v)=> (typeof Event   !== 'undefined') && v instanceof Event;

/* math */
export const clamp = (v, lo, hi)=> Math.max(lo, Math.min(hi, v));
export const lerp  = (a,b,t)=> a + (b-a)*t;
export const round = (v, p=0)=> (p ? Math.round(v*10**p)/10**p : Math.round(v));
export const ceil  = (v, p=0)=> (p ? Math.ceil (v*10**p)/10**p : Math.ceil(v));
export const floor = (v, p=0)=> (p ? Math.floor(v*10**p)/10**p : Math.floor(v));

/* strings / ids */
export function pad(str, len, ch = '0'){
  str = String(str); while (str.length < len) str = ch + str; return str;
}
let __uid_seq = 0;
export function uid(ns = ''){
  __uid_seq += 1; return ns ? `${ns}_${__uid_seq}` : `id_${__uid_seq}`;
}
export const nextId = (ns='n') => uid(ns);

/* props */
export function defineHidden(obj, key, val){
  Object.defineProperty(obj, key, { value: val, enumerable: false, writable: true, configurable: true });
  return obj;
}
export function ensureObj(v, name = 'value'){
  if (!isObj(v)) throw new TypeError(`${name} must be an object`);
  return v;
}
export const ensureArr = (v) => (isArr(v) ? v : (v == null ? [] : [v]));
export function getElement(target, doc){
  // Hiçbir şey yoksa
  if (target == null) return null;

  // Document objesini belirle
  const D = doc || (typeof document !== 'undefined' ? document : null);

  // 1) Telement/Troot/benzeri: el/host taşıyan nesne
  if (target && typeof target === 'object'){
    // Telement gibi: { el, host }
    if (target.el && target.el.nodeType === 1) return target.el;
    if (target.host && target.host.nodeType === 1) return target.host;

    // Direkt DOM element
    if (target.nodeType === 1) return target;

    // NodeList / HTMLCollection / Array vari: ilk elemana bak
    if (typeof target.length === 'number' && target.length > 0){
      const first = target[0];
      if (first && first.nodeType === 1) return first;
    }

    // Config obje pattern'i: { root: ... }
    if (!target.nodeType && target.root){
      return getElement(target.root, D);
    }
  }

  // 2) String: selector / id
  if (typeof target === 'string' && D){
    const s = target.trim();
    if (!s) return null;

    // "#id" ise hızlı yol
    if (s[0] === '#' && s.indexOf(' ') === -1 && !s.includes('.')
        && !s.includes('[') && !s.includes(':')){
      const byId = D.getElementById(s.slice(1));
      if (byId) return byId;
    }

    // Normal selector
    try{
      const found = D.querySelector(s);
      if (found) return found;
    }catch(e){
      // QuerySelector patlarsa, hiç değilse id dene
      const byId = D.getElementById(s.replace(/^#/,''));
      if (byId) return byId;
    }
  }

  // 3) Hiçbirine uymuyorsa
  return null;
}
/* object helpers */
export function pick(obj, ks){ const out={}; for (const k of ks) if (k in obj) out[k]=obj[k]; return out; }
export function omit(obj, ks){ const out={}; for (const k of Object.keys(obj)) if (!ks.includes(k)) out[k]=obj[k]; return out; }
export const entries = (obj) => Object.entries(obj);
export const values  = (obj) => Object.values(obj);
export const keys    = (obj) => Object.keys(obj);

export function mapObj(obj, fn){ const out={}; for (const [k,v] of Object.entries(obj)) out[k]=fn(v,k); return out; }

// Universal forEach with early-exit (return false to break)
export function forEachObj(obj, fn, thisArg){
  if (obj == null) return;
  if (obj instanceof Map){
    for (const [k, v] of obj){ if (fn.call(thisArg, v, k, obj) === false) return; } return;
  }
  if (obj instanceof Set){
    for (const v of obj){ if (fn.call(thisArg, v, v, obj) === false) return; } return;
  }
  if (Array.isArray(obj)){
    for (let i=0;i<obj.length;i++){ if (fn.call(thisArg, obj[i], i, obj) === false) return; } return;
  }
  for (const k of Object.keys(obj)){ if (fn.call(thisArg, obj[k], k, obj) === false) return; }
}
export function forEachOwn(obj, fn, thisArg){
  if (obj == null) return;
  const k1 = Object.keys(obj);
  const k2 = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(obj).filter(s => {
    const d = Object.getOwnPropertyDescriptor(obj, s); return !!(d && d.enumerable);
  }) : [];
  for (const k of [...k1, ...k2]){ if (fn.call(thisArg, obj[k], k, obj) === false) return; }
}
export function forEachKV(obj, fn, thisArg){ return forEachObj(obj, (v,k,o)=> fn.call(thisArg, k,v,o), thisArg); }

export function groupBy(a, keyFn){ const m=new Map(); for (const x of a){ const k=keyFn(x); (m.get(k)||m.set(k,[]).get(k)).push(x); } return m; }
export function keyBy(a, keyFn){ const m=new Map(); for (const x of a) m.set(keyFn(x), x); return m; }

export function equalShallow(a,b){
  if (a===b) return true;
  if (!isPlainObj(a) || !isPlainObj(b)) return false;
  const ak=Object.keys(a), bk=Object.keys(b);
  if (ak.length!==bk.length) return false;
  for (const k of ak) if (a[k]!==b[k]) return false;
  return true;
}
export function equalDeep(a,b, seen=new WeakMap()){
  if (a===b) return true;
  if (a && b && typeof a==='object' && typeof b==='object'){
    if (seen.get(a)===b) return true; seen.set(a,b);
    if (isArr(a)){ if(!isArr(b)||a.length!==b.length) return false; for(let i=0;i<a.length;i++) if(!equalDeep(a[i],b[i],seen)) return false; return true; }
    const ak=Object.keys(a), bk=Object.keys(b); if (ak.length!==bk.length) return false;
    for (const k of ak){ if(!equalDeep(a[k],b[k],seen)) return false; }
    return true;
  }
  return Object.is(a,b);
}
export function mergeDeep(target, ...sources){
  for (const src of sources){
    if (!isObj(src)) continue;
    for (const [k,v] of Object.entries(src)){
      if (isPlainObj(v)){ if (!isPlainObj(target[k])) target[k]={}; mergeDeep(target[k], v); }
      else if (isArr(v)){ target[k]=v.map(x=> (isObj(x)? mergeDeep(isArr(x)?[]:{} , x) : x)); }
      else target[k]=v;
    }
  }
  return target;
}
export const merge = mergeDeep;
export function assignIfDefined(target, obj){
  for (const [k,v] of Object.entries(obj||{})) if (v!==undefined) target[k]=v;
  return target;
}

/* DOM helpers + legacy */
export const _num = (v)=> (v==null?0: (typeof v==='number'?v: parseFloat(String(v))||0));
export const _px  = (v)=> (v==null? '0px' : (Math.round(Number(v))+'px'));
export function getRect(el){
  const r = el?.getBoundingClientRect?.(); if (!r) return { left:0, top:0, width:0, height:0, right:0, bottom:0 };
  return { left:r.left, top:r.top, width:r.width, height:r.height, right:r.right, bottom:r.bottom };
}
export function withinRect(x,y,rect){ return x>=rect.left && y>=rect.top && x<=rect.left+rect.width && y<=rect.top+rect.height; }

/* ------------------------------------------------------------------ */
/* Skip lists                                                         */
/* ------------------------------------------------------------------ */
export const SKIP_KEYS_DEFAULT = [
  'owner','parent','host','root','layer','overlay','ctrl','pointer',
  '__owner__','__host__','__root__','__layer__','__overlay__','__ctrl__',
  'el','dom','htmlObject','classList','dataset','style',
  'events','_events','__events','listeners','emitter','_emitter',
  'id','__id__','__proto__'
];
export const SKIP_HYDRATE_DEFAULT = [
  ...SKIP_KEYS_DEFAULT,
  'childrenEls','childNodes','nodeType','tagName'
];

/* ------------------------------------------------------------------ */
/* Defaults                                                           */
/* ------------------------------------------------------------------ */
export const DeepCopyDefaults = {
  skipKeys: SKIP_KEYS_DEFAULT,

  proxyPolicy: 'serialize',          // 'serialize' | 'shallow' | 'error'

  ownerPolicy: {
    mode: 'auto',                    // clone() → ctor(...args) → toMinJSON/fromMinJSON → copy()
    sanitizeId: true,
    parent: 'auto'                   // 'auto' => source.el.parentElement
  },

  enumPolicy: 'auto',                // 'auto' | 'bind' | 'factory' | 'value' | 'proxy'
  enumValueMode: 'json',             // 'json' | 'primitive'
  enumBindTo: null,
  ordBindTo:  null,
  enumFactoryOf: null,
  ordFactoryOf:  null,
  enumBindCtx: null,
  ordBindCtx:  null,

  hydrateOwner: true,
  hydrateSkip: SKIP_HYDRATE_DEFAULT,

  equalizeDomBox: true,
  copyDomEvents: 'auto',

  eventHandling: { getEventMap, getFnById, classRegistry: null }
};

const NODE = (typeof Node !== 'undefined')
  ? Node
  : { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 };

const _raf = (cb) => (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(cb) : setTimeout(cb, 0);

/* ------------------------------------------------------------------ */
/* Internals                                                          */
/* ------------------------------------------------------------------ */
function _safeKeys(obj){ try { return Object.keys(obj); } catch { return []; } }
function _isPlain(o){
  if (o===null || typeof o!=='object') return false;
  const p = Object.getPrototypeOf(o);
  return p===Object.prototype || p===null;
}
function _inlineRectOf(el){
  const s = el?.style || {};
  const num = (v)=> parseFloat(String(v||0)) || 0;
  const has = (k)=> s && typeof s[k]==='string' && /\d/.test(s[k]);
  const op = el?.offsetParent || el?.parentElement || document.body;
  const er = el?.getBoundingClientRect ? el.getBoundingClientRect() : {left:0, top:0, width:0, height:0};
  const pr = op?.getBoundingClientRect ? op.getBoundingClientRect() : {left:0, top:0};
  return {
    L: has('left')   ? num(s.left)   : (er.left - pr.left + (op?.scrollLeft||0)),
    T: has('top')    ? num(s.top)    : (er.top  - pr.top  + (op?.scrollTop||0)),
    W: has('width')  ? num(s.width)  : er.width,
    H: has('height') ? num(s.height) : er.height
  };
}
function _applyInlineBox(el, L,T,W,H, boxSizing){
  if (!el) return;
  const st = el.style;
  if (!st.position) st.position = 'absolute';
  if (L!=null) st.left   = L + 'px';
  if (T!=null) st.top    = T + 'px';
  if (W!=null) st.width  = W + 'px';
  if (H!=null) st.height = H + 'px';
  if (boxSizing) st.boxSizing = boxSizing;
}
function _cloneDomExact(srcEl){
  const dup = srcEl.cloneNode(true);
  try { dup.style.cssText = srcEl.style.cssText; } catch {}
  return dup;
}
function _ensureRelative(el){
  if (!el) return;
  const cs = getComputedStyle(el);
  if (cs.position === 'static') el.style.position = 'relative';
}

/* enum/ord probes */
function _isEnumProxy(o){
  if (!isObj(o) || !isFn(o.toMinJSON)) return false;
  try { const j=o.toMinJSON(); return j && typeof j==='object' && ('Tenum' in j); } catch { return false; }
}
function _isOrdProxy(o){
  if (!isObj(o) || !isFn(o.toMinJSON)) return false;
  try { const j=o.toMinJSON(); return j && typeof j==='object' && ('Tord' in j); } catch { return false; }
}

/* ctor args */
function _ctorArgsOf(o){
  if (isFn(o.getCtorArgs)) { try { const a=o.getCtorArgs(); return a==null?null:(Array.isArray(a)?a:[a]); } catch {} }
  const cands = [o.ctorArgs,o._ctorArgs,o.args,o._args,o.opts,o._opts];
  for (const v of cands){ if (v!=null) return Array.isArray(v)?v:[v]; }
  try { if (isFn(o.toMinJSON)){ const j=o.toMinJSON(); if (j && j.args) return Array.isArray(j.args)?j.args:[j.args]; } } catch {}
  return null;
}

/* owner parent/placement/adopt */
function _ownerParent(opts, o){
  if (opts.ownerPolicy?.parent === 'auto') return o?.el?.parentElement || null;
  return opts.ownerPolicy?.parent || null;
}
function _placeOwner(o, L,T,W,H){
  if (!o) return;
  if (isFn(o.setRect)) { o.setRect(L,T,W,H); return; }
  if (isFn(o.setPos))  { o.setPos(L,T); }
  const el = o.el || o.htmlObject;
  if (el){
    const cs = getComputedStyle(el);
    _applyInlineBox(el, L,T,W,H, cs.boxSizing);
  }
}
function _adoptExactDom(target, source, parent){
  if (!source?.el || !target) return;
  const dup = _cloneDomExact(source.el);
  const p = parent || source.el.parentElement || target.el?.parentElement || null;

  if (target.el && target.el.parentNode){
    target.el.parentNode.replaceChild(dup, target.el);
  } else if (p){
    p.appendChild(dup);
  }

  if (isFn(target.setEl)) target.setEl(dup); else target.el = dup;
  dup.owner = target;
   try {
    // Cem-spec: Telement.id -> DOM attribute "data-id" (spesifik)
    dup.setAttribute('id',dup.owner.$class.name+"-"+dup.owner.id);
dup.setAttribute('data-id',dup.owner.$class.name+"-"+dup.owner.id);   
   /* if (target.id != null){
      dup.setAttribute('data-id', String(target.$class,name & "-" & target.id));
      if (dup.dataset) dup.dataset.id = String(target.$class,name & "-" & target.id);
    }*/
    // eski 'owner' attr'ını temizle
    if (dup.hasAttribute && dup.hasAttribute('owner')) dup.removeAttribute('owner');
    // class eşitle
    dup.className = source.el.className;
  } catch {}

  const cs = getComputedStyle(source.el);
  const srcBox = _inlineRectOf(source.el);
  _ensureRelative(dup.parentElement);
  _applyInlineBox(dup, srcBox.L, srcBox.T, srcBox.W, srcBox.H, cs.boxSizing);

  _raf(()=>{
    const rb = dup.getBoundingClientRect?.();
    if (!rb || rb.width===0 || rb.height===0){
      _applyInlineBox(dup, srcBox.L, srcBox.T, srcBox.W, srcBox.H, cs.boxSizing);
    }
  });

  return dup;
}
function _equalizeOwnerDom(opts, target, source){
  if (!source?.el || !target) return;
  const p = _ownerParent(opts, source);
  _adoptExactDom(target, source, p);
}

/* events copy / snapshot / restore */
function _copyEventsFromEventHandling(opts, src, dst){
  const EH = opts && opts.eventHandling;
  if (!EH || typeof EH.getEventMap!=='function' || typeof EH.getFnById!=='function' || !dst || !src) return false;
  const srcMap = EH.getEventMap(src);
  if (!srcMap) return false;

  for (const [type, list] of srcMap){
    for (const rec of list){
      const fn = EH.getFnById(rec.rid ?? rec.id);
      if (typeof fn === 'function'){
        try { dst.addEventListener(type, fn, rec.o || rec.options); } catch {}
      } else if (rec?.listener && typeof rec.listener === 'function'){
        try { dst.addEventListener(type, rec.listener, rec.o || rec.options); } catch {}
      }
    }
  }
  return true;
}
function _copyEventsIfAny(opts, src, dst){
  if (!dst || !src) return;

  if (_copyEventsFromEventHandling(opts, src, dst)) return;

  if (typeof opts.copyDomEvents === 'function'){ opts.copyDomEvents(src, dst); return; }
  if (opts.copyDomEvents !== 'auto') return;

  const cands = [src.__events, src._events, src.events];
  for (const cand of cands){
    if (!cand) continue;
    try {
      const entries = Array.isArray(cand) ? cand
        : (cand instanceof Map ? [...cand] : Object.entries(cand));
      for (const [type, handlers] of entries){
        const list = Array.isArray(handlers) ? handlers
          : (handlers && typeof handlers[Symbol.iterator]==='function' ? [...handlers] : [handlers]);
        for (const h of list){ if (typeof h === 'function') try { dst.addEventListener(type, h); } catch {} }
      }
      break;
    } catch {}
  }
}
export function snapshotEvents(el){
  const EH = DeepCopyDefaults.eventHandling;
  if (EH && typeof EH.getEventMap === 'function'){
    const m = EH.getEventMap(el);
    if (!m) return null;
    const snap = [];
    for (const [type, list] of m){
      for (const rec of list){
        snap.push({ type, id:(rec.rid ?? rec.id ?? null), opts: rec.o || rec.options || false });
      }
    }
    return { kind:'eventMap', data:snap };
  }
  const cands = [el?.__events, el?._events, el?.events];
  for (const cand of cands){
    if (!cand) continue;
    try {
      const out = [];
      const entries = Array.isArray(cand) ? cand
        : (cand instanceof Map ? [...cand] : Object.entries(cand));
      for (const [type, handlers] of entries){
        const list = Array.isArray(handlers) ? handlers
          : (handlers && typeof handlers[Symbol.iterator]==='function' ? [...handlers] : [handlers]);
        for (const h of list){ if (typeof h === 'function') out.push({ type, listener:h, opts:false }); }
      }
      return { kind:'rawList', data:out };
    } catch {}
  }
  return null;
}
export function restoreEvents(sourceOrSnapshot, targetEl){
  if (!targetEl) return;
  if (sourceOrSnapshot && sourceOrSnapshot.kind){
    const snap = sourceOrSnapshot;
    if (snap.kind === 'eventMap'){
      const EH = DeepCopyDefaults.eventHandling;
      if (!EH || typeof EH.getFnById!=='function') return;
      for (const rec of snap.data){
        const fn = EH.getFnById(rec.id);
        if (typeof fn === 'function') try { targetEl.addEventListener(rec.type, fn, rec.opts); } catch {}
      }
      return;
    }
    if (snap.kind === 'rawList'){
      for (const rec of snap.data){
        if (typeof rec.listener === 'function') try { targetEl.addEventListener(rec.type, rec.listener, rec.opts); } catch {}
      }
      return;
    }
    return;
  }
  const srcEl = sourceOrSnapshot;
  _copyEventsIfAny(DeepCopyDefaults, srcEl, targetEl);
}

/* hydrate */
function _hydrateOwner(target, source, opts){
  if (!opts.hydrateOwner || !target || !source) return target;

  if (isFn(target.hydrate)) { try { target.hydrate(source); } catch {} return target; }
  if (isFn(target.merge))   { try { target.merge(source);   } catch {} return target; }

  const skipSet = new Set([...(opts.hydrateSkip||[]), ...(opts.skipKeys||[])]);
  const klist = _safeKeys(source);
  for (const k of klist){
        if (_isEnumProxy(source[k]) || _isOrdProxy(source[k])) {
      const sv  = source[k];
      const base= sv && sv.$base;
      const val = (sv && typeof sv.get==='function') ? sv.get()
                : (sv && typeof sv.valueOf==='function') ? sv.valueOf()
                : (sv && sv.v!=null ? sv.v : sv);
      if (base && typeof base.bindTo === 'function'){
        base.bindTo(target, k, val);   // property accessor + instance
        continue;
      }
      target[k] = sv; // fallback: opak ata
      continue;
    }
    if (skipSet.has(k)) continue;
    if (k.startsWith('__')) continue;
    const sv = source[k];
    if (typeof sv === 'function') continue;
    if (sv && sv.nodeType) continue;
    try {
      const tv = target[k];
      if (_isPlain(tv) && _isPlain(sv))       target[k] = cloneAnyWith(sv, opts);
      else if (Array.isArray(sv))             target[k] = cloneAnyWith(sv, opts);
      else if (sv && typeof sv === 'object')  target[k] = cloneAnyWith(sv, opts);
      else                                    target[k] = sv;
    } catch {}
  }
  return target;
}

/* owner-like clone */
function _cloneOwnerLike(o, opts){
  if ((opts.ownerPolicy.mode==='auto'||opts.ownerPolicy.mode==='clone') && isFn(o.clone)){
    const n = o.clone({ parent:_ownerParent(opts, o) });
    _equalizeOwnerDom(opts, n, o);
    _hydrateOwner(n, o, opts);
    _copyEventsIfAny(opts, o?.el, n?.el);
    return n;
  }
  if (opts.ownerPolicy.mode==='auto' || opts.ownerPolicy.mode==='ctor'){
    const A = _ctorArgsOf(o);
    if (A){ try{
      const n = new o.constructor(...A);
      const p = _ownerParent(opts, o);
      if (p && n?.el && n.el.parentNode !== p) p.appendChild(n.el);
      _equalizeOwnerDom(opts, n, o);
      _hydrateOwner(n, o, opts);
      _copyEventsIfAny(opts, o?.el, n?.el);
      return n;
    }catch{} }
  }
  if ((opts.ownerPolicy.mode==='auto'||opts.ownerPolicy.mode==='minjson') && isFn(o.toMinJSON) && (typeof fromMinJSON==='function')){
    const j = o.toMinJSON();
    if (j && opts.ownerPolicy.sanitizeId){
      delete j.id; if (j.args && j.args[0]) delete j.args[0].id;
    }
    const n = fromMinJSON(j);
    const p = _ownerParent(opts, o);
    if (p && n?.el && n.el.parentNode !== p) p.appendChild(n.el);
    _equalizeOwnerDom(opts, n, o);
    _hydrateOwner(n, o, opts);
    _copyEventsIfAny(opts, o?.el, n?.el);
    return n;
  }
  if ((opts.ownerPolicy.mode==='auto'||opts.ownerPolicy.mode==='copy') && isFn(o.copy) && o.copy !== Object.prototype.copy){
    const n = o.copy({ parent:_ownerParent(opts, o) });
    _equalizeOwnerDom(opts, n, o);
    _hydrateOwner(n, o, opts);
    _copyEventsIfAny(opts, o?.el, n?.el);
    return n;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* deepCopy                                                           */
/* ------------------------------------------------------------------ */
function cloneAnyWith(obj, opts, seen = new WeakMap()){
  if (obj==null || typeof obj!=='object') return obj;
  if (seen.has(obj)) return seen.get(obj);

  // Enum/Ord
  const _cloneEnumProxy = (o)=>{
    const j = o.toMinJSON();
    if (opts.enumPolicy === 'auto' || opts.enumPolicy === 'bind'){
      if (isFn(opts.enumBindTo)){ const r=opts.enumBindTo(o, j, opts.enumBindCtx); if (r) return r; }
      if (opts.enumBindTo && isFn(opts.enumBindTo.fromMinJSON)) return opts.enumBindTo.fromMinJSON(j);
      if (isFn(o.bindTo)){ const r=o.bindTo(opts.enumBindCtx); if (r) return r; }
    }
    if (opts.enumPolicy === 'auto' || opts.enumPolicy === 'factory'){
      if (isFn(opts.enumFactoryOf)){ const E=opts.enumFactoryOf(o); if (E?.fromMinJSON) return E.fromMinJSON(j); }
    }
    if (opts.enumPolicy === 'proxy') return o;
    return (opts.enumValueMode === 'primitive') ? (Number(j.Tenum)|0) : j;
  };
  const _cloneOrdProxy = (o)=>{
    const j = o.toMinJSON();
    if (opts.enumPolicy === 'auto' || opts.enumPolicy === 'bind'){
      if (isFn(opts.ordBindTo)){ const r=opts.ordBindTo(o, j, opts.ordBindCtx); if (r) return r; }
      if (opts.ordBindTo && isFn(opts.ordBindTo.fromMinJSON)) return opts.ordBindTo.fromMinJSON(j);
      if (isFn(o.bindTo)){ const r=o.bindTo(opts.ordBindCtx); if (r) return r; }
    }
    if (opts.enumPolicy === 'auto' || opts.enumPolicy === 'factory'){
      if (isFn(opts.ordFactoryOf)){ const O=opts.ordFactoryOf(o); if (O?.fromMinJSON) return O.fromMinJSON(j); }
    }
    if (opts.enumPolicy === 'proxy') return o;
    return (opts.enumValueMode === 'primitive') ? (Number(j.Tord)|0) : j;
  };

  // DOM
  if ('nodeType' in obj && obj.nodeType){
    let out;
    switch (obj.nodeType){
      case NODE.TEXT_NODE:    out = document.createTextNode(obj.nodeValue ?? ''); break;
      case NODE.COMMENT_NODE: out = document.createComment(obj.nodeValue ?? '');  break;
      case NODE.ELEMENT_NODE: out = _cloneDomExact(obj);                           break;
      default:                out = obj.cloneNode ? obj.cloneNode(true) : obj;
    }
    seen.set(obj, out);
    if (obj.nodeType === NODE.ELEMENT_NODE){
      if (opts.equalizeDomBox){
        const srcBox = _inlineRectOf(obj);
        const parent = out.parentElement || obj.parentElement;
        const cs = getComputedStyle(obj);
        _ensureRelative(parent);
        _applyInlineBox(out, srcBox.L, srcBox.T, srcBox.W, srcBox.H, cs.boxSizing);
      }
    }
    return out;
  }

  // Built-ins
  if (obj instanceof Date){ const out=new Date(obj.getTime()); seen.set(obj,out); return out; }
  if (obj instanceof RegExp){ const out=new RegExp(obj.source,obj.flags); seen.set(obj,out); return out; }
  if (obj instanceof Map){ const out=new Map(); seen.set(obj,out); for (const [k,v] of obj) out.set(cloneAnyWith(k,opts,seen),cloneAnyWith(v,opts,seen)); return out; }
  if (obj instanceof Set){ const out=new Set(); seen.set(obj,out); for (const v of obj) out.add(cloneAnyWith(v,opts,seen)); return out; }
  if (typeof ArrayBuffer!=='undefined' && ArrayBuffer.isView(obj)){ const out=new obj.constructor(obj); seen.set(obj,out); return out; }
  if (typeof ArrayBuffer!=='undefined' && obj instanceof ArrayBuffer){ const out=obj.slice(0); seen.set(obj,out); return out; }
  if (Array.isArray(obj)){ const out=[]; seen.set(obj,out); for (let i=0;i<obj.length;i++) out[i]=cloneAnyWith(obj[i],opts,seen); return out; }

  // Enum/Ord proxies
  if (_isEnumProxy(obj)) return _cloneEnumProxy(obj);
  if (_isOrdProxy(obj))  return _cloneOrdProxy(obj);

  // Owner-like
  if (isObj(obj) && (isFn(obj.clone) || isFn(obj.copy) || isFn(obj.toMinJSON))){
    const placeholder = {}; seen.set(obj, placeholder);
    const out = _cloneOwnerLike(obj, opts);
    if (!out){
      if (opts.proxyPolicy==='shallow') return obj;
      if (opts.proxyPolicy==='error')   throw new TypeError('deepCopy: owner clone failed');
    }
    seen.set(obj, out);
    return out;
  }

  // Generic object (proxy-safe)
  let out; const Ctor = (isFn(obj.constructor) ? obj.constructor : Object);
  try { out = new Ctor(); } catch { out = Object.create(Object.getPrototypeOf(obj) || Object.prototype); }
  seen.set(obj, out);

  let klist;
  try { klist = Object.keys(obj); }
  catch (err){
    if (opts.proxyPolicy==='serialize' && isFn(obj.toMinJSON) && (typeof fromMinJSON==='function')){
      const n = _cloneOwnerLike(obj, opts);
      if (n){ seen.set(obj,n); return n; }
    }
    if (opts.proxyPolicy==='shallow') return obj;
    throw err;
  }

  const skip = new Set(opts.skipKeys || []);
  for (const k of klist){
    const sv = obj[k];
if (_isEnumProxy(sv) || _isOrdProxy(sv)){
  try{
    const base= sv && sv.$base;
    const val = (sv && typeof sv.get==='function') ? sv.get()
              : (sv && typeof sv.valueOf==='function') ? sv.valueOf()
              : (sv && sv.v!=null ? sv.v : sv);
    if (base && typeof base.bindTo === 'function'){
      base.bindTo(out, k, val);   // yeni owner 'out' üzerine bind
      continue;
    }
  }catch{}
  out[k] = sv; // fallback: opak ata
  continue;
}
    if (skip.has(k)) continue;
    out[k] = cloneAnyWith(obj[k], opts, seen);
  }
  return out;
}

export function deepCopy(root, options = {}) {
  const opts = Object.assign({}, DeepCopyDefaults, options);
  return cloneAnyWith(root, opts);
}
export const deepClone = deepCopy;

/* ------------------------------------------------------------------ */
/* deepMerge (rich)                                                   */
/* ------------------------------------------------------------------ */
const _isArr = Array.isArray;


function _sameValueZero(a,b){ return (a===b) || (a!==a && b!==b); } // NaN equality
function _keyOf(item, by){
  if (!by) return item;
  if (typeof by==='string') return item && typeof item==='object' ? item[by] : item;
  return by(item);
}
export const DeepMergeDefaults = {
  array: 'replace',      // 'replace' | 'concat' | 'unique' | 'by'
  arrayBy: null,         // 'id' | (item)=>key — only when array:'by'
  map: 'merge',          // 'merge' | 'replace'
  set: 'union',          // 'union' | 'replace'
  preferSourceInstance: true,
  customizer: null       // (dstVal, srcVal, key, path, opts) => any | undefined
};
function _clone(v){ return (v==null || typeof v!=='object') ? v : deepCopy(v); }

function _mergeValue(dstVal, srcVal, key, path, opts, seen){
  if (isFn(opts.customizer)){
    const r = opts.customizer(dstVal, srcVal, key, path, opts);
    if (r !== undefined) return r;
  }
  if (srcVal === undefined) return dstVal;
  if (srcVal === null || typeof srcVal !== 'object') return srcVal;
  if (seen.has(srcVal)) return seen.get(srcVal);

  if (_isArr(srcVal)){
    if (!_isArr(dstVal)){ const out = srcVal.map(_clone); seen.set(srcVal, out); return out; }
    switch (opts.array){
      case 'concat': { const out = dstVal.concat(srcVal.map(_clone)); seen.set(srcVal, out); return out; }
      case 'unique': {
        const out = dstVal.slice();
        outer: for (const sv of srcVal){
          for (const dv of out) if (_sameValueZero(dv, sv)) continue outer;
          out.push(_clone(sv));
        }
        seen.set(srcVal, out); return out;
      }
      case 'by': {
        const by = opts.arrayBy;
        const out = []; const idx = new Map();
        const pushOrMerge = (item)=>{
          const k = _keyOf(item, by);
          if (idx.has(k)){ const i=idx.get(k); out[i] = _mergeValue(out[i], item, String(k), path.concat([String(k)]), opts, seen); }
          else { idx.set(k, out.length); out.push(_clone(item)); }
        };
        for (const dv of dstVal) pushOrMerge(dv);
        for (const sv of srcVal) pushOrMerge(sv);
        seen.set(srcVal, out); return out;
      }
      case 'replace':
      default: { const out = srcVal.map(_clone); seen.set(srcVal, out); return out; }
    }
  }

  if (srcVal instanceof Map){
    let out;
    if (dstVal instanceof Map && opts.map==='merge'){
      out = new Map(dstVal); seen.set(srcVal, out);
      for (const [k,v] of srcVal){ const dv = out.get(k); out.set(k, _mergeValue(dv, v, k, path.concat([String(k)]), opts, seen)); }
      return out;
    } else { out = new Map(); seen.set(srcVal, out); for (const [k,v] of srcVal) out.set(k, _clone(v)); return out; }
  }

  if (srcVal instanceof Set){
    if (opts.set==='replace' || !(dstVal instanceof Set)){ const out = new Set(srcVal); seen.set(srcVal, out); return out; }
    const out = new Set(dstVal); for (const v of srcVal) out.add(v); seen.set(srcVal, out); return out;
  }

  if (srcVal instanceof Date)     return new Date(srcVal.getTime());
  if (srcVal instanceof RegExp)   return new RegExp(srcVal.source, srcVal.flags);
  if (typeof ArrayBuffer!=='undefined' && ArrayBuffer.isView(srcVal)) return new srcVal.constructor(srcVal);
  if (typeof ArrayBuffer!=='undefined' && srcVal instanceof ArrayBuffer) return srcVal.slice(0);

  if (!_isPlain(srcVal)){
    if (dstVal && dstVal.constructor === srcVal.constructor){
      if (isFn(dstVal.merge))   { dstVal.merge(srcVal);   return dstVal; }
      if (isFn(dstVal.hydrate)) { dstVal.hydrate(srcVal); return dstVal; }
    }
    return opts.preferSourceInstance ? _clone(srcVal) : (dstVal ?? _clone(srcVal));
  }

  const out = _isPlain(dstVal) ? dstVal : {};
  seen.set(srcVal, out);
  for (const k of Object.keys(srcVal)){
    const sp = srcVal[k];
    const dp = out[k];
    out[k] = _mergeValue(dp, sp, k, path.concat([k]), opts, seen);
  }
  return out;
}
export function deepMerge(target, ...sources){
  const opts = DeepMergeDefaults;
  const seen = new WeakMap();
  for (const src of sources){
    if (!isObj(src)) continue;
    if (_isArr(src) || src instanceof Map || src instanceof Set){
      const merged = _mergeValue(target, src, '', [], opts, seen);
      if (target && typeof target==='object' && !_isArr(target) && !(target instanceof Map) && !(target instanceof Set)){
        if (merged !== target) return merged;
      } else { return merged; }
    } else {
      for (const k of Object.keys(src)){
        const dv = target[k];
        const sv = src[k];
        target[k] = _mergeValue(dv, sv, k, [k], opts, seen);
      }
    }
  }
  return target;
}
deepMerge.config = (partial)=>{ Object.assign(DeepMergeDefaults, partial||{}); return deepMerge; };
export function deepMergeNew(...sources){ const base = {}; return deepMerge(base, ...sources); }

/* ------------------------------------------------------------------ */
/* Timing utilities                                                    */
/* ------------------------------------------------------------------ */
export function sleep(ms){ return new Promise(r=> setTimeout(r, ms|0)); }
export function defer(){ let res, rej; const p = new Promise((r,j)=>{res=r; rej=j;}); p.resolve=res; p.reject=rej; return p; }
export function debounce(fn, ms=0){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
export function throttle(fn, ms=0){
  let last=0, tid=null, lastArgs=null;
  return function(...args){
    const now=Date.now();
    if (now-last>=ms){ last=now; fn.apply(this,args); }
    else { lastArgs=args; clearTimeout(tid); tid=setTimeout(()=>{ last=Date.now(); fn.apply(this,lastArgs); }, ms-(now-last)); }
  };
}

/* ------------------------------------------------------------------ */
/* runtime config                                                      */
/* ------------------------------------------------------------------ */
deepCopy.config  = (partial)=>{ Object.assign(DeepCopyDefaults, partial||{}); return deepCopy; };
deepMerge.config = (partial)=>{ Object.assign(DeepMergeDefaults, partial||{}); return deepMerge; };

export function resolveGlobal(path){
  try{
    const root = (typeof globalThis!=='undefined') ? globalThis : (typeof window!=='undefined'?window:{});
    if (!path) return root;
    return String(path).split('.').reduce((o,k)=> (o && o[k]!=null ? o[k] : undefined), root);
  }catch{ return undefined; }
}
export function makeUid(prefix='u'){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}
export function exposeStatic(target, name, fn){
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) return false;
  if (!name) return false;
  if (Object.prototype.hasOwnProperty.call(target, name)) return true;
  Object.defineProperty(target, name, { value: fn, writable: false, configurable: true });
  return true;
}
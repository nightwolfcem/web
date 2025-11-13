'use strict';
// CLASS.js — Cem-spec birleşik merkez (nihai, constructor-sız damga)
// Özellikler: T+camelCase (warn|error|off), stable $className (leaf), registry, mixins,
// plugin installer, layered options (global < app < runtime), idFormat, meta, ensureId.

export const CLASS_CONFIG = {
  defaultNs: (()=>{ try { return new URL('.', import.meta.url).href; } catch { return 'app://local/'; } })(),
  idFormat: (ns, type, n)=> `${type}-${n}`,
  privatePrefix: /^[_$]/,
  enforceTPrefix: true,
  enforceCamelAfterT: true,
  naming: { mode: 'warn' } // 'error'|'warn'|'off'
};

const __registry = Object.create(null);      // key: `${ns}|${name}` -> ctor
const __nsCounters = new Map();              // ns|type -> number
const __SYM_META = Symbol.for('T::__meta');  // { ns, type, n, name }
const __SYM_INIT = Symbol.for('T:init');     // captured init args
const __HOOKS = { register: new Set(), construct: new Set() };
const __WARNED = new Set();

// constructor dışı state
const __idWM   = new WeakMap();
const __initWM = new WeakMap();

// layered options
const __optsGlobal  = {};
const __optsApp     = {};
const __optsRuntime = {};

function __isObj(v){ return v && typeof v==='object' && !Array.isArray(v); }
function __clone(o){ try{ return JSON.parse(JSON.stringify(o)); }catch{ return o; } }
function __merge(dst, src){
  if (!__isObj(src)) return dst;
  for (const k of Object.keys(src)){
    const v = src[k];
    if (__isObj(v)){ if (!__isObj(dst[k])) dst[k] = {}; __merge(dst[k], v); }
    else dst[k] = v;
  }
  return dst;
}
function __getPath(obj, path){
  if (!path) return obj;
  const parts = String(path).split('.').filter(Boolean);
  let cur = obj;
  for (const k of parts){
    if (!__isObj(cur)) return undefined;
    cur = cur[k];
    if (cur === undefined) return undefined;
  }
  return cur;
}
function __getMerged(){
  const out = {};
  __merge(out, __optsGlobal);
  __merge(out, __optsApp);
  __merge(out, __optsRuntime);
  return out;
}
function __opt(path, defaults){
  const got = __getPath(__getMerged(), path);
  if (got === undefined){
    if (__isObj(defaults)) return __merge(__clone(defaults));
    return defaults;
  }
  if (__isObj(defaults)){
    const out = __clone(defaults);
    return __merge(out, got);
  }
  return got;
}

function __ns(ns){
  if (ns) return ns;
  try { return new URL('.', import.meta.url).href; }
  catch { return CLASS_CONFIG.defaultNs; }
}
function __key(ns, name){ return `${ns}|${name}`; }

function __ensureTPrefix(name){
  if (!CLASS_CONFIG.enforceTPrefix) return;
  if (typeof name === 'string' && !/^T/.test(name)){
    throw new Error(`CLASS: Sınıf adı "T" ile başlamalı: ${name}`);
  }
  const mode = __opt('naming.mode', CLASS_CONFIG.naming.mode);
  if (CLASS_CONFIG.enforceCamelAfterT && typeof name === 'string' && /^T[A-Z]/.test(name)){
    const msg = `CLASS: "T" sonrası küçük harf olmalı (camelCase): ${name}`;
    if (mode === 'error') throw new Error(msg);
    if (mode === 'warn' && !__WARNED.has(name)){ __WARNED.add(name); try{ console.warn(msg); }catch{} }
  }
}

function __nextNum(ns, type){
  const k = `${ns}|${type}`;
  const n = (__nsCounters.get(k) || 0) + 1;
  __nsCounters.set(k, n);
  return n;
}
function __flatParents(Cls){
  const out = [];
  for (let C = Cls; C && C !== Object; C = Object.getPrototypeOf(C)){
    const nm = C.name || 'T';
    if (!nm || nm === 'Object' || nm === 'TCombined') continue;
    out.push(nm);
  }
  // unique, keep order
  const seen = new Set(); const res = [];
  for (const n of out){ if (!seen.has(n)){ seen.add(n); res.push(n); } }
  return res;
}
function __parentsClean(Cls, { skip=['Bridge'], dedupe=true } = {}){
  const arr = __flatParents(Cls);
  const out = [];
  for (const p of arr){
    if (skip && skip.includes(p)) continue;
    if (dedupe && out[out.length-1] === p) continue;
    out.push(p);
  }
  return out;
}
function __copyStatics(from, to){
  for (const k of Object.getOwnPropertyNames(from)){
    if (k === 'length' || k === 'name' || k === 'prototype') continue;
    if (!(k in to)){
      const d = Object.getOwnPropertyDescriptor(from, k);
      try { Object.defineProperty(to, k, d); } catch {}
    }
  }
}
function __copyProto(fromProto, toProto){
  if (!fromProto || !toProto) return;
  for (const k of Reflect.ownKeys(fromProto)){
    if (k === 'constructor') continue;
    if (!(k in toProto)){
      const d = Object.getOwnPropertyDescriptor(fromProto, k);
      try { Object.defineProperty(toProto, k, d); } catch {}
    }
  }
}

/* ================== Çoklu mixin birleştirici ================== */
export function extendsWith(Base, ...mixins){
  class TCombined extends (Base || class {}) {}
  for (const M of mixins){
    if (!M) continue;
    const proto = (typeof M === 'function') ? M.prototype : M;
    __copyProto(proto, TCombined.prototype);
    if (typeof M === 'function') __copyStatics(M, TCombined);
  }
  Object.defineProperty(TCombined, 'name', { value: 'TCombined', configurable: true });
  return TCombined;
}

/* ================== Ana sarmalayıcı ================== */
export function CLASS(Cls, meta = {}){
  const ns = __ns(meta.ns);
  const name = meta.className || Cls.name || 'T';
  __ensureTPrefix(name);

  const parents = __flatParents(Cls);
  Object.defineProperty(Cls, '$ns',      { value: ns,        configurable: true });
  Object.defineProperty(Cls, '$parents', { value: parents,   configurable: true });

  __registry[__key(ns, name)] = Cls;

  const Orig = Cls;
  class Wrapped extends Orig {
    constructor(...args){
      super(...args);
      // sadece init arg yakala (constructor dışında damga yok)
      __initWM.set(this, args);
      if (__HOOKS.construct && __HOOKS.construct.size){
        const type = Orig.name || 'T';
        const nPreview = (__nsCounters.get(`${ns}|${type}`)||0)+1; // id üretmeden bilgi
        for (const fn of Array.from(__HOOKS.construct)) try{ fn(this, { ns, name, type, n:nPreview }); }catch{}
      }
    }
  }
  __copyStatics(Orig, Wrapped);
  Object.defineProperty(Wrapped, 'name', { value: name, configurable: true });

  // ---- Prototype-level kimlik & metadata ----
  if (!Object.prototype.hasOwnProperty.call(Wrapped.prototype, '$class')){
    Object.defineProperty(Wrapped.prototype, '$class', {
      configurable: true,
      get(){ return Orig; }
    });
  }
  if (!Object.prototype.hasOwnProperty.call(Wrapped.prototype, '$className')){
    Object.defineProperty(Wrapped.prototype, '$className', {
      configurable: true,
      get(){ return name; } // yaprak adı (wrapper kapanışındaki 'name')
    });
  }
  if (!Object.prototype.hasOwnProperty.call(Wrapped.prototype, 'id')){
    Object.defineProperty(Wrapped.prototype, 'id', {
      configurable: true,
      enumerable: true,
      get(){
        let val = __idWM.get(this);
        if (val == null){
          const type = Orig.name || 'T';
          val = __nextNum(ns, type);
          __idWM.set(this, val);
          try { Object.defineProperty(this, 'id', { value: val, enumerable: true, configurable: true }); } catch {}
        }
        return val;
      }
    });
  }
  if (!Object.prototype.hasOwnProperty.call(Wrapped.prototype, __SYM_INIT)){
    Object.defineProperty(Wrapped.prototype, __SYM_INIT, {
      configurable: true,
      get(){ return __initWM.get(this) || null; }
    });
  }
  if (!Object.prototype.hasOwnProperty.call(Wrapped.prototype, __SYM_META)){
    Object.defineProperty(Wrapped.prototype, __SYM_META, {
      configurable: true,
      get(){
        const type = Orig.name || 'T';
        return { ns, type, n: this.id, name };
      }
    });
  }

  const prev = __registry[__key(ns, name)];
  __registry[__key(ns, name)] = Wrapped;
  for (const fn of Array.from(__HOOKS.register)) try{ fn({ ns, name, ctor: Wrapped, prev }); } catch(e){ /* silent */ }

  return Wrapped;
}
CLASS.__SYM_INIT = __SYM_INIT;
Object.defineProperty(CLASS, '__SYM_INIT', { enumerable:false });

/* ================== Genel API ================== */
CLASS.extends = extendsWith;

// Registry yardımcıları
CLASS.register = (Ctor, ns)=> {
  if (typeof Ctor !== 'function') throw new Error('CLASS.register: Ctor function olmalı');
  const _ns = __ns(ns || Ctor.$ns);
  const name = Ctor.name || 'T';
  __ensureTPrefix(name);
  Object.defineProperty(Ctor, '$ns',      { value: _ns, configurable: true });
  Object.defineProperty(Ctor, '$parents', { value: __flatParents(Ctor), configurable: true });
  __registry[__key(_ns, name)] = Ctor;
  return Ctor;
};
CLASS.get     = (ns, name)=> __registry[__key(__ns(ns), name)] || null;
CLASS.has     = (ns, name)=> !!__registry[__key(__ns(ns), name)];
CLASS.require = (ns, name)=> {
  const C = CLASS.get(ns, name);
  if (!C) throw new Error(`CLASS.require: bulunamadı → ${name} @ ${__ns(ns)}`);
  return C;
};
CLASS.list    = ()=> Object.keys(__registry);
CLASS.keys    = ()=> Object.keys(__registry);
CLASS.entries = ()=> Object.entries(__registry);

// ---- (Taşınan) Yardımcılar ----
CLASS.getId = function(obj){ return obj && obj.id != null ? obj.id : null; };
CLASS.findById = function(id){
  if (id == null) return null;
  try {
    if (CLASS.byId && CLASS.byId[id] != null) return CLASS.byId[id];
    // byOrder fallback when ids are dense numbers
    if (CLASS.byOrder && typeof id === 'number') return CLASS.byOrder[id] || null;
  } catch {}
  return null;
};
// İç sayaçlardan bir sonraki numarayı, state değiştirmeden önizle
CLASS.peekNext = function(ns, type){
  try {
    return ((typeof __nsCounters!=='undefined' && __nsCounters.get(`${ns}|${type}`)) || 0) + 1;
  } catch {
    return null;
  }
};
// Kimlik metni ayrıştırıcı
CLASS.parseId = function(id){
  if (id == null) return null;
  const s = String(id);
  // patterns: ns|Type#n , ns-Type-n , Type#n , Type-n
  let m = s.match(/^([^|#-]+)[\|\-]([A-Za-z_]\w+)[\#\-](\d+)$/);
  if (m) return { ns:m[1], type:m[2], n: Number(m[3]) };
  m = s.match(/^([A-Za-z_]\w+)[\#\-](\d+)$/);
  if (m) return { type:m[1], n: Number(m[2]) };
  return { raw:s };
};
// Meta okuma (mutasyon yapmadan, sembolden hızlı okuma)
CLASS.metaPeek = function(obj){
  try {
    const m = obj && obj[__SYM_META];
    if (m) return { name:m.name, type:m.type, n:m.n };
  } catch {}
  return null;
};
// Minimal describe util
CLASS.describe = function(obj){
  const id = this.getId(obj);
  const m1 = this.metaPeek(obj) || {};
  const m2 = this.metaOf(obj)   || {};
  // prefer peek values; fall back to metaOf
  return {
    id,
    ns:   m1.ns   ?? m2.ns   ?? null,
    type: m1.type ?? (m2.type || m2.class) ?? null,
    order: m1.n   ?? m2.order ?? null
  };
};

// Meta/Tip yardımcıları
CLASS.meta = (Ctor)=> {
  if (typeof Ctor !== 'function') return null;
  const ns = Ctor.$ns || __ns();
  const name = Ctor.name || 'T';
  return { ns, name, parents: Ctor.$parents || __flatParents(Ctor), key: __key(ns, name) };
};
CLASS.metaOf = (obj)=>{
  if (!obj) return null;
  const C = obj.constructor;
  const ns = C.$ns || __ns();
  const name = C.name || 'T';
  const init = obj[__SYM_INIT] || obj.__init || null;
  return { ns, class: name, init };
};
CLASS.parentsOf = (x)=> {
  const C = (typeof x === 'function') ? x : (x && x.constructor);
  return __flatParents(C);
};
CLASS.parentsClean = (x, opts)=> __parentsClean((typeof x==='function')?x:(x&&x.constructor), opts);
CLASS.flatParents = __flatParents;
CLASS.nameOf = (x)=> (x && (x.$className || (x.constructor && x.constructor.name))) || '';
CLASS.nsOf   = (x)=> (x && (x.$ns || (x.constructor && x.constructor.$ns))) || '';
CLASS.isA    = (obj, CtorOrName)=>{
  if (!obj) return false;
  if (typeof CtorOrName === 'function'){
    for (let C = obj.constructor; C && C !== Object; C = Object.getPrototypeOf(C)){
      if (C === CtorOrName) return true;
    }
    return false;
  }
  const target = String(CtorOrName || '');
  let C = obj.constructor;
  while (C && C !== Object){
    if ((C.name||'') === target) return true;
    C = Object.getPrototypeOf(C);
  }
  return false;
};

// Dirty-track uyumlu property tanımlayıcı
CLASS.defineProp = function(obj, key, initial){
  let val = initial;
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get(){ return val; },
    set(v){ val = v; if (typeof obj.__markDirty === 'function') obj.__markDirty(key, v); }
  });
  return obj;
};

CLASS.setIdFormatter = (fmt)=> { if (typeof fmt === 'function') CLASS_CONFIG.idFormat = fmt; };
CLASS.setNsFor = (Ctor, ns)=> {
  Object.defineProperty(Ctor, '$ns', { value: __ns(ns), configurable: true });
  __registry[__key(Ctor.$ns, Ctor.name||'T')] = Ctor;
  return Ctor;
};

// Hook sistemi
CLASS.on = (evt, fn)=> { if (!__HOOKS[evt]) __HOOKS[evt] = new Set(); __HOOKS[evt].add(fn); return ()=>__HOOKS[evt].delete(fn); };
CLASS.alias = ({from, to})=>{
  const C = CLASS.get(from.ns, from.name);
  if (!C) throw new Error(`CLASS.alias: source not found ${from.ns||''}|${from.name}`);
  const ns = __ns(to.ns);
  const name = to.name;
  __ensureTPrefix(name);
  __registry[__key(ns, name)] = C;
  return C;
};

// Plugin/installer (klasik map + base url)
CLASS.installBase = null;
CLASS.installMap = {
  serializer: './Tserializer.js',
  fn:         './TfnRegistry.js',
  function:   './TfnRegistry.js',
  events:     './eventsBridge.js',
  ev:         './eventsBridge.js',
  history:    './ThistoryManager.js',
  hs:         './ThistoryManager.js',
  enums:      './enums.js',
  class:      './CLASS.js',
  history: './ThistoryManager.js',
  selection: './Tselection.js',
  pointer: './TpointerController.js',
  snap: './Tsnap.js',
  persist: './Tpersist.js',
  shortcut: './Tshortcut.js',
  clipboard: './Tclipboard.js',
  inspector: './Tinspector.js',
  appsetup: './TappSetup.js',};
CLASS.getPluginProvider = (name)=> {
  const m = {
    serializer: 'serializer', fn: 'function', function: 'function',
    events: 'events', ev:'events',
    history:'history', hs:'history',
    enums: 'enums', class: 'class'
  }[name];
  return m || null;
};
CLASS.install = async function(name, opts = {}){
  const map = CLASS.installMap || {};
  // 1) raw base: önce opts.base, sonra CLASS.installBase, yoksa "".
  let base = opts.base || CLASS.installBase || "";

  // 2) base'i mutlak (absolute) URL'e çevir.
  //    Sen ./CORE12/ gibi relative bile versen burada window.location.href'e göre çözülür.
  //    Eğer zaten absolute ise (http:, file:, data: vs) dokunmayız.
  if (base && !/^https?:|^file:|^app:|^data:/.test(base)) {
    // base relative görünüyor
    // browser tarafı
    if (typeof window !== "undefined" && window.location && window.location.href){
      try {
        base = String(new URL(base, window.location.href));
      } catch(e){}
    }
    // fallback: module context (ör: import.meta.url varsa)
    else if (typeof import.meta === "object" && import.meta && import.meta.url){
      try {
        base = String(new URL(base, import.meta.url.replace(/[^/]+$/, "")));
      } catch(e){}
    }
  }

  const alias   = opts.as || null;
  const doAttach = opts.attach !== false; // default true
  const url  = (opts.url || map[name] || name);
  const href = (/^https?:|^file:|^app:|^data:/.test(url))
    ? url
    : String(new URL(url, base));

  const mod = await import(href);
  if (!mod) throw new Error("CLASS.install: modul yüklenemedi: " + name + " @ " + href);
  const out = mod;
  if (doAttach && alias && CLASS && CLASS.services){
    CLASS.services[alias] = mod;
  }

  return out;
};
CLASS.bindInstall = (K)=> (name, opts={}) => CLASS.install(name, { ...opts, CLASS: (K||CLASS) });
CLASS.installMany = async (names, opts={})=>{ const out={}; for (const n of names) out[n]=await CLASS.install(n, opts); return out; };
CLASS.Tinstall = CLASS.install;
CLASS.TbindInstall = CLASS.bindInstall;
CLASS.TinstallMany = CLASS.installMany;
CLASS.install.setMap  = (m)=> Object.assign(CLASS.installMap, m||{});
CLASS.install.getMap  = ()=> ({ ...CLASS.installMap });
CLASS.install.setBase = (url)=> { CLASS.installBase = url || null; };

// Legacy alias
Object.defineProperty(CLASS, 'registry', { get: ()=> __registry });

// Layered options public API
CLASS.options = function(keyOrObj, val){
  if (keyOrObj === undefined) return __clone(__optsGlobal);
  if (typeof keyOrObj === 'string' && val === undefined) return __clone(__getPath(__optsGlobal, keyOrObj));
  if (typeof keyOrObj === 'string'){
    const parts = keyOrObj.split('.'); let cur = __optsGlobal;
    for (let i=0;i<parts.length-1;i++){ const k=parts[i]; if (!__isObj(cur[k])) cur[k]={}; cur=cur[k]; }
    cur[parts[parts.length-1]] = val; return val;
  }
  if (__isObj(keyOrObj)) return __merge(__optsGlobal, keyOrObj);
  return undefined;
};
CLASS.appOptions = function(keyOrObj, val){
  if (keyOrObj === undefined) return __clone(__optsApp);
  if (typeof keyOrObj === 'string' && val === undefined) return __clone(__getPath(__optsApp, keyOrObj));
  if (typeof keyOrObj === 'string'){
    const parts = keyOrObj.split('.'); let cur = __optsApp;
    for (let i=0;i<parts.length-1;i++){ const k=parts[i]; if (!__isObj(cur[k])) cur[k]={}; cur=cur[k]; }
    cur[parts[parts.length-1]] = val; return val;
  }
  if (__isObj(keyOrObj)) return __merge(__optsApp, keyOrObj);
  return undefined;
};
CLASS.runtimeOptions = function(keyOrObj, val){
  if (keyOrObj === undefined) return __clone(__optsRuntime);
  if (typeof keyOrObj === 'string' && val === undefined) return __clone(__getPath(__optsRuntime, keyOrObj));
  if (typeof keyOrObj === 'string'){
    const parts = keyOrObj.split('.'); let cur = __optsRuntime;
    for (let i=0;i<parts.length-1;i++){ const k=parts[i]; if (!__isObj(cur[k])) cur[k]={}; cur=cur[k]; }
    cur[parts[parts.length-1]] = val; return val;
  }
  if (__isObj(keyOrObj)) return __merge(__optsRuntime, keyOrObj);
  return __CLASS_AUGMENT(undefined);
};
CLASS.opt = (path, defaults)=> __opt(path, defaults);
CLASS.getConfig = (path, defaults)=> __opt(path, defaults);

// Global'a kurulum
if (typeof window !== 'undefined') window.CLASS = CLASS;
if (typeof globalThis !== 'undefined') globalThis.CLASS = CLASS;

// config uyumluluğu (salt okunur)
try{ if (typeof globalThis!=='undefined'){ Object.defineProperty(globalThis, 'config', { get: ()=> CLASS.options(), enumerable:true }); } }catch{}

export default CLASS;

/* === core12-integrated: CLASS augment (non-breaking) === */
function __CLASS_AUGMENT(Wrapped){
  if (!Wrapped || Wrapped.__augmented) return Wrapped;
  try{
    // Defaults
    if (Wrapped.$debug === undefined) Wrapped.$debug = false;
    if (Wrapped.$v === undefined) Wrapped.$v = 1;
    if (!Wrapped.$meta){
      const nm = Wrapped.name || "Tclass";
      Wrapped.$meta = {
        name: nm,
        idPrefix: nm.replace(/^T?/, "").toLowerCase() || "t",
        caps: { selectable:true, movable:true, draggable:true, droppable:false, serializable:true },
        defaults: {}
      };
    }
    // Helpers
    if (typeof globalThis.__nsCounters !== 'object') globalThis.__nsCounters = Object.create(null);
    if (!Wrapped.autoId) Wrapped.autoId = function autoId(prefix){
      const p = String(prefix || (this.$meta && this.$meta.idPrefix) || "t");
      const c = (globalThis.__nsCounters[p] ||= 0) + 1; globalThis.__nsCounters[p] = c; return `${p}${c}`;
    };
    if (!Wrapped.getId) Wrapped.getId = function getId(o){ return o && o.id; };
    if (!Wrapped.setId) Wrapped.setId = function setId(o, id){if (!o) return o;if (o.hasOwnProperty('id')) {return o;}
    Object.defineProperty(o, 'id', { value: id, enumerable: true, configurable: true });return o;};
    if (!Wrapped.parentsOf) Wrapped.parentsOf = function parentsOf(o){ return o && o.$parents ? o.$parents.slice() : []; };
    if (!Wrapped.is) Wrapped.is = function is(o){ return !!(o && (o instanceof Wrapped || o?.constructor === Wrapped)); };
    if (!Wrapped.define) Wrapped.define = function define(meta){
      const base = this.$meta || {}; this.$meta = {
        ...base, ...meta,
        caps: { ...(base.caps||{}), ...(meta?.caps||{}) },
        defaults: { ...(base.defaults||{}), ...(meta?.defaults||{}) }
      }; return this;
    };
    // Codec helpers
    function __ensureCodec(Cls){
      if (!Cls.$codec){
        Cls.$codec = {
          toMin(o){ if(o && typeof o.toMinJSON==='function') return o.toMinJSON(); return (o && Array.isArray(o.__args__))? o.__args__ : []; },
          fromMin(args){ const a = Array.isArray(args)? args : []; return new Cls(...a); }
        };
      }
      return Cls.$codec;
    }
    if (!Wrapped.codec) Wrapped.codec = function codec(toMin, fromMin){
      const def = __ensureCodec(this);
      this.$codec = { toMin: typeof toMin==='function'? toMin : def.toMin, fromMin: typeof fromMin==='function'? fromMin : def.fromMin };
      return this;
    };
    if (!Wrapped.registerCodec) Wrapped.registerCodec = function registerCodec(serializer){
      const name = this.name || this.$meta?.name || "Tclass";
      const { toMin, fromMin } = __ensureCodec(this);
      if (serializer && typeof serializer.registerCodec === 'function'){
        serializer.registerCodec(name, { toMin, fromMin });
      }
      return this;
    };
    if (!Wrapped.toMinJSON) Wrapped.toMinJSON = function toMinJSON(o){ return __ensureCodec(Wrapped).toMin(o); };
    if (!Wrapped.fromMinJSON) Wrapped.fromMinJSON = function fromMinJSON(minArgs){ return __ensureCodec(Wrapped).fromMin(minArgs); };

    // Install/use ecosystem
    if (!Wrapped.install) Wrapped.install = function install(ctx={}){
      if (ctx.serializer) this.registerCodec(ctx.serializer);
      if (ctx.registry && typeof ctx.registry.registerType==='function'){ ctx.registry.registerType(this.name, this); }
      if (ctx.styles && this.$meta?.defaults?.styles){
        try{ ctx.styles.registerDefaults?.(this.name, this.$meta.defaults.styles); }catch{}
      }
      return this;
    };
    if (!Wrapped.use) Wrapped.use = function use(ctx={}){ (ctx.classes||[Wrapped]).forEach(C=>C.install(ctx)); return Wrapped; };

    Wrapped.__augmented = true;
  }catch{}
  return Wrapped;
}
/* === /core12-integrated: CLASS augment === */

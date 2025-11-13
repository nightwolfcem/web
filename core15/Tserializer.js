'use strict';
// Tserializer.js — FULL sürüm + Enum/Ord bindTo rebind
// - Tek hat: toMin/fromMin; toJSON/fromJSON ince kaplar
// - Policy (optOut/optIn, include/exclude, includeClasses, elementOnly)
// - Event köprüsü (snapshot/restore)
// - DOM Element codec, TypedArray/ArrayBuffer/DataView, BigInt, NaN/±Infinity, undefined
// - Function registry ($fn) paketleme (TfunctionRegistry)
// - GraphDoc + Atom Doc
// - Adapter/Ctor köprüsü (JSON bridge) + Codec Registry
// - **YENİ:** Enum/Ord → compact marker + fromMin sırasında property-level bindTo

import CLASS from './CLASS.js';
import { isArr, isObj, isFn, isStr, makeUid } from './utils.js';
import TfunctionRegistry from './TfunctionRegistry.js';

/* --------------------------------- helpers -------------------------------- */
const own = (o,k)=> Object.prototype.hasOwnProperty.call(o,k);
const classNameOf = (v)=> (v && (v.$className || v.constructor?.TNAME || v.constructor?.name)) || null;
const isDomNode = (v)=> typeof Node !== 'undefined' && v instanceof Node;
const isEventLike = (v)=> (typeof Event!=='undefined' && v instanceof Event);
const isElement = (v)=> (typeof Element!=='undefined' && v instanceof Element);
const shouldSkipKey = (k, v)=> {
  if (!k) return false;
  if (k[0]==='$') return true;
  if (k==='__proto__' || k==='prototype') return true;
  if (/^on[A-Za-z]/.test(k)) return true;
  if (/(?:Listener|Handlers?)$/.test(k)) return true;
  if (isEventLike(v)) return true;
  if (isElement(v)) return false;
  return false;
};

/* Enum/Ord tespiti */
const isEnumInst = (v)=> !!(v && typeof v==='object' && v.$base && (v.$base.$kind==='Enum' || v.$base.kind==='Enum' || v.$base));
const isOrdInst  = (v)=> !!(v && typeof v==='object' && v.$base && (v.$base.$kind==='Ord'  || v.$base.kind==='Ord'));

/* Enum/Ord assignment helper — ctor DIŞINDA bindTo kur */
function _assignWithEnumOrdBind(target, key, value){
  if (isEnumInst(value) || isOrdInst(value)){
    const base = value.$base;
    const val  = (typeof value.get==='function') ? value.get()
               : (typeof value.valueOf==='function') ? value.valueOf()
               : (value && value.v!=null ? value.v : value);
    if (base && typeof base.bindTo === 'function'){
      try { base.bindTo(target, key, val); return; } catch {}
    }
  }
  target[key] = value;
}

/* ========================================================================== *
 * Codec Registry (Min JSON)
 * ========================================================================== */
class TcodecRegistry {
  constructor(){ this.byName = new Map(); }
  static keyOf(C){ return C ? (C.TNAME || C.name || null) : null; }
  register(nameOrClass, { toMin, fromMin }){
    const key = isStr(nameOrClass) ? nameOrClass : TcodecRegistry.keyOf(nameOrClass);
    if (!key) throw new Error('TcodecRegistry.register: invalid type key');
    this.byName.set(key, { toMin, fromMin }); return this;
  }
  get(nameOrClass){
    const key = isStr(nameOrClass) ? nameOrClass : TcodecRegistry.keyOf(nameOrClass);
    return key ? this.byName.get(key) : null;
  }
}

/* ========================================================================== *
 * JSON Köprüsü için Adapter/Ctor tabloları
 * ========================================================================== */
const __adapters = new Map(); // className -> { toJSON(value, ctx), fromJSON(data, ctx) }
const __ctors    = new Map(); // className -> ctor

const DEFAULT_EXCLUDES = ['el','dom','htmlObject','__proxy__'];

/* ========================================================================== *
 * Tserializer
 * ========================================================================== */
export const Tserializer = CLASS(class Tserializer {
  /* ===== Statik event yardımcıları (compat) ===== */
  static hooks = {};
  static toJSON_withEvents(obj, ctx){ const S = new Tserializer({ events:{ enabled:true } }); return S.toJSON_withEvents(obj, ctx); }
  static fromJSON_withEvents(min, ctx){ const S = new Tserializer({ events:{ enabled:true } }); return S.fromJSON_withEvents(min, ctx); }
  static attachEvents(min, obj){ const S = new Tserializer({ events:{ enabled:true } }); return S.attachEvents(min, obj); }
  static restoreEvents(obj, min){ const S = new Tserializer({ events:{ enabled:true } }); return S.restoreEvents(obj, min); }

  constructor(opts = {}){
    this.opts = Object.assign({
      respectObjectMinJSON: true,     // obj.toMinJSON() kullan
      respectObjectJSON: false,       // obj.toJSON() IGNORE
      warnOnIgnoredObjectJSON: false,
      pool: true,
      rebind: true,
      atoms: { enabled:false, minLen:4, minFreq:2 },
      dom: { enabled:true, preserveHTML:true, attributes:true },
      policy: null,                   // { mode:'optOut'|'optIn', includeProps, excludeProps, includeClasses, elementOnly }
      ns: 'app',
      tag: 'both',                    // 'type' | 'className' | 'both' | 'none'
      events: { enabled: false }
    }, opts||{});

    this.registry = new TcodecRegistry();
    this._installBuiltins(this.opts);
  }

  /* ---------- Policy yardımcıları ---------- */
  setPolicy(p){ if (isObj(p)) this.opts.policy = p; return this; }
  setNamespace(ns){ this.opts.ns = String(ns || this.opts.ns); return this; }
  _policy(){ return this.opts.policy || {}; }
  _mode(){ return this._policy().mode || 'optOut'; }
  _includeProps(cn){ return (this._policy().includeProps || {})[cn] || null; }
  _excludeProps(cn){
    const ex = (this._policy().excludeProps || {})[cn] || [];
    const out = this._policy().elementOnly ? Array.from(new Set(ex.concat(DEFAULT_EXCLUDES))) : ex;
    return out;
  }
  _includeClass(cn){
    const list = this._policy().includeClasses;
    return Array.isArray(list) ? list.includes(cn) : false;
  }

  /* ---------- Adapter/Ctor API (JSON köprüsü) ---------- */
  registerAdapter(className, adapter){ __adapters.set(String(className), adapter||{}); return this; }
  unregisterAdapter(className){ __adapters.delete(String(className)); return this; }
  registerCtor(className, ctor){ if (isFn(ctor)) __ctors.set(String(className), ctor); return this; }
  unregisterCtor(className){ __ctors.delete(String(className)); return this; }

  /* ---------- Codec Registry API (Min JSON) ---------- */
  registerCodec(nameOrClass, io){ this.registry.register(nameOrClass, io); return this; }

  /* ===================== Tek boru hattı alias'ları ===================== */
  toJSON(value, { policy=null, pretty=false } = {}){
    if (policy) this.setPolicy(policy);
    const data = this.toMin(value);
    return pretty ? JSON.parse(JSON.stringify(data, null, 2)) : data;
  }
  fromJSON(data){ return this.fromMin(data); }
  stringify(value, opts={}){ return JSON.stringify(this.toJSON(value, opts)); }
  parse(text, opts={}){ try{ const j=JSON.parse(text); return this.fromJSON(j, opts); }catch{ return null; } }

  /* ===================== Event Bridge Methods (instance) ===================== */
  toJSON_withEvents(obj, ctx) {
    const base = this.toJSON ? this.toJSON(obj, ctx) : (obj && obj.toMinJSON ? obj.toMinJSON(ctx) : obj);
    if (!this.opts.events.enabled) return base;
    try {
      const el = obj && (obj.el || obj.element);
      if (!el) return base;
      let ev = null;
      const TB = (typeof globalThis!=='undefined') ? (globalThis.TeventBridge || null) : null;
      if (TB && typeof TB.snapshot === 'function'){ ev = TB.snapshot(el); }
      else if (typeof globalThis.eventSnapshot === 'function'){ ev = globalThis.eventSnapshot(el); }
      else if (typeof globalThis.getEventMap === 'function'){
        const map = globalThis.getEventMap(el);
        if (map){
          ev = {};
          map.forEach((list, type)=>{ ev[type] = list.map(r=>({ id:(r.rid||r.id), o:r.options })); });
        }
      }
      if (ev){
        const out = (base && typeof base === 'object') ? { ...base } : { v: base };
        out.$ev = ev;
        return out;
      }
    } catch {}
    return base;
  }

  fromJSON_withEvents(min, ctx) {
    const obj = this.fromJSON ? this.fromJSON(min, ctx) : (min && min.$ && min.$.fromMinJSON ? min.$.fromMinJSON(min, ctx) : min);
    if (!this.opts.events.enabled) return obj;
    try {
      const ev = min && min.$ev;
      const el = obj && (obj.el || obj.element);
      if (ev && el){
        const TB = (typeof globalThis!=='undefined') ? (globalThis.TeventBridge || null) : null;
        if (TB && typeof TB.restore === 'function'){ TB.restore(el, ev); }
        else if (typeof globalThis.eventRestore === 'function'){ globalThis.eventRestore(el, ev); }
        else if (typeof globalThis.getFnById === 'function'){
          for (const type of Object.keys(ev)){
            const arr = ev[type] || [];
            for (const rec of arr){
              const fn = globalThis.getFnById(rec.id);
              if (typeof fn === 'function'){
                try { el.addEventListener(type, fn, rec.o); } catch {}
              }
            }
          }
        }
      }
    } catch {}
    return obj;
  }

  attachEvents(min, obj) {
    if (!this.opts.events.enabled) return min;
    const el = obj && (obj.el || obj.element);
    if (!el) return min;
    try {
      let ev = null;
      const TB = (typeof globalThis!=='undefined') ? (globalThis.TeventBridge || null) : null;
      if (TB && typeof TB.snapshot === 'function'){ ev = TB.snapshot(el); }
      else if (typeof globalThis.eventSnapshot === 'function'){ ev = globalThis.eventSnapshot(el); }
      if (ev){
        const out = (min && typeof min === 'object') ? { ...min } : { v:min };
        out.$ev = ev;
        return out;
      }
    } catch {}
    return min;
  }

  restoreEvents(obj, min) {
    if (!this.opts.events.enabled) return;
    const el = obj && (obj.el || obj.element);
    const ev = min && min.$ev;
    if (!el || !ev) return;
    try {
      const TB = (typeof globalThis!=='undefined') ? (globalThis.TeventBridge || null) : null;
      if (TB && typeof TB.restore === 'function'){ TB.restore(el, ev); }
      else if (typeof globalThis.eventRestore === 'function'){ globalThis.eventRestore(el, ev); }
    } catch {}
  }

  /* ===================== Policy-aware şekillendirme ===================== */
  _tag(out, name){
    if (!name) return out;
    switch(this.opts.tag){
      case 'type': out.$type = name; break;
      case 'className': out.$className = name; break;
      case 'both': out.$type = name; out.$className = name; break;
      case 'none': default: /* no tag */ ;
    }
    return out;
  }
  _pickPropsPolicy(obj, cn){
    const mode = this._mode();
    const inc  = this._includeProps(cn);
    const exc  = this._excludeProps(cn);
    let keys = Object.keys(obj||{});
    if (mode === 'optIn'){
      keys = inc ? inc.filter(k=> own(obj,k)) : [];
      if (!keys.length && this._includeClass(cn)) keys = Object.keys(obj||{});
    }
    const out = {};
    for (const k of keys){
      if ((exc && exc.includes(k)) || shouldSkipKey(k, obj[k])) continue;
      const v = obj[k];
      if (isFn(v) || typeof v==='symbol' || typeof v==='undefined') continue;
      if (isDomNode(v)) continue;
      out[k] = v;
    }
    return this._tag(out, cn);
  }

  /* ===================== Min JSON ===================== */
  toMin(value){ const ctx = this._mkCtx(); return this._toMin(value, ctx); }
  fromMin(min){ const ctx = this._mkCtx(); return this._fromMin(min, ctx); }

  toMinDoc(value, aopts){
    const data = this.toMin(value);
    const useAtoms = (aopts?.atoms ?? this.opts.atoms?.enabled) === true;
    const minLen   = aopts?.minLen ?? this.opts.atoms?.minLen ?? 4;
    const minFreq  = aopts?.minFreq ?? this.opts.atoms?.minFreq ?? 2;
    if (!useAtoms) return { v:1, data };
    const { table, transformed } = _atomize(data, { minLen, minFreq });
    return { v:1, a:{ s: table }, data: transformed };
  }
  fromMinDoc(doc){
    if (!isObj(doc)) return null;
    const hasAtoms = Array.isArray(doc?.a?.s);
    const data = hasAtoms ? _deatomize(doc.data, { strings: doc.a.s }) : doc.data;
    return this.fromMin(data);
  }
  tomindoc(v, o){ return this.toMinDoc(v, o); }
  frommindoc(d){ return this.fromMinDoc(d); }

  /* ===================== Graph Doc ===================== */
  toGraphDoc(value){
    const ctx = { idByObj:new Map(), objById:new Map(), nextId:1,
                  classIndex:new Map(), classes:[], nodes:[], edges:[], ctr:[], roots:[] };
    const seen = new Set();
    const toMin = (v)=> this._toMin(v, this._mkCtx());

    const classIndexOf = (inst)=>{
      const C = inst && inst.constructor;
      const name = (C && (C.TNAME || C.name)) || 'Object';
      const ns   = (C && (C.NS || C.namespace)) || null;
      const key  = (ns? (ns+'|') : '') + name;
      if (ctx.classIndex.has(key)) return ctx.classIndex.get(key);
      const idx = ctx.classes.length;
      ctx.classes.push([ns, name]);
      ctx.classIndex.set(key, idx);
      return idx;
    };
    const idOf = (o)=>{
      if (!o || typeof o!=='object') return null;
      if (ctx.idByObj.has(o)) return ctx.idByObj.get(o);
      const id = ctx.nextId++; ctx.idByObj.set(o, id); ctx.objById.set(id, o);
      return id;
    };
    const ctorArgsOf = (inst)=>{
      try {
        const SYM = (this?.opts?.initSym) || (globalThis?.CLASS?.__SYM_INIT) || (globalThis?.__SYM_INIT) || null;
        if (SYM && Array.isArray(inst?.[SYM])) return inst[SYM].slice();
        const C = inst?.constructor;
        if (C && typeof C.__ctorArgsOf==='function') return C.__ctorArgsOf(inst);
        if (Array.isArray(inst?.$ctorArgs)) return inst.$ctorArgs.slice();
      } catch {}
      return [];
    };

    const pushNode = (inst)=>{
      const id = idOf(inst); if (!id) return null;
      if (seen.has(id)) return id; seen.add(id);
      const ci = classIndexOf(inst);
      const props = Object.create(null);

      for (const k of Object.keys(inst)){
        const v = inst[k];
        if (isFn(v)){ props[k] = toMin(v); continue; }
        if (v==null || typeof v!=='object'){ props[k] = toMin(v); continue; }
        if (Array.isArray(v)){
          const arrIsObj = v.some(x=> x && typeof x==='object' && x.constructor !== Object);
          if (arrIsObj){
            props[k] = [];
            for (const x of v){
              if (x && typeof x==='object' && x.constructor !== Object){
                const cid = pushNode(x); ctx.edges.push([id, k, cid]);
              } else {
                (props[k] || (props[k]=[])).push(toMin(x));
              }
            }
          } else { props[k] = toMin(v); }
          continue;
        }
        const isPlain = (v.constructor===Object);
        if (isPlain){ props[k] = toMin(v); }
        else { const cid = pushNode(v); ctx.edges.push([id, k, cid]); }
      }

      ctx.nodes.push([ci, id, props]);
      const cargs = ctorArgsOf(inst);
      if (Array.isArray(cargs) && cargs.length){
        const packed = [id]; for (const a of cargs) packed.push(toMin(a));
        ctx.ctr.push(packed);
      }
      return id;
    };

    if (Array.isArray(value)){
      for (const it of value){ const rid = pushNode(it); if (rid!=null) ctx.roots.push(rid); }
    } else {
      const rid = pushNode(value); if (rid!=null) ctx.roots.push(rid);
    }

    return { v:1, cl: ctx.classes, nodes: ctx.nodes, edges: ctx.edges, ctr: ctx.ctr, roots: ctx.roots };
  }

  fromGraphDoc(doc){
    if (!isObj(doc)) return null;
    const cl = Array.isArray(doc.cl) ? doc.cl : [];
    const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
    const edges = Array.isArray(doc.edges) ? doc.edges : [];
    const ctr   = Array.isArray(doc.ctr) ? doc.ctr : [];
    const roots = Array.isArray(doc.roots) ? doc.roots : [];

    const ctor = [];
    for (let i=0;i<cl.length;i++){
      const [ns, name] = cl[i];
      let C = null;
      try {
        const G = globalThis || null;
        const K = G?.CLASS || null;
        C = K?.find?.(name, ns) || (G ? G[name] : null);
      } catch {}
      if (!C) C = Object;
      ctor[i] = C;
    }

    const byId = new Map();
    for (const tup of nodes){
      const ci = tup[0], id = tup[1];
      const C = ctor[ci] || Object;
      let init = [];
      for (const a of ctr){ if (a[0] === id){ init = a.slice(1).map(x=> this._fromMin(x, this._mkCtx())); break; } }
      let inst;
      try { inst = new C(...init); }
      catch { inst = Object.create(C && C.prototype ? C.prototype : Object.prototype); }
      byId.set(id, inst);
    }
    for (const tup of nodes){
      const id = tup[1], props = tup[2];
      const inst = byId.get(id);
      for (const k of Object.keys(props)){
        try { inst[k] = this._fromMin(props[k], this._mkCtx()); } catch {}
      }
    }
    for (const [fromId, key, toId] of edges){
      const from = byId.get(fromId);
      const to   = byId.get(toId);
      if (!from || !to) continue;
      if (Array.isArray(from[key])) from[key].push(to);
      else if (from[key] == null) from[key] = to;
      else from[key] = [from[key], to];
    }

    const arr = Array.from(byId.values());
    const ctxR = { serializer:this, doc, byId, classes: cl, ctors: ctor };
    if (this.opts.rebind){
      for (const inst of arr){ try{ inst.rebindSaved?.(); }catch{} try{ inst.afterRevive?.(ctxR); }catch{} }
    }

    if (roots.length) return roots.map(id=>byId.get(id)).filter(Boolean);
    return arr;
  }

  /* ===================== internals ===================== */
  _mkCtx(){ return { pool: !!this.opts.pool, seen:new Map(), rev:new Map(), nextId:1 }; }
  _idFor(o, ctx){
    if (!ctx.pool || !isObj(o)) return null;
    if (ctx.seen.has(o)) return ctx.seen.get(o);
    const id = ctx.nextId++; ctx.seen.set(o,id); return id;
  }
  _resolveCtor(typeName){
    if (!typeName) return null;
    if (typeName.indexOf(':')>0){
      const [ns, name] = typeName.split(':');
      try {
        const K = (globalThis?.CLASS) || null;
        return (K?.find?.(name, ns)) || globalThis?.[name] || this._ctorCache?.get?.(name) || null;
      } catch {}
    }
    if (typeName.indexOf('.')>0){
      let cur = globalThis; for (const p of typeName.split('.')) cur = cur?.[p];
      return cur || this._ctorCache?.get?.(typeName) || null;
    }
    return globalThis?.[typeName] || this._ctorCache?.get?.(typeName) || null;
  }
  _constructByType(typeStr, args){
    const C = this._resolveCtor(typeStr);
    if (typeof C === 'function'){
      try { return new C(...args.map(a=> this._fromMin(a, this._mkCtx()))); }
      catch { return Object.create(C.prototype); }
    }
    switch(typeStr){
      case 'ArrayBuffer': return new Uint8Array(args[0]||[]).buffer;
      case 'DataView': { const u8 = new Uint8Array(args[0]||[]); return new DataView(u8.buffer); }
      default: return undefined;
    }
  }
  _packFn(fn){
    if (TfunctionRegistry && typeof TfunctionRegistry.idOf==='function'){
      const id = TfunctionRegistry.idOf(fn, this.opts.ns || 'app', fn.name || `fn_${makeUid('f')}`);
      if (id) return { $fn: id };
    }
    if (this.opts.includeSourceOnSerialize){
      try { return { $fnsrc: String(fn) }; } catch {}
    }
    return { $fn: fn.name || null };
  }
  _unpackFn(marker){
    if (marker && marker.$fn && TfunctionRegistry && typeof TfunctionRegistry.resolve==='function'){
      return TfunctionRegistry.resolve(marker.$fn) || null;
    }
    if (marker && marker.$fnsrc && this.opts.allowSourceEval){
      try { /* eslint-disable no-new-func */ return (new Function(`return (${marker.$fnsrc})`))(); } catch {}
    }
    return null;
  }

  /* ----------------------------- toMin path ------------------------------- */
  _toMin(value, ctx){
    if (value===undefined) return { $undef:1 };
    if (typeof value==='number'){
      if (Number.isNaN(value)) return { $num:'NaN' };
      if (!Number.isFinite(value)) return { $num:(value>0?'Infinity':'-Infinity') };
      return value;
    }
    if (typeof value==='bigint') return { $bigint: value.toString() };
    if (isFn(value)) return this._packFn(value);
    if (value==null || typeof value!=='object') return value;

    // Skip event objects outright
    if (isEventLike(value)) return undefined;

    // Typed / Buffer
    if (typeof ArrayBuffer!=='undefined' && value instanceof ArrayBuffer){
      return { type:'ArrayBuffer', args:[ Array.from(new Uint8Array(value)) ] };
    }
    if (typeof DataView!=='undefined' && value instanceof DataView){
      return { type:'DataView', args:[ Array.from(new Uint8Array(value.buffer)) ] };
    }
    if (typeof ArrayBuffer!=='undefined' && ArrayBuffer.isView(value)){
      const name = value.constructor?.name || 'Uint8Array';
      return { type:name, args:[ Array.from(value) ] };
    }

    // DOM Element (attrs + innerHTML). Event handler attribute isimleri filtrelenir.
    if (this.opts.dom?.enabled && isElement(value)){
      const tag = value.tagName ? value.tagName.toLowerCase() : 'div';
      const attrs = {};
      if (this.opts.dom.attributes){
        for (const a of (value.attributes || [])){
          if (/^on[A-Za-z]/.test(a.name)) continue; // event attribute'larını atla
          attrs[a.name] = a.value;
        }
      }
      const html = this.opts.dom.preserveHTML ? (value.innerHTML || '') : '';
      return { type:'Element', args:[ tag, attrs, html ] };
    }

    // === Enum/Ord — kompakt marker ===
    if (isEnumInst(value) || isOrdInst(value)){
      const base   = value.$base;
      const bname  = (base && (base.TNAME || base.name)) || null;
      const val    = (typeof value.get==='function') ? value.get()
                    : (typeof value.valueOf==='function') ? value.valueOf()
                    : (value.v!=null ? value.v : value);
      const kind = isOrdInst(value) ? 'Ord' : 'Enum';
      return { type: kind, args: [ bname, val ] };
    }

    // pooling
    const id = this._idFor(value, ctx);
    if (id!=null && ctx.rev.has(id)) return { $ref:id };

    // Array
    if (isArr(value)){
      const out = value.map(v=> this._toMin(v, ctx));
      if (id!=null && !ctx.rev.has(id)) ctx.rev.set(id, out);
      return out;
    }

    // toMinJSON / toJSON (respect flags)
    if (this.opts.respectObjectMinJSON && isFn(value.toMinJSON)){
      const shaped = value.toMinJSON();
      if (id!=null && !ctx.rev.has(id)) ctx.rev.set(id, shaped);
      return shaped;
    }
    if (this.opts.respectObjectJSON && isFn(value.toJSON)){
      const shaped = value.toJSON();
      const obj = this._toMin(shaped, ctx);
      if (id!=null && !ctx.rev.has(id)) ctx.rev.set(id, obj);
      return obj;
    } else if (!this.opts.respectObjectJSON && isFn(value.toJSON) && this.opts.warnOnIgnoredObjectJSON){
      try{ console.warn('Tserializer: ignoring object.toJSON for', classNameOf(value)); }catch{}
    }

    // codec by class
    const typeName = classNameOf(value);
    if (typeName){
      const io = this.registry.get(typeName);
      if (io && isFn(io.toMin)){
        const obj = io.toMin(value, this, ctx);
        if (id!=null && !ctx.rev.has(id)) ctx.rev.set(id, obj);
        return obj;
      }
      // policy fallback (unknown clazz)
      const shaped = this._pickPropsPolicy(value, typeName);
      if (id!=null && !ctx.rev.has(id)) ctx.rev.set(id, shaped);
      return shaped;
    }

    // plain object (+ tag ipucu)
    const out = Object.create(null);
    for (const k of Object.keys(value)){
      const v = value[k];
      if (shouldSkipKey(k, v)) continue;
      out[k] = this._toMin(v, ctx);
    }
    if (id!=null && !ctx.rev.has(id)) ctx.rev.set(id, out);
    return out;
  }

  /* ---------------------------- fromMin path ------------------------------ */
  _fromMin(min, ctx){
    if (min==null || typeof min!=='object') return min;
    if ('$undef' in min) return undefined;
    if ('$bigint' in min) return BigInt(min.$bigint);
    if ('$num' in min){
      if (min.$num==='NaN') return NaN;
      if (min.$num==='Infinity') return Infinity;
      if (min.$num==='-Infinity') return -Infinity;
    }
    if ('$fn' in min || '$fnsrc' in min) return this._unpackFn(min);
    if (min.$ref!=null && ctx && ctx.rev && ctx.rev.has(min.$ref)) return ctx.rev.get(min.$ref);

    if (Array.isArray(min)) return min.map(v=> this._fromMin(v, ctx));

    if (typeof min.type === 'string' && Array.isArray(min.args)){
      // Enum/Ord codec (registry üzerinden)
      const io = this.registry.get(min.type);
      if (io && isFn(io.fromMin)){ try{ return io.fromMin(min, this, ctx); }catch{} }
      const inst = this._constructByType(min.type, min.args);
      if (inst !== undefined) return inst;
      const o = Object.create(null);
      for (const k of Object.keys(min)){ if (k!=='type') o[k] = this._fromMin(min[k], ctx); }
      return o;
    }

    const typeName = (min.$type || min.$className || null);
    if (typeName){
      const C = this._resolveCtor(typeName);
      if (C){
        const inst = Object.create(C.prototype);
        if (ctx){ const id = this._idFor(inst, ctx); if (id!=null) ctx.rev.set(id, inst); }
        for (const k of Object.keys(min)){
          if (k==='$type' || k==='$className') continue;
          const v = this._fromMin(min[k], ctx);
          _assignWithEnumOrdBind(inst, k, v);  // <-- bindTo
        }
        if (this.opts.rebind){ try{ inst.rebindSaved?.(); }catch{} try{ inst.afterRevive?.({ serializer:this }); }catch{} }
        return inst;
      }
    }

    const out = Object.create(null);
    for (const k of Object.keys(min)){
      const v = this._fromMin(min[k], ctx);
      _assignWithEnumOrdBind(out, k, v);       // <-- bindTo (plain object)
    }
    return out;
  }

  /* ===================== Builtins (incl. Enum/Ord) ===================== */
  _installBuiltins(opts){
    const reg = this.registry;
    reg.register('Date', {
      toMin: (d)=> ({ type:'Date', args:[ d.toISOString() ] }),
      fromMin: (o)=> new Date(o.args[0])
    });
    reg.register('RegExp', {
      toMin: (r)=> ({ type:'RegExp', args:[ r.source, r.flags ] }),
      fromMin: (o)=> new RegExp(o.args[0], o.args[1]||'')
    });
    if (typeof URL!=='undefined'){
      reg.register('URL', {
        toMin: (u)=> ({ type:'URL', args:[ String(u) ] }),
        fromMin: (o)=> new URL(String(o.args[0]))
      });
    }
    reg.register('Error', {
      toMin: (e)=> ({ type:'Error', args:[ e.name||'Error', e.message||'', e.stack||null ] }),
      fromMin: (o)=> { const err = new Error(o.args[1]||''); err.name=o.args[0]||'Error'; if (o.args[2]) err.stack=o.args[2]; return err; }
    });
    reg.register('Map', {
      toMin: (m, self, ctx)=> ({ type:'Map', args:[ Array.from(m.entries()).map(([k,v])=>[ self._toMin(k, ctx||self._mkCtx()), self._toMin(v, ctx||self._mkCtx()) ]) ] }),
      fromMin: (o, self, ctx)=> { const m = new Map(); for (const [k,v] of (o.args[0]||[])) m.set(self._fromMin(k, ctx||self._mkCtx()), self._fromMin(v, ctx||self._mkCtx())); return m; }
    });
    reg.register('Set', {
      toMin: (s, self, ctx)=> ({ type:'Set', args:[ Array.from(s.values()).map(v=> self._toMin(v, ctx||self._mkCtx())) ] }),
      fromMin: (o, self, ctx)=> { const s = new Set(); for (const v of (o.args[0]||[])) s.add(self._fromMin(v, ctx||self._mkCtx())); return s; }
    });
    if (typeof DOMRect!=='undefined'){
      reg.register('DOMRect', {
        toMin: (r)=> ({ type:'DOMRect', args:[ r.x, r.y, r.width, r.height ] }),
        fromMin: (o)=> { const [x,y,w,h] = o.args; try{ return new DOMRect(x,y,w,h); }catch{ return {x,y,width:w,height:h}; } }
      });
    }
    if (opts?.dom?.enabled && typeof Element!=='undefined'){
      reg.register('Element', {
        toMin: (el)=>{
          const tag = el.tagName ? el.tagName.toLowerCase() : 'div';
          const attrs = {};
          if (opts.dom.attributes){
            for (const a of (el.attributes || [])){
              if (/^on[A-Za-z]/.test(a.name)) continue;
              attrs[a.name] = a.value;
            }
          }
          const html = opts.dom.preserveHTML ? (el.innerHTML || '') : '';
          return { type:'Element', args:[ tag, attrs, html ] };
        },
        fromMin: (o)=>{
          const [tag, attrs, html] = o.args;
          const el = document.createElement(tag||'div');
          if (attrs && typeof attrs==='object'){ for (const k of Object.keys(attrs)){ try{ el.setAttribute(k, attrs[k]); }catch{} } }
          if (html) el.innerHTML = html;
          return el;
        }
      });
    }
    // === Enum/Ord codec ===
    reg.register('Enum', {
      toMin: (inst)=>{
        const base = inst.$base;
        const bname= (base && (base.TNAME || base.name)) || null;
        const val  = (inst && typeof inst.get==='function') ? inst.get()
                    : (inst && typeof inst.valueOf==='function') ? inst.valueOf()
                    : (inst && inst.v!=null ? inst.v : inst);
        return { type:'Enum', args:[ bname, val ] };
      },
      fromMin: (o)=>{
        const [baseName, v] = o.args || [];
        let base = null;
        try {
          const G = globalThis || {};
          base = (G.enums && G.enums[baseName]) || G[baseName] || null;
        } catch {}
        if (base){
          if (typeof base.makeInstance === 'function'){ try{ return base.makeInstance(v); }catch{} }
          if (typeof base.of === 'function'){ try{ return base.of(v); }catch{} }
          if (typeof base.bindTo === 'function'){ const holder={}; try{ base.bindTo(holder,'_',v); return holder._; }catch{} }
        }
        return v;
      }
    });
    reg.register('Ord', {
      toMin: (inst)=>{
        const base = inst.$base;
        const bname= (base && (base.TNAME || base.name)) || null;
        const val  = (inst && typeof inst.get==='function') ? inst.get()
                    : (inst && typeof inst.valueOf==='function') ? inst.valueOf()
                    : (inst && inst.v!=null ? inst.v : inst);
        return { type:'Ord', args:[ bname, val ] };
      },
      fromMin: (o)=>{
        const [baseName, v] = o.args || [];
        let base = null;
        try {
          const G = globalThis || {};
          base = (G.enums && G.enums[baseName]) || G[baseName] || null;
        } catch {}
        if (base){
          if (typeof base.makeInstance === 'function'){ try{ return base.makeInstance(v); }catch{} }
          if (typeof base.of === 'function'){ try{ return base.of(v); }catch{} }
          if (typeof base.bindTo === 'function'){ const holder={}; try{ base.bindTo(holder,'_',v); return holder._; }catch{} }
        }
        return v;
      }
    });
  }
});

/* ========================================================================== *
 * Atoms
 * ========================================================================== */
function _atomize(root, { minLen=4, minFreq=2 }={}){
  const counts = new Map();
  (function scan(x){
    if (x==null) return;
    if (typeof x==='string'){ counts.set(x, (counts.get(x)||0)+1); return; }
    if (typeof x!=='object') return;
    if (Array.isArray(x)){ for (const v of x) scan(v); return; }
    for (const k of Object.keys(x)){ scan(k); scan(x[k]); }
  })(root);

  const table = []; const index = new Map();
  for (const [s,c] of counts){ if (s.length>=minLen && c>=minFreq){ index.set(s, table.length); table.push(s); } }

  function tr(x){
    if (x==null) return x;
    if (typeof x==='string'){ return index.has(x) ? { $s:index.get(x) } : x; }
    if (typeof x!=='object') return x;
    if (Array.isArray(x)) return x.map(tr);
    const o = {}; for (const k of Object.keys(x)){ const nk = index.has(k) ? { $s:index.get(k) } : k; o[nk] = tr(x[k]); }
    return o;
  }
  return { table, transformed: tr(root) };
}
function _deatomize(root, { strings }={}){
  const getS = (tok)=> (tok && typeof tok==='object' && ('$s' in tok)) ? strings[tok.$s] : null;
  function tr(x){
    if (x==null) return x;
    if (typeof x==='object' && ('$s' in x) && Object.keys(x).length===1) return strings[x.$s];
    if (typeof x!=='object') return x;
    if (Array.isArray(x)) return x.map(tr);
    const o = {}; for (const k of Object.keys(x)){ const nk = getS(k) || k; o[nk] = tr(x[k]); }
    return o;
  }
  return tr(root);
}

/* ========================================================================== *
 * Kısayollar
 * ========================================================================== */
export const serializeMin   = (v)=> new Tserializer().toMin(v);
export const deserializeMin = (m)=> new Tserializer().fromMin(m);
export const serializeJSON  = (v, opts={})=> new Tserializer(opts).toJSON(v, opts);
export const deserializeJSON= (j, opts={})=> new Tserializer(opts).fromJSON(j, opts);
export const serializeGraph = (v)=> new Tserializer().toGraphDoc(v);
export const deserializeGraph= (d)=> new Tserializer().fromGraphDoc(d);
export const serializeDoc   = (v, opts={})=> new Tserializer(opts).toMinDoc(v, opts);
export const deserializeDoc = (d)=> new Tserializer().fromMinDoc(d);

export default Tserializer;

export function installSerializer(app, opts = {}){
  const service = new Tserializer(opts);
  if (app && app.setSerializer) app.setSerializer(service);
  if (app && app.use) app.use('serializer', service);
  return service;
}

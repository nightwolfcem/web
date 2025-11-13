'use strict';
// enums.js — Cem-spec unified (deep-clean)
// enums.js — hibrit enum sistemi (bitmask + ord) — proje-uyumlu (final)

const isStr = v => typeof v === 'string';
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

function normalizeDefs(defs){
  if (Array.isArray(defs)) return defs.map(String);
  if (isStr(defs)) return defs.split(/[\s,]+/).map(s=>s.trim()).filter(Boolean);
  if (isObj(defs)) return Object.keys(defs);
  throw new Error('enums.normalizeDefs: defs hatalı');
}

// ---------------- Enum (bitmask) ----------------
export function createEnum(name, defs, opts={}){
  const LABELS = normalizeDefs(defs);
  const joiner = opts.joiner || opts.sep || '+';
  const alias  = Object.assign({}, opts.aliases||{}, opts.alias||{});

  // bit map
  const map = {};
  if (isObj(defs)){ for (const k of Object.keys(defs)) map[k] = defs[k]|0; }
  let bit=1;
  for (const k of LABELS){
    if (!(k in map)){
      if (k==='none' && opts.noneZero) map[k]=0;
      else { map[k]=bit; bit<<=1; }
    }
  }
  const canon = (k)=> (k in map) ? k : (alias[k] && (alias[k] in map) ? alias[k] : k);

  // parse helpers
  const toMask = (v)=>{
    if (v && typeof v==='object' && 'mask' in v) return v.mask|0;
    if (typeof v==='number' || typeof v==='bigint') return Number(v)|0;
    if (typeof v==='string'){
      const parts = v.split(/[+|\s,]+/).map(s=>s.trim()).filter(Boolean);
      if (parts.length<=1) return (map[canon(v)]||0)|0;
      return parts.reduce((m, n)=> m | (map[canon(n)]||0), 0)|0;
    }
    if (Array.isArray(v)) return v.reduce((m, it)=> m | toMask(it), 0)|0;
    if (v && typeof v==='object'){ // { left:true, right:false, ... }
      let m=0; for(const [k,b] of Object.entries(v)){ const c=canon(k); if (b && (c in map)) m|=map[c]; } return m|0;
    }
    return 0;
  };

  // instance factory (proxied)
  function makeInstance(initial){
    let state = toMask(initial);
    function __setSmart(v){
      const m = toMask(v);
      if (m || (typeof v==='string' && v.trim()==='none')){ state = m|0; return; }
      if (typeof v==='string'){
        const curStr = proxy.toString();
        const curNumStr = String(state|0);
        let sfx = null;
        if (v.startsWith(curStr)) sfx = v.slice(curStr.length);
        else if (v.startsWith(curNumStr)) sfx = v.slice(curNumStr.length);
        if (sfx!=null){
          sfx = sfx.replace(/^[+|,\s]*/, '');
          if (sfx){
            const addMask = toMask(sfx);
            if (addMask){ state = (state|0) | addMask; return; }
          } else { return; }
        }
      }
      if (typeof v==='number' || typeof v==='bigint'){ state = Number(v)|0; return; }
    }
    const api = {};
    const handler = {
      get(t,p,r){
        if (p==='value' || p==='mask') return state|0;
        if (p==='set') return (v)=>{ __setSmart(v); return proxy; };
        if (p==='setMask') return (m)=>{ state = (m|0); return proxy; };
        if (p==='has') return (x)=> ((state & toMask(x)) === toMask(x));
        if (p==='hasAny' || p==='includes') return (x)=> ((state & toMask(x)) !== 0);
        if (p==='on') return (k)=>{ state = state | (map[canon(k)]||0); return proxy; };
        if (p==='off')return (k)=>{ state = state & ~(map[canon(k)]||0); return proxy; };
        if (p==='toggle')return (k)=>{ const b=(map[canon(k)]||0); state = (state & b) ? (state & ~b) : (state | b); return proxy; };
        if (p==='toString') return ()=>{
          if ((state|0)===0) return 'none';
          const out=[]; for (const k of LABELS){ if (k!=='none' && ((state & (map[k]||0))=== (map[k]||0))) out.push(k); }
          return out.join(joiner)||'none';
        };
        if (p==='valueOf') return ()=> state|0;
        if (p==='toMinJSON' || p==='toJSON') return ()=> ({ Tenum: state|0 });
        if (p===Symbol.toPrimitive) return (hint)=> hint==='string' ? proxy.toString() : (state|0);
        if (typeof p==='string'){
          const k = canon(p);
          if (k in map) return ((state & (map[k]||0)) === (map[k]||0));
        }
        return Reflect.get(t,p,r);
      },
      set(t,p,v,r){
        if (p==='value' || p==='mask'){ state = toMask(v); return true; }
        if (typeof p==='string'){
          const k = canon(p);
          if (k in map){ v ? (state = state | map[k]) : (state = state & ~map[k]); return true; }
        }
        return Reflect.set(t,p,v,r);
      },
      has(t,p){
        if (typeof p==='string'){
          const k = canon(p);
          if (k in map) return ((state & (map[k]||0)) === (map[k]||0));
          const n = +p; if (!Number.isNaN(n) && n!==0) return ((state & (n|0)) === (n|0));
        }
        return Reflect.has(t,p);
      },
      ownKeys(){ return [...Object.keys(api), ...LABELS]; },
      getOwnPropertyDescriptor(t,p){
        if (typeof p==='string'){
          const k = canon(p);
          if (k in map){
            return { enumerable:true, configurable:true,
              get(){ return ((state & (map[k]||0)) === (map[k]||0)); },
              set(v){ v ? (state=state|map[k]) : (state=state&~map[k]); } };
          }
        }
        return Reflect.getOwnPropertyDescriptor(t,p);
      }
    };
    const proxy = new Proxy(api, handler);
    return proxy;
  }

  // E* nesnesi
  const E = Object.create(null);
  for (const k of LABELS) Object.defineProperty(E, k, { value: map[k], enumerable:true });
  Object.defineProperty(E, 'labels', { value: LABELS.slice(), enumerable:false });
  Object.defineProperty(E, 'bitMap', { value: Object.assign({}, map), enumerable:false });
  Object.defineProperty(E, 'name', { value: String(name||'Tenum'), enumerable:false });

  E.maskOf = (...args)=> args.reduce((m, it)=> m | toMask(it), 0)|0;
  E.of     = (...keys)=> makeInstance(E.maskOf(...keys));
  E.empty  = ()=> makeInstance(0);
  E.from   = (v)=> makeInstance(v);
  E.fromMinJSON = (j)=> (j && typeof j==='object' && 'Tenum' in j) ? makeInstance(j.Tenum) : makeInstance(j);
  E.toString = ()=> `[Enum ${E.name}]`;

  E.bindTo = (obj, prop, initial)=>{
    const inst = makeInstance(initial);
    Object.defineProperty(obj, prop, {
      enumerable: true, configurable: true,
      get(){ return inst; },
      set(v){ inst.set(v); }
    });
    Object.defineProperty(inst, '$base', { value: E, enumerable: false, writable: false });
    return inst;
  };
  E.bind = (obj, prop, initial)=> E.bindTo(obj, prop, initial);
  return E;
}

// ---------------- Ord (tek değer) ----------------
export function createOrd(name, defs){
  const LABELS = normalizeDefs(defs);
  const index = new Map(LABELS.map((n,i)=>[n,i]));

  function makeInstance(initial){
    let value = LABELS.includes(initial) ? initial : LABELS[0];
    function __setSmart(v){
      if (LABELS.includes(v)){ value = v; return; }
      if (typeof v==='string'){
        const curStr = value;
        const curIdxStr = String(LABELS.indexOf(value));
        let sfx = null;
        if (v.startsWith(curStr)) sfx = v.slice(curStr.length);
        else if (v.startsWith(curIdxStr)) sfx = v.slice(curIdxStr.length);
        if (sfx!=null){
          sfx = sfx.replace(/^[+|,\s]*/, '');
          if (LABELS.includes(sfx)){ value = sfx; return; }
        }
      }
      if (typeof v==='number' && Number.isInteger(v) && v>=0 && v<LABELS.length){ value = LABELS[v]; return; }
      if (v && typeof v==='object' && 'Tord' in v){ const idx=Number(v.Tord)|0; if(idx>=0 && idx<LABELS.length){ value=LABELS[idx]; return; } }
    }
    const api = {};
    const proxy = new Proxy(api, {
      get(t,p,r){
        if (p==='value') return value;
        if (p==='set')   return (v)=>{ __setSmart(v); return proxy; };
        if (p==='next')  return ({wrap=true}={})=>{ const i=index.get(value); const j=i+1<LABELS.length?i+1:(wrap?0:i); value=LABELS[j]; return proxy; };
        if (p==='prev')  return ({wrap=true}={})=>{ const i=index.get(value); const j=i>0?i-1:(wrap?LABELS.length-1:i); value=LABELS[j]; return proxy; };
        if (p==='toString') return ()=> value;
        if (p==='valueOf')  return ()=> index.get(value);
        if (p==='toMinJSON' || p==='toJSON') return ()=> ({ Tord: index.get(value) });
        if (p===Symbol.toPrimitive) return (hint)=> hint==='string' ? value : index.get(value);
        if (typeof p==='string' && index.has(p)) return value===p;
        return Reflect.get(t,p,r);
      },
      set(t,p,v,r){
        if (p==='value'){ __setSmart(v); return true; }
        if (typeof p==='string' && index.has(p)){ if (v) value=p; return true; }
        return Reflect.set(t,p,v,r);
      },
      has(t,p){
        if (typeof p==='string' && index.has(p)) return value===p;
        const i = +p; if (!Number.isNaN(i)) return index.get(value)===i;
        return Reflect.has(t,p);
      },
      ownKeys(){ return LABELS.slice(); },
      getOwnPropertyDescriptor(t,p){
        if (typeof p==='string' && index.has(p)){
          return { enumerable:true, configurable:true,
            get(){ return value===p; },
            set(v){ if (v) value=p; } };
        }
        return Reflect.getOwnPropertyDescriptor(t,p);
      }
    });
    return proxy;
  }

  const O = Object.create(null);
  for (const k of LABELS) Object.defineProperty(O, k, { value: k, enumerable:true });
  Object.defineProperty(O, 'labels', { value: LABELS.slice(), enumerable:false });
  Object.defineProperty(O, 'name', { value: String(name||'Tord'), enumerable:false });

  O.of     = (key)=> makeInstance(key);
  O.from   = (v)=> makeInstance(v);
  O.fromMinJSON = (j)=> (j && typeof j==='object' && 'Tord' in j) ? makeInstance(LABELS[j.Tord] ?? LABELS[0]) : makeInstance(j);
  O.empty  = ()=> makeInstance(LABELS.includes('none') ? 'none' : LABELS[0]);
  O.toString = ()=> `[Ord ${O.name}]`;

  O.bindTo = (obj, prop, initial)=>{
    const inst = makeInstance(initial);
    Object.defineProperty(obj, prop, {
      enumerable:true, configurable:true,
      get(){ return inst; },
      set(v){ inst.set(v); }
    });
    Object.defineProperty(inst, '$base', { value: E, enumerable: false, writable: false });
    return inst;
  };
  O.bind = (obj, prop, initial)=> O.bindTo(obj, prop, initial);
  return O;
}

export default { createEnum, createOrd };

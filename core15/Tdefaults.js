'use strict';
// Tdefaults.js — Cem-spec unified (deep-clean, syntax-safe)
// Proje genel varsayılanları + PROFİL desteği

import CLASS from './CLASS.js'

/* ---------------- util ---------------- */
function isObj(v){ return v && typeof v === 'object' && !Array.isArray(v); }
function clone(v){ try{ return JSON.parse(JSON.stringify(v)); }catch{ return v; } }
function deepMerge(dst, src){
  if (!isObj(src)) return dst;
  for (const k of Object.keys(src)){
    const v = src[k];
    if (isObj(v)){
      if (!isObj(dst[k])) dst[k] = {};
      deepMerge(dst[k], v);
    } else {
      dst[k] = v;
    }
  }
  return dst;
}
function getPath(obj, path){
  if (!path) return obj;
  const parts = String(path).split('.').filter(Boolean);
  let cur = obj;
  for (const k of parts){
    if (!isObj(cur)) return undefined;
    cur = cur[k];
    if (cur === undefined) return undefined;
  }
  return cur;
}
function setPath(obj, path, val){
  const parts = String(path).split('.').filter(Boolean);
  let cur = obj;
  for (let i=0;i<parts.length-1;i++){
    const k = parts[i];
    if (!isObj(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length-1]] = val;
  return obj;
}

/* ---------------- defaults tree ---------------- */
const DEFAULTS = {
  version: 1,
  class: { naming: { mode: 'warn', enforceCamelAfterT: true } },
  paths: { codeSrc: '', appPath: '', overrides: {} },
  styles: {
    loadFiles: [],
    json: {},
    classStyles: { Telement: '' }
  },
  serializer: {
    includeClasses: ['Telement', 'Tlayer'],
    excludeProps: { Telement: ['el','dom','__proxy__'], Tlayer: ['el','dom'] },
    custom: {}
  },
  history: {
    mode: 'optOut',
    elementOnly: true,
    domTrack: false,
    includeClasses: ['Telement','Tlayer'],
    excludeProps: { Telement: ['el','dom','__proxy__'], Tlayer: ['el','dom'] }
  },
  namespaces: { },
  app: {
    class: {}, history: {}, serializer: {}, styles: {}, paths: {},
    profiles: { },
    activeProfile: ''
  }
};

/* ---------------- Tdefaults ---------------- */
export const Tdefaults = CLASS(class Tdefaults {
  constructor(seed = {}){
    this.tree = clone(DEFAULTS);
    if (isObj(seed)) deepMerge(this.tree, seed);
    this.sources = [];
  }

  // basic API
  get(path, def){ const v = getPath(this.tree, path); return v === undefined ? def : clone(v); }
  set(path, val){ setPath(this.tree, path, val); return this; }
  has(path){ return getPath(this.tree, path) !== undefined; }
  all(){ return clone(this.tree); }
  merge(obj){ if (isObj(obj)) deepMerge(this.tree, obj); return this; }

  // profile API
  setActiveProfile(name=''){ this.set('app.activeProfile', String(name||'')); return this; }
  getActiveProfile(){ return this.get('app.activeProfile', '') || ''; }
  getProfile(name){
    const n = (name==null || name==='') ? this.getActiveProfile() : String(name);
    return this.get(`app.profiles.${n}`);
  }
  addProfile(name, obj){
    if (!name || !isObj(obj)) return this;
    const key = `app.profiles.${String(name)}`;
    this.set(key, obj);
    return this;
  }
  useProfile(name, { merge = true } = {}){
    const n = String(name||'');
    const obj = this.get(`app.profiles.${n}`);
    if (!obj) return this;
    this.setActiveProfile(n);
    if (merge) this.merge(obj);
    return this;
  }

  // loader (json/js or plain object)
  async load(urlOrObj, opts = {}){
    if (isObj(urlOrObj)){ this.merge(urlOrObj); return { ok:true, type:'object' }; }
    const url = String(urlOrObj||'').trim();
    if (!url) return { ok:false, err:'empty url' };
    const type = opts.type || (url.endsWith('.json') ? 'json' : url.endsWith('.js') ? 'js' : 'auto');
    try{
      let data = null;
      if (type === 'json' || type === 'auto'){
        if (typeof fetch !== 'function') throw new Error('fetch unavailable');
        const res = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
        this.merge(data);
        this.sources.push({ url, type:'json', ok:true });
        return { ok:true, type:'json' };
      }
      if (type === 'js'){
        const mod = await import(/* @vite-ignore */ url);
        data = (mod && (mod.default || mod.defaults || mod.config)) || mod;
        if (data) this.merge(data);
        this.sources.push({ url, type:'js', ok:true });
        return { ok:true, type:'js' };
      }
    } catch(err){
      this.sources.push({ url: urlOrObj, type, ok:false, err: String(err) });
      return { ok:false, err: String(err) };
    }
    return { ok:false, err:'unknown loader type' };
  }

  // layered merge helpers
  mergeLayers(ns, key, profileName=''){
    const g = this.get(key);
    const n = ns ? this.get(`namespaces.${ns}.${key}`) : {};
    const a = this.get(`app.${key}`);
    const pName = profileName || this.getActiveProfile();
    const p = pName ? this.get(`app.profiles.${pName}.${key}`) : {};
    const out = {};
    deepMerge(out, g); deepMerge(out, n); deepMerge(out, a); deepMerge(out, p);
    return out;
  }
  getHistoryPolicy(ns, profile){ return this.mergeLayers(ns, 'history', profile); }
  getSerializerPolicy(ns, profile){ return this.mergeLayers(ns, 'serializer', profile); }
  getStyles(ns, profile){ return this.mergeLayers(ns, 'styles', profile); }

  // application helpers (optional targets)
  applyToHistory(history, ns='', profile=''){
    const pol = this.getHistoryPolicy(ns, profile);
    if (!history || typeof history !== 'object') return this;
    Object.assign(history, pol);
    return this;
  }
  applyToSerializer(serializer, ns='', profile=''){
    const pol = this.getSerializerPolicy(ns, profile);
    if (!serializer || typeof serializer !== 'object') return this;
    Object.assign(serializer, pol);
    return this;
  }
  applyToGlobals(G){
    if (!G || typeof G !== 'object') return this;
    G.defaults = this.all();
    return this;
  }

  // serialization
static fromMinJSON(doc){
    const seed = doc?.a?.[0] || {};
    return new Tdefaults(seed);
  }
});

export { deepMerge, clone, isObj };
export default Tdefaults;

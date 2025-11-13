'use strict';
// Tpersist.js — Cem-spec unified (deep-clean)
// Tpersist.js — kalıcı depolama katmanı (localStorage / IndexedDB / File)
// CLASS tabanlı, serializer ile çalışır; ThistoryManager commit'inden autosave destekler
// MODE=ADV | NO_MIN | CLASS-PRESERVE | NS=persist
import CLASS from './CLASS.js'
import { Tevents } from './Tevents.js';
import { isObj, isStr } from './utils.js';
import Tserializer from './Tserializer.js'

/* ================= helpers ================= */
function _key(ns, name){ return `${String(ns||'app')}:${String(name||'default')}`; }
function _now(){ return Date.now(); }
function _debounce(fn, ms){
  let t=null;
  return function(...a){
    if (t) clearTimeout(t);
    t = setTimeout(()=>{ t=null; try{ fn.apply(this,a); }catch{} }, ms|0);
  };
}
function _downloadJSON(filename, data){
  try{
    const blob = new Blob([ JSON.stringify(data,null,2) ], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'data.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }catch{ return false; }
}

/* ================= IndexedDB mini-utils ================= */
function idbOpen(dbName, storeName){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(String(dbName||'Tpersist'), 1);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
    };
    req.onsuccess = ()=> resolve({ db: req.result, store: storeName });
    req.onerror = ()=> reject(req.error);
  });
}
async function idbPut(dbName, storeName, key, value){
  const { db, store } = await idbOpen(dbName, storeName);
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    const req = st.put(value, key);
    req.onsuccess = ()=> resolve(true);
    req.onerror = ()=> reject(req.error);
    tx.oncomplete = ()=> db.close();
  });
}
async function idbGet(dbName, storeName, key){
  const { db, store } = await idbOpen(dbName, storeName);
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(store, 'readonly');
    const st = tx.objectStore(store);
    const req = st.get(key);
    req.onsuccess = ()=> resolve(req.result||null);
    req.onerror = ()=> reject(req.error);
    tx.oncomplete = ()=> db.close();
  });
}
async function idbDelete(dbName, storeName, key){
  const { db, store } = await idbOpen(dbName, storeName);
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    const req = st.delete(key);
    req.onsuccess = ()=> resolve(true);
    req.onerror = ()=> reject(req.error);
    tx.oncomplete = ()=> db.close();
  });
}
async function idbKeys(dbName, storeName){
  const { db, store } = await idbOpen(dbName, storeName);
  return new Promise((resolve, reject)=>{
    const keys = [];
    const tx = db.transaction(store, 'readonly');
    const st = tx.objectStore(store);
    const req = st.openCursor();
    req.onsuccess = (e)=>{
      const cursor = e.target.result;
      if (cursor){ keys.push(cursor.key); cursor.continue(); }
      else resolve(keys);
    };
    req.onerror = ()=> reject(req.error);
    tx.oncomplete = ()=> db.close();
  });
}

/* ================= Tpersist ================= */
export const Tpersist = CLASS(class Tpersist extends CLASS.extends(Tevents) {
  /**
   * @param {object} opts
   *  - ns: namespace/key prefix (default 'app')
   *  - storage: 'local' | 'idb' (default 'local')
   *  - idbName: IndexedDB DB adı (default 'Tpersist')
   *  - idbStore: object store adı (default 'docs')
   *  - minimize: serializer.toMinDoc kullan (default true)
   *  - history: ThistoryManager; autosave için dinlenebilir
   *  - autosave: false|true (default false)
   *  - debounceMs: autosave debounce süresi (default 600ms)
   *  - S: serializer override (default import serializer)
   */
  constructor(opts={}){
    super();
    const {
      ns='app',
      storage='local',
      idbName='Tpersist',
      idbStore='docs',
      minimize=true,
      history=null,
      autosave=false,
      debounceMs=600,
      S=null
    } = opts||{};

    this.ns = String(ns||'app');
    this.storage = (storage==='idb') ? 'idb' : 'local';
    this.idbName = String(idbName||'Tpersist');
    this.idbStore = String(idbStore||'docs');
    this.minimize = !!minimize;
    this.history = history || null;
    this.serializer = S || serializer;

    this._autosaveOn = false;
    this._debouncedSave = _debounce((name, obj, meta)=> this.save(name, obj, meta), debounceMs|0||0);
  }

  setHistory(h){ this.history = h||null; return this; }
  setSerializer(S){ if (S) this.serializer = S; return this; }
  setStorage(kind){ this.storage = (kind==='idb') ? 'idb' : 'local'; return this; }
  setNamespace(ns){ this.ns = String(ns||'app'); return this; }

  /* ---------- snapshot ---------- */
  snapshot(obj, meta={}){
    const S = this.serializer;
    const root = obj;
    let doc = null;
    try{
      if (this.minimize && S && S.toMinDoc) doc = S.toMinDoc(root, { minimize:true });
      else if (S && S.toDoc) doc = S.toDoc(root);
    }catch(e){
      this.emit('error', { op:'snapshot', error:e });
      return null;
    }
    if (!doc) return null;
    // hafif meta ekle
    const out = { __meta:{ ts:_now(), ...meta }, doc };
    return out;
  }

  /* ---------- save/load/delete/list ---------- */
  async save(name, obj, meta={}){
    const key = _key(this.ns, name);
    const payload = this.snapshot(obj, meta);
    if (!payload) return false;
    try{
      if (this.storage==='idb'){
        await idbPut(this.idbName, this.idbStore, key, payload);
      } else {
        localStorage.setItem(key, JSON.stringify(payload));
      }
      this.emit('save', { key, meta:payload.__meta });
      return true;
    }catch(e){
      this.emit('error', { op:'save', error:e, key });
      return false;
    }
  }

  async load(name, { revive=true, ctx={} } = {}){
    const key = _key(this.ns, name);
    let payload = null;
    try{
      if (this.storage==='idb'){
        payload = await idbGet(this.idbName, this.idbStore, key);
      } else {
        const s = localStorage.getItem(key);
        payload = s ? JSON.parse(s) : null;
      }
    }catch(e){
      this.emit('error', { op:'load', error:e, key });
      return null;
    }
    if (!payload) return null;
    if (!revive) return payload;
    try{
      const S=this.serializer;
      const obj = (S.fromMinDoc ? S.fromMinDoc(payload.doc, ctx||{}) : (S.fromDoc ? S.fromDoc(payload.doc, ctx||{}) : null));
      this.emit('load', { key, meta:payload.__meta });
      return obj;
    }catch(e){
      this.emit('error', { op:'revive', error:e, key });
      return null;
    }
  }

  async delete(name){
    const key = _key(this.ns, name);
    try{
      if (this.storage==='idb'){
        await idbDelete(this.idbName, this.idbStore, key);
      } else {
        localStorage.removeItem(key);
      }
      this.emit('delete', { key });
      return true;
    }catch(e){
      this.emit('error', { op:'delete', error:e, key });
      return false;
    }
  }

  async list(){
    try{
      if (this.storage==='idb'){
        const keys = await idbKeys(this.idbName, this.idbStore);
        return keys.filter(k=> String(k).startsWith(this.ns+':')).map(k=> String(k).slice(this.ns.length+1));
      } else {
        const out=[]; for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if (String(k).startsWith(this.ns+':')) out.push(String(k).slice(this.ns.length+1)); }
        return out;
      }
    }catch{ return []; }
  }

  /* ---------- file import/export ---------- */
  exportToFile(name, obj, { filename=null, meta={} } = {}){
    const payload = this.snapshot(obj, meta);
    if (!payload) return false;
    const fn = filename || `${this.ns}-${String(name)}.json`;
    return _downloadJSON(fn, payload);
  }
  async importFromFile(file, { revive=true, ctx={} } = {}){
    if (!file) return null;
    const text = await file.text();
    let payload=null;
    try{ payload = JSON.parse(text); }catch{ payload=null; }
    if (!payload) return null;
    if (!revive) return payload;
    try{
      const S=this.serializer;
      return (S.fromMinDoc ? S.fromMinDoc(payload.doc, ctx||{}) : (S.fromDoc ? S.fromDoc(payload.doc, ctx||{}) : null));
    }catch{ return null; }
  }

  /* ---------- autosave ---------- */
  autosaveOn(history, { name='autosave', source=null } = {}){
    const H = history || this.history;
    if (!H || this._autosaveOn) return false;
    const handler = (e)=>{
      try{
        const obj = source || e?.payloadRoot || null;
        // kaynağı dışarıdan ver; yoksa kullanıcı save çağrısında obj gönderir
        this._debouncedSave(name, obj, { reason:'autosave' });
      }catch{}
    };
    this._autosaveHandler = handler;
    H.on('commit', handler);
    this._autosaveOn = true;
    this.emit('autosave:on', { name });
    return true;
  }
  autosaveOff(){
    const H = this.history;
    if (!H || !this._autosaveOn) return false;
    try{ H.off('commit', this._autosaveHandler); }catch{}
    this._autosaveOn = false; this._autosaveHandler = null;
    this.emit('autosave:off');
    return true;
  }

  /* ---------- serialization ---------- */
exportJSON(model, ctx = { captureEvents: true }){

      if (!model) return null;
      try {
        if (typeof Tserializer !== 'undefined' && Tserializer){
          if (typeof Tserializer.toJSON_withEvents === 'function'){
            return Tserializer.toJSON_withEvents(model, ctx);
          }
          if (typeof Tserializer.toJSON === 'function'){
            return Tserializer.toJSON(model, ctx);
          }
        }
      } catch {}
      // fallback: shallow clone
      return (typeof model === 'object') ? { ...model } : model;
    
}


  importJSON(data, ctx = {}){

      if (data == null) return data;
      try {
        if (typeof Tserializer !== 'undefined' && Tserializer){
          if (typeof Tserializer.fromJSON_withEvents === 'function'){
            return Tserializer.fromJSON_withEvents(data, ctx);
          }
          if (typeof Tserializer.fromJSON === 'function'){
            return Tserializer.fromJSON(data, ctx);
          }
        }
      } catch {}
      // fallback: return data as-is
      return data;
    
}


  saveToStorage(key, model, ctx = { captureEvents: true }, storage){

      const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!key || !store) return false;
      const min = this.exportJSON(model, ctx);
      const str = toJson(min);
      try { store.setItem(key, str); return true; } catch { return false; }
    
}


  loadFromStorage(key, ctx = {}, storage){

      const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!key || !store) return null;
      let str = null;
      try { str = store.getItem(key); } catch { str = null; }
      if (!str) return null;
      const data = fromJson(str);
      return this.importJSON(data, ctx);
    
}


  toBlob(model, ctx = { captureEvents: true }){

      try {
        const data = this.exportJSON(model, ctx);
        const text = toJson(data) || '';
        return new Blob([text], { type: 'application/json' });
      } catch { return null; }
    
}


  fromText(text, ctx = {}){

      const data = fromJson(text);
      return this.importJSON(data, ctx);
    
}


  setSchema(v){
 if (Number.isInteger(v) && v>0) this.schemaVersion = v; return this; 
}


  registerMigration(from, to, fn){

      if (!Number.isInteger(from) || !Number.isInteger(to) || typeof fn!=='function') return this;
      this.migrations.set(`${from}->${to}`, fn);
      return this;
    
}


  migrate(min, from, to){

      if (!min || !Number.isInteger(from) || !Number.isInteger(to) || from===to) return min;
      const step = from < to ? 1 : -1;
      let cur = from;
      let data = min;
      while (cur !== to){
        const next = cur + step;
        const k = `${cur}->${next}`;
        const fn = this.migrations.get(k);
        if (typeof fn === 'function'){
          try { data = fn(data) ?? data; } catch {}
        }
        cur = next;
      }
      return data;
    
}
});

export default  Tpersist ;
const Serializer = new Tserializer();
const serializer = Serializer;

export function installPersist(app, opts = {}){
  const service = new Tpersist(opts);
  if (app && app.setPersist) app.setPersist(service);
  if (app && app.use) app.use('persist', service);
  const h = app && app.get && app.get('history');
  if (h && service && service.autosave && h.on){
    h.on('change', ()=> { if (service.save) service.save(app); });
  }
  return service;
}

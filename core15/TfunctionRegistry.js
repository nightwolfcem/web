'use strict';
/*
 * TfunctionRegistry.js — TEK SINIF, APPEND’SİZ, TAM ENTEGRASYON  :contentReference[oaicite:0]{index=0}
 * - Anahtar biçimi: "ns:name" (namespace + ad)
 * - Çakışma politikası: 'suffix' | 'warn' | 'error'
 * - Çift yönlü haritalar (name <-> fn), meta (tags/ver/hash)
 * - Serializer köprüsü: pack/unpack {$fn:'ns:name'} (+ isteğe bağlı kaynak geri yükleme)
 * - Modül toplu kayıt (registerModule), snapshot/restore, reserve/unreserve
 * - Statik ID kaydı: "fn:ns:name:seq" ile global lookup (eski append API’lerinin birebir karşılığı)
 */

import { isFn, isStr, isObj, makeUid, defineHidden } from './utils.js';

export class TfunctionRegistry {
  /* =======================
   *  STATİK ALANLAR (append’in sınıf içi karşılığı)
   * ======================= */
  static ___mapById  = new Map();     // "fn:ns:name:seq" -> fn
  static ___mapByKey = new Map();     // "ns:name"        -> "fn:ns:name:seq"
  static ___byFn     = new WeakMap(); // fn               -> id
  static ___seq      = 0;             // artan id sayacı
  static __nsSingletons = new Map();  // ns -> TfunctionRegistry (singleton)

  /* =======================
   *  OLUŞTURUCU
   * ======================= */
  constructor(opts = {}){
    this.opts = Object.assign({
      namespace: 'core',
      collision: 'suffix',        // 'suffix' | 'warn' | 'error'
      allowSource: false,         // $fnsrc derleme (güvenlik için varsayılan kapalı)
      includeSourceOnSerialize: false
    }, opts||{});

    this._byName   = new Map();     // "ns:name" -> function
    this._byFn     = new WeakMap(); // function  -> "ns:name"
    this._meta     = new Map();     // "ns:name" -> { ns,tags,ver,hash }
    this._reserved = new Set();     // geçici rezervasyonlar
  }

  /* ================= keys & namespace ================= */
  ns(){ return this.opts.namespace; }
  setNamespace(ns){
    this.opts.namespace = String(ns || this.opts.namespace || 'core');
    return this;
  }

  key(name, ns = this.ns()){
    const n = String(name||'').trim();
    if (!n) return '';
    if (n.includes(':')) return n; // zaten tam nitelikli
    const s = String(ns||'').trim();
    return s ? `${s}:${n}` : n;
  }

  split(full){
    const k = String(full||'');
    const i = k.indexOf(':');
    return (i>0) ? { ns:k.slice(0,i), name:k.slice(i+1) } : { name:k };
  }

  reserve(name, ns){ this._reserved.add(this.key(name, ns)); return this; }
  unreserve(name, ns){ this._reserved.delete(this.key(name, ns)); return this; }

  _uniqueKey(baseName, ns){
    const base   = String(baseName || ('fn_' + makeUid('f')));
    const prefix = ns ? `${ns}:` : '';
    let attempt  = prefix + base;
    let i = 1;
    while (this._byName.has(attempt) || this._reserved.has(attempt)){
      i += 1;
      attempt = `${prefix}${base}-${i.toString(36)}`;
    }
    return attempt;
  }

  /* ================= temel işlemler (INSTANCE) ================= */
  has(name, ns){ return this._byName.has(this.key(name, ns)); }

  get(name, ns){
    const k = this.key(name, ns);
    return this._byName.get(k) || null;
  }

  getByName(a, b){ return this.get(a, b); } // alias

  delete(name, ns){
    const k = this.key(name, ns);
    const fn = this._byName.get(k);
    if (!fn) return false;
    this._byName.delete(k);
    this._meta.delete(k);
    try{ this._byFn.delete(fn); }catch{}
    return true;
  }

  nameOf(fn){
    if (!isFn(fn)) return null;
    return this._byFn.get(fn) || fn.name || null;
  }

  /** register(ns,name,fn) | register('ns:name', fn) | register(fn) -> "ns:name" */
  register(a, b, c){
    let full, fn;
    if (isStr(a) && isStr(b) && isFn(c)){
      full = this.key(b, a); fn = c;
    } else if (isStr(a) && isFn(b)){
      const p = this.split(a); full = this.key(p.name, p.ns||this.ns()); fn = b;
    } else if (isFn(a)){
      full = this._uniqueKey(null, this.ns()); fn = a;
    } else {
      throw new TypeError('TfunctionRegistry.register: geçersiz argüman');
    }

    if (this._byName.has(full)){
      const old = this._byName.get(full);
      if (old === fn){ // aynı fonksiyonu yeniden bağlama
        this._byFn.set(fn, full);
        return full;
      }
      const mode = this.opts.collision;
      if (mode === 'error') throw new Error(`TfunctionRegistry: name collision ${full}`);
      if (mode === 'warn'){ try{ console.warn('TfunctionRegistry: overwrite', full); }catch{} }
      if (mode === 'suffix'){
        const sp = this.split(full);
        full = this._uniqueKey(sp.name, sp.ns||this.ns());
      }
    }

    this._byName.set(full, fn);
    this._byFn.set(fn, full);

    // meta
    const meta = Object.assign(
      { ns: this.split(full).ns || this.ns(), tags:[], ver:'1', hash:this._fingerprint(fn) }
    );
    this._meta.set(full, meta);
    return full;
  }

  set(idOrKey, fn){
    if (!isStr(idOrKey) || !isFn(fn)) throw new TypeError('set("ns:name", fn) bekler');
    const full = idOrKey.includes(':') ? idOrKey : this.key(idOrKey);
    this._byName.set(full, fn);
    this._byFn.set(fn, full);
    return full;
  }

  resolve(a, b){
    let full;
    if (isStr(a) && isStr(b)) full = this.key(b, a);
    else if (isStr(a)) full = a.includes(':') ? a : this.key(a);
    else return null;
    return this._byName.get(full) || null;
  }

  idOf(fn){ return this._byFn.get(fn) || null; }

  remove(a, b){ return this.delete(a, b); }

  list(filterNs=null){
    const out=[]; const pref = filterNs ? `${filterNs}:` : null;
    for (const k of this._byName.keys()){
      if (!pref || k.startsWith(pref)) out.push(k);
    }
    return out;
  }

  entries(){ return Array.from(this._byName.entries()); }

  tag(name, tags=[]){
    const full = this.key(name);
    const m = this._meta.get(full) || { ns:this.ns(), tags:[], ver:'1' };
    const set = new Set([...(m.tags||[]), ...(Array.isArray(tags)?tags:[]) ]);
    m.tags = Array.from(set);
    this._meta.set(full, m);
    return this;
  }

  bump(name){
    const full = this.key(name);
    const m = this._meta.get(full) || { ns:this.ns(), tags:[], ver:'1' };
    const v = parseInt(m.ver||'1', 10);
    m.ver = String(isNaN(v) ? 2 : v+1);
    this._meta.set(full, m);
    return m.ver;
  }

  registerModule(mod, { ns=null, prefix='', filter=null } = {}){
    const out = [];
    for (const k of Object.keys(mod||{})){
      const v = mod[k];
      if (!isFn(v)) continue;
      if (prefix && !k.startsWith(prefix)) continue;
      if (filter && filter(k, v) === false) continue;
      out.push(this.register(ns||this.ns(), k, v));
    }
    return out;
  }

  snapshot({ ns=null } = {}){
    const items = [];
    for (const [name] of this._byName.entries()){
      const meta = this._meta.get(name) || {};
      if (ns && meta.ns !== ns) continue;
      items.push({ name, meta });
    }
    return { v:1, ns: this.ns(), items };
  }

  restore(snap){
    if (!(snap && typeof snap==='object')) return this;
    for (const it of (snap.items||[])){
      this._meta.set(it.name, Object.assign({ ns:this.ns(), tags:[], ver:'1' }, it.meta||{}));
    }
    return this;
  }

  /* ================= serializer köprüsü ================= */
  pack(fn, ns=null){
    if (!isFn(fn)) return null;
    const name = this.nameOf(fn) || this.register(ns||this.ns(), fn.name || ('fn_'+makeUid('f')), fn);
    const marker = { $fn: name };
    if (this.opts.includeSourceOnSerialize){
      try { marker.$fnsrc = String(fn); } catch {}
    }
    return marker;
  }

  unpack(marker){
    if (!marker || typeof marker!=='object') return null;
    if (marker.$fn) return this.get(marker.$fn);
    if (marker.$fnsrc && this.opts.allowSource){
      try {
        // eslint-disable-next-line no-new-func
        const fn = (new Function(`return (${marker.$fnsrc})`))();
        return isFn(fn) ? (this.register(fn), fn) : null;
      } catch { return null; }
    }
    return null;
  }
/* ================= private ================= */
  _fingerprint(fn){
    try {
      const s = String(fn);
      let h = 0; for (let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; }
      return (h>>>0).toString(36);
    } catch { return null; }
  }

  /* =======================
   *  STATİK (SINIF) API — eski append’in birebir yerleşik karşılığı
   * ======================= */

  /** ns bazlı singleton */
  static forNs(ns){
    ns = String(ns||'core');
    if (!this.__nsSingletons.has(ns)) this.__nsSingletons.set(ns, new TfunctionRegistry({ namespace: ns }));
    return this.__nsSingletons.get(ns);
  }

  /** register(ns,name,fn) | register('ns:name', fn) | register(fn) -> id "fn:ns:name:seq" */
  static register(a, b, c){
    let ns, name, fn;
    if (isStr(a) && isStr(b) && isFn(c)){ ns=a; name=b; fn=c; }
    else if (isStr(a) && isFn(b)){ const s=a; const i=s.indexOf(':'); ns = i>0 ? s.slice(0,i) : 'core'; name = i>0 ? s.slice(i+1) : s; fn=b; }
    else if (isFn(a)){ ns='core'; name='fn_'+makeUid('f'); fn=a; }
    else { throw new TypeError('TfunctionRegistry.register: argümanları denetle'); }

    const key = `${ns}:${name}`;
    let id = this.___mapByKey.get(key);
    if (!id){ id = `fn:${ns}:${name}:${++this.___seq}`; this.___mapByKey.set(key, id); }
    this.___mapById.set(id, fn);
    this.___byFn.set(fn, id);
    return id;
  }

  /** getById("fn:ns:name:seq") -> fn|null; "ns:name" string'i de fallback olarak destekler */
  static getById(id){
    const v = this.___mapById.get(id);
    if (v != null) return v;
    if (typeof id === 'string' && id.includes(':')){
      const nid = this.___mapByKey.get(id);
      return nid != null ? (this.___mapById.get(nid) || null) : null;
    }
    return null;
  }

  /** get(ns,name) -> fn|null */
  static get(ns, name){
    const key = `${ns}:${name}`;
    const id  = this.___mapByKey.get(key);
    return id ? (this.___mapById.get(id) || null) : null;
  }
  static getByName(ns, name){ return this.get(ns, name); }

  /** resolve(ref) — function | "fn:..." id | "ns:name" | {$:'fn', ns, name} */
  static resolve(ref){
    if (typeof ref === 'function') return ref;
    if (ref == null) return null;
    if (typeof ref === 'string'){
      if (ref.startsWith('fn:')) return this.getById(ref);
      if (ref.includes(':')){ const i=ref.indexOf(':'); return this.get(ref.slice(0,i)||'core', ref.slice(i+1)); }
      return null;
    }
    if (typeof ref === 'object' && ref.$ === 'fn'){
      const { ns, name } = ref;
      return this.get(ns, name);
    }
    return null;
  }

  /** registerIfAbsent(ns,name,fn) -> id (aynı fn için aynı id) */
  static registerIfAbsent(ns, name, fn){
    if (!isFn(fn)) return null;
    const key = `${ns||'core'}:${name || fn.name || ('fn_'+makeUid('f'))}`;
    if (this.___byFn.has(fn)) return this.___byFn.get(fn);
    const existing = this.___mapByKey.get(key);
    if (existing != null){
      this.___mapById.set(existing, fn);
      this.___byFn.set(fn, existing);
      return existing;
    }
    return this.register(ns||'core', name || fn.name || ('fn_'+makeUid('f')), fn);
  }

  /** fn -> id | null */
  static idOf(fn){
    return this.___byFn.get(fn) || null;
  }

  /** list(ns?) -> ["ns:name", ...] */
  static list(ns){
    const out=[]; const pref = ns ? `${ns}:` : null;
    this.___mapByKey.forEach((id, key)=>{ if (!pref || key.startsWith(pref)) out.push(key); });
    return out;
  }

  /** Minimal snapshot (id haritası) */
  static toMinJSON(){
    const map = {};
    this.___mapByKey.forEach((id, key)=>{ map[key] = id; });
    return { map };
  }
  static fromMinJSON(min){
    if (!min || !min.map) return this;
    for (const k of Object.keys(min.map)){
      const id = min.map[k];
      if (!this.___mapByKey.get(k)) this.___mapByKey.set(k, id);
      if (!this.___mapById.get(id)) this.___mapById.set(id, null);
    }
    return this;
  }
}

/* ================= Singleton’ı opsiyonel global’e yayımla (uyumluluk) ================= */
try{
  if (typeof globalThis !== 'undefined' && !globalThis.TfunctionRegistry){
    const inst = new TfunctionRegistry({ namespace:'core' });
    defineHidden(globalThis, 'TfunctionRegistry', inst);
  }
}catch{}

export default TfunctionRegistry;

'use strict';
// Tglobals.js — Cem-spec unified (deep-clean)
// Tglobals.js — global yönetici + PROFİL desteği (harmonize, camelCase)

import CLASS from './CLASS.js'
import { Tevents } from './Tevents.js';
import Tdefaults, { deepMerge, isObj } from './Tdefaults.js';

function joinUrl(base, path){
  try { return String(new URL(path, base)); } catch { return (base||'') + path; }
}

export const Tglobals = CLASS(class Tglobals extends Tevents {
  constructor(opts = {}){
    super(opts);
    this.baseUrl = opts.baseUrl || (typeof document!=='undefined' ? document.baseURI : '');
    this.codeSrc = opts.codeSrc || '';
    this.appPath = opts.appPath || '';
    this.ns = opts.ns || 'app';

    this.d = new Tdefaults(opts.defaults || {});
    this.d.merge({ paths: { codeSrc: this.codeSrc, appPath: this.appPath } });

    this.dapi = {
      get: (path, def)=> this.d.get(path, def),
      set: (path, val)=> (this.d.set(path, val), val),
      merge: (obj)=> (this.d.merge(obj), this.d.all()),
      getHistoryPolicy: (ns)=> this.getHistoryPolicy(ns)
    };

    const gNaming = this.d.get('class.naming');
    if (gNaming) CLASS.options('naming', gNaming);

    const active = opts.profile || this.d.getActiveProfile();
    if (active) this.setProfile(active);

    this.emit?.('ready', { baseUrl: this.baseUrl, codeSrc: this.codeSrc, appPath: this.appPath, profile: this.getActiveProfile() });
  }

  async init(opts = {}){
    if (opts.baseUrl) this.baseUrl = String(opts.baseUrl);
    if (opts.codeSrc) this.codeSrc = String(opts.codeSrc);
    if (opts.appPath) this.appPath = String(opts.appPath);
    if (opts.ns) this.ns = String(opts.ns);

    if (isObj(opts.paths)) this.d.merge({ paths: opts.paths });
    if (isObj(opts.app)) this.d.merge({ app: opts.app });

    if (opts.profile != null) this.setProfile(String(opts.profile));
    this.applyClassOptions(this.ns, opts.classOptions);

    if (opts.loadDefaults){
      await this.loadDefaults({ fromApp:true, fromCode:true, ...(isObj(opts.loadDefaults)?opts.loadDefaults:{}) });
    }
    this.emit?.('init', { profile: this.getActiveProfile() });
    return this;
  }

  // ---- PROFİL API
  setProfile(name=''){
    this.d.setActiveProfile(String(name||''));
    // sınıf adlandırmasını profilden gelenle yeniden uygula
    this.applyClassOptions(this.ns);
    this.emit?.('profile', { active: this.getActiveProfile() });
    return this.getActiveProfile();
  }
  getActiveProfile(){ return this.d.getActiveProfile(); }

  // ---- katman birleştirici
  _mergeLayers(ns, key){
    const pName = this.getActiveProfile();
    const g = this.d.get(key);
    const n = ns ? this.d.get(`namespaces.${ns}.${key}`) : {};
    const a = this.d.get(`app.${key}`);
    const p = pName ? this.d.get(`app.profiles.${pName}.${key}`) : {};
    const out = {};
    deepMerge(out, g); deepMerge(out, n); deepMerge(out, a); deepMerge(out, p);
    return out;
  }

  registerNamespace(ns, patch){
    if (!ns) return;
    const cur = this.d.get(`namespaces.${ns}`);
    const merged = isObj(patch) ? deepMerge(cur||{}, patch) : cur;
    this.d.set(`namespaces.${ns}`, merged);
    return merged;
  }

  applyClassOptions(ns, runtimeOpt){
    const pName = this.getActiveProfile();
    const g = this.d.get('class');
    const n = ns ? this.d.get(`namespaces.${ns}.class`) : {};
    const a = this.d.get('app.class');
    const p = pName ? this.d.get(`app.profiles.${pName}.class`) : {};
    const cfg = {}; deepMerge(cfg, g); deepMerge(cfg, n); deepMerge(cfg, a); deepMerge(cfg, p);
    if (cfg.naming){
      CLASS.options('naming', g.naming||{});
      const mid = {}; deepMerge(mid, n.naming||{}); deepMerge(mid, a.naming||{}); deepMerge(mid, p.naming||{});
      CLASS.appOptions('naming', mid);
    }
    if (isObj(runtimeOpt) && runtimeOpt.naming) CLASS.runtimeOptions('naming', runtimeOpt.naming);
    return cfg;
  }

  // ---- policy köprüleri
  getHistoryPolicy(ns){ return this._mergeLayers(ns||this.ns, 'history'); }
  getSerializerPolicy(ns){ return this._mergeLayers(ns||this.ns, 'serializer'); }
  getStyles(ns){ return this._mergeLayers(ns||this.ns, 'styles'); }

  // ---- path çözümleri
  resolvePath(alias, fallback=''){
    const appOv = this.d.get('app.paths.overrides');
    if (alias in (appOv||{})) return appOv[alias];
    const globOv = this.d.get('paths.overrides');
    if (alias in (globOv||{})) return globOv[alias];
    if (alias === 'codeSrc') return this.d.get('paths.codeSrc', this.codeSrc || fallback);
    if (alias === 'appPath') return this.d.get('paths.appPath', this.appPath || fallback);
    return fallback;
  }
  resolve(rel, { scope='auto' } = {}){
    const base = (scope==='code') ? (this.d.get('paths.codeSrc', this.codeSrc)||this.baseUrl)
               : (scope==='app') ? (this.d.get('paths.appPath', this.appPath)||this.baseUrl)
               : (this.appPath || this.codeSrc || this.baseUrl);
    return joinUrl(base, rel);
  }

  // ---- defaults yükleme (profil aware)
  async loadDefaults({ fromApp=true, fromCode=true, profileAware=true } = {}){
    const jobs = [];
    const appBase  = this.appPath  ? joinUrl(this.baseUrl, this.appPath)  : this.baseUrl;
    const codeBase = this.codeSrc  ? joinUrl(this.baseUrl, this.codeSrc)  : this.baseUrl;
    const add = async (base, rel, type)=> this.d.load(joinUrl(base, rel), { type });
    const p = this.getActiveProfile();

    const pushCommon = (base)=> {
      jobs.push(add(base, 'defaults.json', 'json'));
      jobs.push(add(base, 'defaults/styles.json', 'json'));
      jobs.push(add(base, 'defaults/styles.js', 'js'));
      jobs.push(add(base, 'defaults/app.json', 'json'));
    };
    const pushProfile = (base)=> {
      if (!p) return;
      jobs.push(add(base, `defaults/profile.${p}.json`, 'json'));
      jobs.push(add(base, `defaults/profile.${p}.js`, 'js'));
    };

    if (fromCode){ pushCommon(codeBase); if (profileAware) pushProfile(codeBase); }
    if (fromApp){ pushCommon(appBase); if (profileAware) pushProfile(appBase); }

    try{ await Promise.allSettled(jobs); }catch{}
    // profil dosyaları yüklendiyse, sınıf adlandırmasını tekrar uygula
    this.applyClassOptions(this.ns);
    return this;
  }

  // ---- küçük yardımcılar
  registerFn(ns, name, fn){
    const key = String(ns||'default');
    if (!this._fn) this._fn = new Map();
    if (!this._fn.has(key)) this._fn.set(key, new Map());
    this._fn.get(key).set(String(name), fn);
    return fn;
  }
  getFn(ns, name){ return this._fn?.get(String(ns||'default'))?.get(String(name)) || null; }
  callFn(ns, name, ...args){ const f=this.getFn(ns,name); return f ? f(...args) : undefined; }
});

export default Tglobals;

// === Cem-spec APPEND (non-breaking): Tglobals helpers / precedence ================
(function(){
  if (typeof Tglobals === 'undefined' || !Tglobals) return;
  const G = Tglobals;

  // Tiny helpers (local, no new deps)
  function isObj(v){ return v && typeof v === 'object' && !Array.isArray(v); }
  function getIn(obj, path, def){
    if (!obj) return def;
    const a = Array.isArray(path) ? path : String(path||'').split('.').filter(Boolean);
    let cur = obj;
    for (const k of a){
      if (!cur || typeof cur !== 'object') return def;
      cur = cur[k];
    }
    return (cur === undefined) ? def : cur;
  }
  function setIn(obj, path, val){
    const a = Array.isArray(path) ? path : String(path||'').split('.').filter(Boolean);
    let cur = obj;
    for (let i=0;i<a.length-1;i++){
      const k = a[i];
      if (!isObj(cur[k])) cur[k] = {};
      cur = cur[k];
    }
    cur[a[a.length-1]] = val;
    return obj;
  }
  function deepMerge(dst, src){
    if (!isObj(dst) || !isObj(src)) return src;
    for (const k of Object.keys(src)){
      const sv = src[k], dv = dst[k];
      dst[k] = (isObj(dv) && isObj(sv)) ? deepMerge(dv, sv) : (sv);
    }
    return dst;
  }

  // Precedence resolver: app → ns → defaults → core
  if (typeof G.resolve !== 'function'){
    G.resolve = function(key, ns){
      const chain = [];
      if (this.app) chain.push(this.app);
      if (ns && this.ns && this.ns[ns]) chain.push(this.ns[ns]);
      if (this.defaults) chain.push(this.defaults);
      if (this.core) chain.push(this.core);
      for (const scope of chain){
        const v = getIn(scope, key, undefined);
        if (v !== undefined) return v;
      }
      return undefined;
    };
  }

  // get/set/merge per-ns
  if (typeof G.get !== 'function'){
    G.get = function(ns, key, def){
      const root = (ns && this.ns && this.ns[ns]) ? this.ns[ns] : this.app || this.defaults || this.core;
      return getIn(root, key, def);
    };
  }
  if (typeof G.set !== 'function'){
    G.set = function(ns, key, val){
      const root = (ns && this.ns && this.ns[ns]) ? this.ns[ns] : (this.app = (this.app || {}));
      setIn(root, key, val);
      return this;
    };
  }
  if (typeof G.merge !== 'function'){
    G.merge = function(ns, obj){
      if (!isObj(obj)) return this;
      const root = (ns && this.ns && this.ns[ns]) ? this.ns[ns] : (this.app = (this.app || {}));
      deepMerge(root, obj);
      return this;
    };
  }

  // Apply globals to serializer/history if present
  if (typeof G.applyToSerializer !== 'function'){
    G.applyToSerializer = function(ns){
      try {
        if (typeof Tserializer === 'undefined' || !Tserializer) return this;
        const cfg = this.resolve('serializer', ns);
        if (isObj(cfg)){
          // shallow merge into Tserializer.config if exists
          const target = (Tserializer.config = Tserializer.config || {});
          deepMerge(target, cfg);
        }
        const hooks = this.resolve('serializerHooks', ns);
        if (isObj(hooks)){
          Tserializer.hooks = Tserializer.hooks || {};
          for (const k of Object.keys(hooks)){
            if (Tserializer.hooks[k] == null) Tserializer.hooks[k] = {};
            deepMerge(Tserializer.hooks[k], hooks[k]);
          }
        }
      } catch {}
      return this;
    };
  }

  if (typeof G.applyToHistory !== 'function'){
    G.applyToHistory = function(hmgr, ns){
      if (!hmgr) return this;
      try {
        const cfg = this.resolve('history', ns);
        if (isObj(cfg)){
          if (cfg.limit != null) hmgr.limit = cfg.limit;
          if (cfg.track != null) hmgr.track = cfg.track;
        }
      } catch {}
      return this;
    };
  }

  // Function registry bootstrap: register user functions by map { name: fn }
  if (typeof G.registerFns !== 'function'){
    G.registerFns = function(ns, map){
      try {
        if (!map || typeof map !== 'object') return this;
        if (typeof TfunctionRegistry === 'undefined' || !TfunctionRegistry || typeof TfunctionRegistry.register !== 'function') return this;
        const nspace = ns || (this.nsName || 'app');
        for (const name of Object.keys(map)){
          const fn = map[name];
          if (typeof fn === 'function'){
            TfunctionRegistry.register(nspace, name, fn);
          }
        }
      } catch {}
      return this;
    };
  }

  // Snapshot/restore of globals (config only, not functions)
  if (typeof G.toMinJSON !== 'function'){
    G.toMinJSON = function(){
      const pick = k => (this[k] ? JSON.parse(JSON.stringify(this[k])) : undefined);
      const out = {};
      const app = pick('app'); if (app) out.app = app;
      const ns  = pick('ns');  if (ns)  out.ns = ns;
      const def = pick('defaults'); if (def) out.defaults = def;
      const core= pick('core'); if (core) out.core = core;
      return out;
    };
  }
  if (typeof Tglobals.fromMinJSON !== 'function'){
    Tglobals.fromMinJSON = function(min){
      const g = new Tglobals();
      if (!min || typeof min !== 'object') return g;
      if (min.app) g.app = min.app;
      if (min.ns) g.ns = min.ns;
      if (min.defaults) g.defaults = min.defaults;
      if (min.core) g.core = min.core;
      return g;
    };
  }
})();
// === END APPEND ====================================================================

// === Cem-spec APPEND (non-breaking): defaults & feature flags ======================
(function(){
  if (typeof Tglobals === 'undefined' || !Tglobals) return;
  const G = Tglobals;

  // Safe set/get with namespace
  if (typeof G.set !== 'function'){
    G.set = function(ns, key, value){
      try {
        this.__bags = this.__bags || new Map();
        const bag = this.__bags.get(ns) || {};
        bag[key] = value;
        this.__bags.set(ns, bag);
      } catch {}
      return this;
    };
  }
  if (typeof G.get !== 'function'){
    G.get = function(ns, key, def){
      try {
        const bag = this.__bags && this.__bags.get(ns);
        return (bag && key in bag) ? bag[key] : def;
      } catch {}
      return def;
    };
  }

  // Feature flags holder
  if (!G.flags) G.flags = {};
  if (typeof G.enable !== 'function'){
    G.enable = function(flag){ this.flags[flag] = true; return this; };
  }
  if (typeof G.disable !== 'function'){
    G.disable = function(flag){ this.flags[flag] = false; return this; };
  }
  if (typeof G.isEnabled !== 'function'){
    G.isEnabled = function(flag){ return !!this.flags[flag]; };
  }

  // Defaults that other modules can read
  if (!G.defaults) G.defaults = {};
  if (typeof G.useDefaults !== 'function'){
    G.useDefaults = function(obj){
      if (!obj || typeof obj!=='object') return this;
      this.defaults = Object.assign(this.defaults||{}, obj);
      return this;
    };
  }

  // Suggested defaults
  G.useDefaults && G.useDefaults({
    historyLimit: 500,
    theme: 'default',
    selectionKind: 'any',
    snapGrid: { stepX:10, stepY:10, offsetX:0, offsetY:0 }});
})();
// === END APPEND ====================================================================

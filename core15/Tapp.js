// Tapp.js
'use strict';

// === Esnek import/ctor çözümleyici =========================================
import CLASS from './CLASS.js';
import {ThistoryManager} from './ThistoryManager.js';
import Tevents   from './Tevents.js';
import {Tclipboard}     from './Tclipboard.js';
import {Tshortcut} from './Tshortcut.js';
import {TeventBridge}   from './TeventBridge.js';
import {Tserializer}  from './Tserializer.js';
import {Tselection}   from './Tselection.js';
import {Tglobals}    from './Tglobals.js';
import {Tpersist}  from './Tpersist.js';
import { config } from './config.js';
import { TstyleRegistry } from './TstyleRegistry.js';
import { serviceDefs } from './serviceDefs.js';
import { TappSetup } from './TappSetup.js';
import { ensureBodySublayers } from './ensureBodySublayers.js';
import { defaultLayers, maxDefaultLayers } from './layers.defaults.js';


// === Yardımcılar ============================================================
const __isObj  = (v)=> v && typeof v==='object' && !Array.isArray(v);
const __clone  = (v)=> (v && typeof v==='object')
  ? (Array.isArray(v) ? v.map(__clone) : Object.fromEntries(Object.entries(v).map(([k,val])=>[k,__clone(val)])))
  : v;
const __merge  = (t, s)=>{
  if (!__isObj(t) || !__isObj(s)) return t;
  for (const k of Object.keys(s)){
    const sv=s[k], tv=t[k];
    t[k]=__isObj(sv)?(__isObj(tv)?__merge({...tv},sv):__merge({},sv)):sv;
  } return t;
};
const __getPath= (o,p)=>{ if(!p)return o; const a=String(p).split('.'); let c=o; for(const k of a){ if(!c||typeof c!=='object')return undefined; c=c[k]; } return c; };
const __setPath= (o,p,v)=>{ const a=String(p).split('.'); let c=o; for(let i=0;i<a.length-1;i++){ const k=a[i]; if(!__isObj(c[k])) c[k]={}; c=c[k]; } c[a[a.length-1]]=v; return o; };
const __uid    = (pre='app')=> `${pre}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;

// === Tapp ===================================================================
export const Tapp = CLASS(class Tapp {
  constructor(opts = {}){
    // Core
this._events     = opts.events || (Tevents ? new Tevents() : null);
    this._history    = opts.history || opts.historyManager || (ThistoryManager ? new ThistoryManager() : null);
    this._serializer = opts.serializer || (Tserializer ? new Tserializer({ events:{enabled:true}, dom:{enabled:true,attributes:true} }) : null);

    // Service / Plugin / Registries
    this._services   = new Map();     // name -> any | {__factory}
    this._plugins    = new Set();     // dispose()
    this._modules    = new Map();     // name -> mod | (app,...args)=>instance
    this._components = new Map();     // name -> comp | (app,...args)=>instance

    this._mounted    = false;

    // Clipboard
    this._clipboard  = opts.clipboard || (Tclipboard ? new Tclipboard() : null);
    this._clipLocal  = (()=>{
      let _data = null, _text = '';
      return {
        setData:(x)=>{ _data = __clone(x); return true; },
        getData:()=> __clone(_data),
        clear:()=>{ _data=null; _text=''; },
        setText: async (t)=>{ _text=String(t??''); if (navigator?.clipboard?.writeText) try{ await navigator.clipboard.writeText(_text);}catch{} return true; },
        getText: async ()=>{ if (navigator?.clipboard?.readText) try{ const tt=await navigator.clipboard.readText(); return tt??_text; }catch{} return _text; }
      };
    })();

    // Shortcuts
    this._shortcut   = null;
    this._hotkeyMap  = new Map();

    // Installer köprüsü
    this._installMap = {};
    this._installBase= null;

    // Env/Profil
    this._globals    = Tglobals ? new Tglobals() : null;

    // Persist katmanı
    this._persist    = Tpersist ? new Tpersist() : null;

    // Selection/Layer (opsiyonel)
    this._selection = opts.selection || (typeof Tselection==='function' ? new Tselection({
      mode: 'multiple',
      getById: (id)=> this._layer && typeof this._layer.getById==='function' ? this._layer.getById(id) : null,
      idOf: (it)=> (it && (it.id || it.el?.id || it.htmlObject?.id)) || null,
      history: this._history || null
    }) : null);
    this._layer      = opts.layer || null;

    // AOP: defaults + global + yerel overrides
    const baseDefaults = {
      ui: { theme:'light' },
      telement: { draggable:true, resizable:true, snap:true, grid:8 },
      history: { enabled:true },
      clipboard: { preferSystem:true },
      shortcuts: { enabled:true },
      profile: { name:'default' }
    };
    const globalAOP = (typeof CLASS?.appOptions==='function') ? (CLASS.appOptions() || {}) : {};
    this._opts = __merge(baseDefaults, __clone(globalAOP));
    if (__isObj(opts.options)) this.appOpt(opts.options);

    // Başlangıç servisleri
    if (__isObj(opts.services)) for (const [k,v] of Object.entries(opts.services)) this.setService(k, v);
    if (this._clipboard) this.setService('clipboard', this._clipboard);
    if (this._persist)   this.setService('persist',   this._persist);
  }

  // === Getters ==============================================================
  get root(){
    const r = (this.get && this.get('root')) || null;
    return r;
  }
  get events(){ return this._events; }
  get history(){ return this._history; }
  get options(){ return __clone(this._opts); }
  get mounted(){ return !!this._mounted; }
  get serializer(){ return this._serializer; }
  get selection(){ return this._selection; }
  get layer(){ return this._layer; }
  get globals(){ return this._globals; }
  get persist(){ return this._persist; }

  // === DI ===================================================================
  setRoot(el){ if (el && this.set) this.set('root', el); return this; }
  setEvents(ev){ if (ev) this._events = ev; return this; }
  setHistory(hm){ if (hm) this._history = hm; return this; }
  setSerializer(S){ this._serializer = S || null; return this; }
  setSelection(sel){ this._selection = sel || this._selection; return this; }
  setLayer(layer){ this._layer = layer || this._layer; return this; }
  setGlobals(g){ this._globals = g || this._globals; return this; }
  setPersist(p){ this._persist = p || this._persist; return this; }

  // === Services =============================================================
  setService(name, svc){ if (name) this._services.set(String(name), svc); return this; }

  // === Service wrappers (integrated) =======================================
  set(name, service){ return this.setService(name, service); }
  get(name){ return this.getService ? this.getService(name) : null; }
  has(name){ return this.hasService ? this.hasService(name) : false; }
  use(nameOrRecord, maybeFactory){
    if (nameOrRecord && typeof nameOrRecord === 'object'){
      for (const k of Object.keys(nameOrRecord)){
        const v = nameOrRecord[k];
        if (typeof v === 'function'){
          this.registerServiceFactory && this.registerServiceFactory(k, v);
        } else {
          this.setService(k, v);
        }
      }
      return this;
    }
    const name = String(nameOrRecord);
    if (typeof maybeFactory === 'function'){
      this.registerServiceFactory && this.registerServiceFactory(name, maybeFactory);
    } else {
      this.setService(name, maybeFactory);
    }
    return this;
  }
  registerService(name, svc){ return this.setService(name, svc); } // alias
  registerServiceFactory(name, factory){
    if (typeof factory!=='function') return this;
    this._services.set(String(name), { __factory: factory });
    return this;
  }
  getService(name){
    const rec = this._services.get(String(name));
    if (rec && rec.__factory){
      const inst = rec.__factory(this);
      this._services.set(String(name), inst);
      return inst;
    }
    return rec;
  }
  getOrCreateService(name, ...args){
    const rec = this._services.get(String(name));
    if (!rec) return null;
    if (rec.__factory){
      const inst = rec.__factory(this, ...args);
      this._services.set(String(name), inst);
      return inst;
    }
    return rec;
  }
  useService(name, initFn){
    if (!this.hasService(name) && typeof initFn==='function'){
      this.setService(name, initFn(this));
    }
    return this.getService(name);
  }
  hasService(name){ return this._services.has(String(name)); }
  deleteService(name){ this._services.delete(String(name)); return this; }
  listServices(){ return Array.from(this._services.keys()); }

  // === Modules / Components =================================================
  registerModule(name, modOrFactory){ if (name) this._modules.set(String(name), modOrFactory); return this; }
  getModule(name){ return this._modules.get(String(name)); }
  createModule(name, ...args){
    const v = this._modules.get(String(name));
    if (typeof v === 'function') return v(this, ...args);
    return v || null;
  }

  registerComponent(name, compOrFactory){ if (name) this._components.set(String(name), compOrFactory); return this; }
  getComponent(name){ return this._components.get(String(name)); }
  createComponent(name, ...args){
    const v = this._components.get(String(name));
    if (typeof v === 'function') return v(this, ...args);
    return v || null;
  }

  // === Plugin ===============================================================
  use(plugin, opts){
    if (typeof plugin!=='function') return this;
    const res = plugin(this, opts) || null;
    const dispose = (typeof res==='function') ? res : (res && typeof res.dispose==='function' ? res.dispose.bind(res) : null);
    this._plugins.add(dispose || null);
    return this;
  }
  unuseAll(){
    for (const d of this._plugins){ try{ d && d(); }catch{} }
    this._plugins.clear(); return this;
  }

  // === Lifecycle ============================================================
mount(root){
  const host = (root && (root.el || root.host)) || (root && root.nodeType === 1 ? root : null);
  this.set && this.set('root', root);
  this._host = host;
  this.emit && this.emit('mount', { root, host });
  return this;
}
  unmount(){
    this._mounted = false;
    this.emit('unmount', { app:this });
    this.unuseAll();
    this.detachHotkeys();
    return this;
  }
getHost(){
  const r = (this.get && this.get('root')) || null;
  return (r && (r.el || r.host)) || (r && r.nodeType === 1 ? r : null);
}
  // === Events Proxy (Tevents) ==============================================
  on(type, fn, opts){ return this._events && this._events.on && this._events.on(type, fn, opts); }
  off(type, fn, opts){ return this._events && this._events.off && this._events.off(type, fn, opts); }
  once(type, fn, opts){ return this._events && this._events.once && this._events.once(type, fn, opts); }
  emit(type, payload){ return this._events && this._events.emit && this._events.emit(type, payload); }

  // === History Proxy (ThistoryManager) =====================================
  exec(cmd){ return this._history && this._history.exec && this._history.exec(cmd); }
  undo(){ return this._history && this._history.undo && this._history.undo(); }
  redo(){ return this._history && this._history.redo && this._history.redo(); }
  canUndo(){ return !!(this._history && this._history.canUndo && this._history.canUndo()); }
  canRedo(){ return !!(this._history && this._history.canRedo && this._history.canRedo()); }
  clearHistory(){ return this._history && this._history.clear && this._history.clear(); }
  batch(fn){ return this._history && this._history.batch ? this._history.batch(fn) : (typeof fn==='function' ? fn() : undefined); }
  ensureHistory() {
    if (this._history) return this._history;
    this._history = new ThistoryManager({});
    this.set?.('history', this._history);
    return this._history;
  }
  ensureSerializer(){
    if (!this._serializer && Tserializer){
      // Back-compat: keep serializer.mode as-is (default 'min').
      const mode = this.appOpt ? this.appOpt('serializer.mode', 'min') : 'min';
      // Central policy still supported:
      const pol  = this.appOpt ? (this.appOpt('serializer.policy') || {}) : {};
      const eventsEnabled = !!(this.appOpt ? this.appOpt('serializer.events', true) : true);
      const domOpt = (this.appOpt ? this.appOpt('serializer.dom') : null);
      const domCfg = (domOpt===true || domOpt==null) ? { enabled:true, attributes:true } : domOpt;
      this._serializer = new Tserializer({
        policy: pol,
        events: { enabled: eventsEnabled },
        dom: domCfg
        // NOTE: 'mode' isn't needed by Tserializer; toJSON uses min path already.
        // We keep 'mode' in app options for compatibility and potential adapters.
      });
      // if a future adapter needs mode, we can set policy presets here based on 'mode'.
    }
    this.set?.('serializer', this._serializer);
    return this._serializer;
  }

  // === AOP (appOptions) =====================================================
  appOpt(path, val){
    const fn = CLASS.appOptions;
    if (typeof fn!=='function'){
      if (path === undefined) return __clone(this._opts);
      if (__isObj(path)){ this._opts = __merge(this._opts, path); return __clone(this._opts); }
      if (typeof path==='string' && val===undefined) return __getPath(this._opts, path);
      if (typeof path==='string'){ __setPath(this._opts, path, val); return val; }
      return undefined;
    }
    if (path === undefined) return fn();
    if (typeof path==='string' && val===undefined) return fn(path);
    if (typeof path==='string'){ fn(path, val); this._opts = __merge(this._opts, fn()); return val; }
    if (__isObj(path)){ fn(path); this._opts = __merge(this._opts, fn()); return __clone(this._opts); }
    return undefined;
  }

  // === Shortcuts ============================================================
  attachHotkeys(target = window, map = {}){
    if (!this.appOpt('shortcuts.enabled', true)) return this;
    this.detachHotkeys();
    if (Tshortcut){
      this._shortcut = new Tshortcut(target);
      for (const [combo, handler] of Object.entries(map)){ this._shortcut.bind?.(combo, handler); }
    } else {
      const keymap = new Map(Object.entries(map));
      const handler = (e)=>{
        const mk = [];
        if (e.ctrlKey||e.metaKey) mk.push('Ctrl');
        if (e.shiftKey) mk.push('Shift');
        mk.push(e.key.length===1 ? e.key.toUpperCase() : e.key);
        const mod = mk.join('+');
        for (const [k, fn] of keymap){
          if (k.toLowerCase() === mod.toLowerCase()){ e.preventDefault(); try{ fn(e); }catch{} }
        }
      };
      this._shortcut = { dispose(){ window.removeEventListener('keydown', handler); } };
      window.addEventListener('keydown', handler);
    }
    for (const [k, fn] of Object.entries(map)) this._hotkeyMap.set(k, fn);
    return this;
  }
  detachHotkeys(){
    if (this._shortcut && typeof this._shortcut.dispose==='function'){ try{ this._shortcut.dispose(); }catch{} }
    this._shortcut = null; this._hotkeyMap.clear(); return this;
  }
  hotkeys(){ return Array.from(this._hotkeyMap.keys()); }

  // === Clipboard (useClipboard + helpers) ===================================
  useClipboard(){
    const preferSystem = !!this.appOpt('clipboard.preferSystem', true);
    const svc = this.getService('clipboard') || this._clipboard;

    const api = {
      setData: (x)=> svc && svc.setData ? svc.setData(x) : this._clipLocal.setData(x),
      getData: ()=>  svc && svc.getData ? svc.getData() : this._clipLocal.getData(),
      clear:   ()=>  svc && svc.clear   ? svc.clear()   : this._clipLocal.clear(),
      setText: async (t)=> {
        if (preferSystem && navigator?.clipboard?.writeText){
          try { await navigator.clipboard.writeText(String(t??'')); return true; } catch {}
        }
        if (svc && svc.setText) return svc.setText(t);
        return this._clipLocal.setText(t);
      },
      getText: async ()=> {
        if (preferSystem && navigator?.clipboard?.readText){
          try { const txt = await navigator.clipboard.readText(); if (txt!=null) return txt; } catch {}
        }
        if (svc && svc.getText) return svc.getText();
        return this._clipLocal.getText();
      },
      toJSON: ()=> __clone((svc && svc.getData ? svc.getData() : this._clipLocal.getData())),
      fromJSON: (j)=> { const obj = __clone(j); if (svc && svc.setData) svc.setData(obj); else this._clipLocal.setData(obj); return true; }
    };

    if (!this.hasService('clipboard')) this.setService('clipboard', svc || api);
    return api;
  }
  async copyText(text){ const c = this.useClipboard(); return c.setText(text); }
  async readText(){ const c = this.useClipboard(); return c.getText(); }
  copy(payload){ const c = this.useClipboard(); return c.setData(payload); }
  paste(){ const c = this.useClipboard(); return c.getData(); }

  // === Installer Köprüsü (CLASS.install) ===================================
  setInstallBase(url){ this._installBase = url || null; if (CLASS?.install?.setBase) CLASS.install.setBase(url); return this; }
  installSetMap(map){ this._installMap = { ...(this._installMap||{}), ...(map||{}) }; if (CLASS?.install?.setMap) CLASS.install.setMap(this._installMap); return this; }
  installGetMap(){ return { ...(this._installMap||{}) }; }
  async install(name, opts={}){ 
    const m = CLASS?.install;
    if (!m) return null;
    const map = { ...(this._installMap||{}), ...(opts.map||{}) };
    m.setMap?.(map);
    if (this._installBase && !opts.base) m.setBase?.(this._installBase);
    return await m(name, { ...opts, CLASS: CLASS });
  }
  async installMany(names=[], opts={}){ 
    if (CLASS?.installMany) return await CLASS.installMany(names, { ...opts, CLASS: CLASS });
    const out={}; for (const n of names) out[n]=await this.install(n, opts); return out;
  }

  // === Path & Resolve =======================================================
  resolvePath(url){
    if (!url) return '';
    if (/^https?:|^file:|^data:|^app:/.test(url)) return url;
    const base = this._installBase || (typeof document!=='undefined' ? new URL('.', document.baseURI).href : '');
    try { return String(new URL(url, base)); } catch { return url; }
  }
  resolve(nameOrUrl){
    if (!nameOrUrl) return '';
    const map = this.installGetMap();
    const url = map[nameOrUrl] || nameOrUrl;
    return this.resolvePath(url);
  }

  // === Globals / Profil =====================================================
  setProfile(name, data){ 
    this.appOpt('profile.name', name); 
    if (this._globals && typeof this._globals.setProfile==='function'){ this._globals.setProfile(name, data); }
    return this;
  }
  getProfile(name){ 
    const n = name || this.appOpt('profile.name');
    if (this._globals && typeof this._globals.getProfile==='function') return this._globals.getProfile(n);
    return { name:n };
  }

  // === Persist (state) ======================================================
  _stateKey(suffix='default'){ const id = (this.id || 'Tapp'); return `TAPP_STATE_${id}_${suffix}`; }
  saveState(suffix='default', extra={}){
    try{
      const key = this._stateKey(suffix);
      const base = this.ensureSerializer().toMinDoc(this);
      const out = __merge(__clone(base), __clone(extra||{}));
      localStorage.setItem(key, JSON.stringify(out));
      return true;
    }catch{ return false; }
  }
  loadState(suffix='default'){
    try{
      const key = this._stateKey(suffix);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch{ return null; }
  }

  // Opsiyonel persist katmanı (Tpersist mevcutsa)
  async save(name='app.min.json', data){
    if (!this._persist || typeof this._persist.save!=='function'){
      const payload = data || this.ensureSerializer().toMinDoc(this);
      const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 0);
      return true;
    }
    return this._persist.save(name, data || this.ensureSerializer().toMinDoc(this));
  }
  async load(fileOrJSON){
    if (!fileOrJSON) return null;
    if (this._persist && typeof this._persist.load==='function'){
      const min = await this._persist.load(fileOrJSON);
      return Tapp.fromMinJSON(min);
    }
    if (typeof fileOrJSON==='object') return Tapp.fromMinJSON(fileOrJSON);
    return null;
  }

  // === Selection & Layer köprüleri =========================================
  setSelectionFrom(ids){
    if (!this._selection || !ids) return this;
    if (this._selection.set) this._selection.set(ids);
    else if (this._selection.replace) this._selection.replace(ids);
    return this;
  }
  copySelection(mapper){
    if (!this._selection) return null;
    const ids = this._selection.values ? [...this._selection.values()] :
               this._selection.list   ? this._selection.list() : [];
    const items = ids.map(id=> mapper ? mapper(id) : ({ id }));
    return { type:'selection', items };
  }
  pasteToLayer(payload){
    if (!payload || payload.type!=='selection' || !this._layer) return false;
    for (const it of payload.items){ if (typeof this._layer.add==='function') this._layer.add(it); }
    return true;
  }

  // === Kısa Yollar ==========================================================
  static create(opts){ return new Tapp(opts); }
  static withDefaults(overrides){ return new Tapp({ options: overrides }); }
});

// ============================================================================
// EXTENDED BOOT / SERVICE ORCHESTRATION API (generated)
// ============================================================================

function __waitDOMReady(){
  return new Promise((resolve)=>{
    if (typeof document === "undefined") return resolve();
    if (document.readyState === 'loading' || document.readyState === 'interactive'){
      document.addEventListener('DOMContentLoaded', ()=>resolve(), { once:true });
    }else{
      resolve();
    }
  });
}

Tapp.prototype._ensureRegisteredDefaultsCSS = function(){
  try {
    if (TstyleRegistry && TstyleRegistry.injectOnce){
      TstyleRegistry.injectOnce();
    }
  } catch(e){}
};

Tapp.prototype._wireAutosave = function(){
  const hist = this.get && this.get('history');
  const pers = this.get && this.get('persist');
  if (!hist || !pers) return;
  const autoFlag = (pers && pers.autosave) || (pers && pers._config && pers._config.autosave);
  if (!autoFlag) return;

  if (hist.on){
    let saveTimer=null;
    hist.on('commit', ()=>{
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(()=>{
        try {
          if (pers.saveSnapshotDebounced){
            pers.saveSnapshotDebounced(this);
          } else if (pers.saveSnapshot){
            pers.saveSnapshot(this);
          } else if (this.save){
            this.save();
          }
        } catch(e){}
      }, 150);
    });
  }
};

Tapp.prototype.installService = async function(name, cfg={}, rootCtx={}){
  if (this.get && this.get(name)){
    return this.get(name);
  }
  const def = serviceDefs[name] || { deps:[] };

  if (def.deps && def.deps.length){
    for (const dep of def.deps){
      await this.installService(dep, (this._config && this._config.services && this._config.services[dep])||{}, rootCtx);
    }
  }

  let instance = null;
  switch(name){
    case 'history': {
      instance = this.get && this.get('history');
      if (!instance && this._history) instance = this._history;
      if (!instance && typeof ThistoryManager === 'function'){
        instance = new ThistoryManager(cfg||{});
      }
      if (instance){
        this._history = instance;
        if (this.set) this.set('history', instance);
      }
    } break;

    case 'persist': {
      instance = this.get && this.get('persist');
      if (!instance && this._persist) instance = this._persist;
      if (!instance && typeof Tpersist === 'function'){
        instance = new Tpersist(cfg||{});
      }
      if (instance){
        this._persist = instance;
        if (this.set) this.set('persist', instance);
      }
    } break;

    case 'selection': {
      instance = this.get && this.get('selection');
      if (!instance && this._selection) instance = this._selection;
      if (!instance && typeof Tselection === 'function'){
        instance = new Tselection(cfg||{});
      }
      if (instance){
        this._selection = instance;
        if (this.set) this.set('selection', instance);
      }
    } break;

    case 'snap': {
      instance = this.get && this.get('snap');
      if (!instance && typeof Tsnap === 'function'){
        instance = new Tsnap(cfg||{});
      }
      if (instance && this.set){
        this.set('snap', instance);
      }
    } break;

    case 'pointer': {
      const rootEl = (rootCtx && rootCtx.rootEl) ||
                     (this.get && this.get('root') && (this.get('root').el || this.get('root').host));
      instance = this.get && this.get('pointer');
      if (!instance && typeof TpointerController === 'function'){
        const pcfg = Object.assign({}, cfg||{}, {
          root: rootEl,
          dragThreshold: (cfg && cfg.dragThreshold != null)
            ? cfg.dragThreshold
            : (this._config && this._config.scene && this._config.scene.interact && this._config.scene.interact.dragThreshold)
        });
        instance = new TpointerController(pcfg);
      }
      if (instance && this.set){
        this.set('pointer', instance);
      }
    } break;

    case 'interact': {
      instance = this.get && this.get('interact');
      if (!instance && typeof Tinteract === 'function'){
        const pointer   = this.get && this.get('pointer');
        const selection = this.get && this.get('selection');
        const snap      = this.get && this.get('snap');
        const rootEl    = (rootCtx && rootCtx.rootEl) ||
                           (this.get && this.get('root') && (this.get('root').el || this.get('root').host));
        const icfg = Object.assign({}, cfg||{}, {
          pointer, selection, snap,
          root: rootEl
        });
        instance = new Tinteract(icfg);
        if (instance.attach) instance.attach(this);
      }
      if (instance && this.set){
        this.set('interact', instance);
      }
    } break;

    case 'serializer': {
      instance = this.get && this.get('serializer');
      if (!instance && this._serializer) instance = this._serializer;
      if (!instance && typeof Tserializer === 'function'){
        instance = new Tserializer(cfg||{});
      }
      if (instance){
        this._serializer = instance;
        if (this.set) this.set('serializer', instance);
      }
    } break;

    case 'clipboard': {
      instance = this.get && this.get('clipboard');
      if (!instance && this._clipboard) instance = this._clipboard;
      if (!instance && typeof Tclipboard === 'function'){
        const selection = this.get && this.get('selection');
        const history   = this.get && this.get('history');
        const serializer= this.get && this.get('serializer');
        const ccfg = Object.assign({}, cfg||{}, {
          selection, history, serializer
        });
        instance = new Tclipboard(ccfg);
      }
      if (instance && this.set){
        this.set('clipboard', instance);
      }
    } break;

    case 'shortcut': {
      instance = this.get && this.get('shortcut');
      if (!instance && this._shortcut) instance = this._shortcut;
      if (!instance && typeof Tshortcut === 'function'){
        const history    = this.get && this.get('history');
        const selection  = this.get && this.get('selection');
        const clipboard  = this.get && this.get('clipboard');
        const layer      = this.get && this.get('layer');
        const scfg = Object.assign({}, cfg||{}, {
          history, selection, clipboard, layer
        });
        instance = new Tshortcut(scfg);
        if (instance.setScope && this.getHost){
          instance.setScope(this.getHost());
        }
        if (instance.enable){
          instance.enable();
        }
      }
      if (instance && this.set){
        this.set('shortcut', instance);
      }
    } break;

    case 'inspector': {
      instance = this.get && this.get('inspector');
      if (!instance && typeof Tinspector === 'function'){
        const selection  = this.get && this.get('selection');
        const history    = this.get && this.get('history');
        const layer      = this.get && this.get('layer');
        const panelEl    = cfg && (cfg.panelEl || cfg.panel || cfg.el);
        const icfg = Object.assign({}, cfg||{}, {
          selection, history, layer, panelEl
        });
        instance = new Tinspector(icfg);
      }
      if (instance && this.set){
        this.set('inspector', instance);
      }
    } break;

    case 'theme': {
      instance = this.get && this.get('theme');
      if (!instance && typeof Ttheme === 'function'){
        const history = this.get && this.get('history');
        const tcfg = Object.assign({}, cfg||{}, { history });
        instance = new Ttheme('theme', tcfg);
      }
      if (instance && this.set){
        this.set('theme', instance);
      }
    } break;

    default: {
      if (cfg && cfg.instance && this.set){
        this.set(name, cfg.instance);
        instance = cfg.instance;
      }
    }
  }

  return this.get && this.get(name);
};

Tapp.prototype._installServicesFromConfig = async function(services, rootCtx={}){
  if (!services) return;
  for (const [svcName, svcCfg] of Object.entries(services)){
    if (!svcCfg || svcCfg.enabled === false) continue;
    await this.installService(svcName, svcCfg, rootCtx);
  }
};

Tapp.boot = async function(opts = {}) {
    // 1) defaults + user config merge
    const cfg = config.resolve(opts || {});

    // 2) app instance
    const app = new Tapp({
      options: { profile: { name: cfg.profile } }
    });

    // 3) default CSS (senin zaten vardı)
    app._ensureRegisteredDefaultsCSS?.();

    // 4) sahne/root/layer/interact kurulumu
    TappSetup.apply(app, { scene: cfg.scene, selection: cfg.selection, interact: cfg.interact });
    const root = app.get ? app.get('root') : null;

    // 5) HISTORY (cfg.history varsa)
    if (cfg.history) {
      const hOpts = (cfg.history === true) ? {} : cfg.history;
      const history = new ThistoryManager(hOpts);
      app._history = history;
      app.set?.('history', history);
    }

    // 6) SERIALIZER (cfg.serializer varsa)
    if (cfg.serializer) {
      const sOpts = (cfg.serializer === true) ? {} : cfg.serializer;
      const serializer = new Tserializer(sOpts);
      app._serializer = serializer;
      app.set?.('serializer', serializer);
    }

    // 7) Diğer servisler (shortcut, clipboard vs. zaten vardıysa)
    app._installServicesFromConfig?.(cfg.services, { root });

    // 8) autosave / vs.
    app._wireAutosave?.();

    return app;
  }

  // isteğe bağlı kolaya kaçış:


export default Tapp;
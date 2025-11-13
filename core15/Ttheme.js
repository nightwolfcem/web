'use strict';
// Ttheme.js — Cem-spec unified (syntax-safe)
// Tema token yöneticisi + CSS değişken uygulayıcı + history entegrasyonu

import CLASS from './CLASS.js'
import { Tevents } from './Tevents.js';
import { isObj, isStr } from './utils.js';
import { Tcommand } from './Tcommand.js';

/* ================= helpers ================= */
function _pref(s){ const t=String(s||'').trim(); return t.endsWith('-') ? t.slice(0,-1) : t; }
function _varName(prefix, key){ return `--${prefix}-${String(key).replace(/[.]/g,'-')}`; }
function _get(obj, path){
  if (!path) return obj;
  const segs = Array.isArray(path)?path:(String(path).split('.'));
  let cur = obj;
  for (const k of segs){ if (!isObj(cur)) return undefined; cur = cur[k]; }
  return cur;
}
function _set(obj, path, val){
  const segs = Array.isArray(path)?path:(String(path).split('.'));
  let cur = obj;
  for (let i=0;i<segs.length-1;i++){
    const k = segs[i];
    if (!isObj(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[segs[segs.length-1]] = val;
}
function _del(obj, path){
  const segs = Array.isArray(path)?path:(String(path).split('.'));
  let cur = obj;
  for (let i=0;i<segs.length-1;i++){
    const k = segs[i];
    if (!isObj(cur[k])) return false;
    cur = cur[k];
  }
  return delete cur[segs[segs.length-1]];
}
function _flat(obj, base=''){
  const out = {};
  (function walk(o, pfx){
    for (const k of Object.keys(o||{})){
      const v = o[k];
      const key = pfx ? (pfx+'.'+k) : k;
      if (isObj(v)) walk(v, key);
      else out[key] = v;
    }
  })(obj, base);
  return out;
}
function _deepMerge(dst, src){
  if (!isObj(src)) return dst;
  for (const k of Object.keys(src)){
    const v = src[k];
    if (isObj(v)){
      if (!isObj(dst[k])) dst[k] = {};
      _deepMerge(dst[k], v);
    } else {
      dst[k] = v;
    }
  }
  return dst;
}

/* ================= Commands ================= */
export const TthemePatch = CLASS(class TthemePatch extends CLASS.extends(Tcommand) {
  // patch: { set: {key:val,...}, remove: [keys...] }
  constructor(theme, patch, label='theme:patch'){
    super({ label });
    this.theme = theme;
    this.patch = { set: { ...(patch?.set||{}) }, remove: Array.from(patch?.remove||[]) };
    this._undo = null;
  }
  do(){
    if (!this._undo){
      const undoSet = {};
      for (const k of Object.keys(this.patch.set)) undoSet[k] = this.theme.get(k);
      const undoRem = [];
      for (const k of this.patch.remove){
        if (this.theme.has(k)) undoSet[k] = this.theme.get(k);
        undoRem.push(k);
      }
      this._undo = { set: undoSet, remove: undoRem };
    }
    this.theme.applyPatch(this.patch);
  }
  undo(){
    if (!this._undo) return;
    // reverse: removed keys come back; set keys restored
    const rev = { set: this._undo.set, remove: [] };
    this.theme.applyPatch(rev);
  }
  toPatch(){ return { type:'theme', patch:{ set:{...this.patch.set}, remove: this.patch.remove.slice() } }; }
  mergeWith(n){
    if (!(n instanceof TthemePatch)) return false;
    if (n.theme !== this.theme) return false;
    Object.assign(this.patch.set, n.patch.set);
    const rem = new Set([ ...this.patch.remove, ...n.patch.remove ]);
    this.patch.remove = Array.from(rem);
    return true;
  }
});

/* ================= Ttheme ================= */
export const Ttheme = CLASS(class Ttheme extends CLASS.extends(Tevents) {
  /**
   * @param {string} id
   * @param {object} opts
   *  - prefix: CSS variable prefix (default 'ui')
   *  - scope: CSS selector for stylesheet mode (default ':root')
   *  - tokens: nested token object
   *  - history: ThistoryManager (optional)
   */
  constructor(id='theme', { prefix='ui', scope=':root', tokens=null, history=null } = {}){
    super();
    this.id = String(id||'theme');
    this.prefix = _pref(prefix||'ui');
    this.scope = String(scope||':root');
    this.tokens = isObj(tokens) ? JSON.parse(JSON.stringify(tokens)) : {}; // deep clone
    this.history = history || null;
    this._styleEl = null;
  }

  bindHistory(h){ this.history = h || null; return this; }
  setPrefix(p){ this.prefix = _pref(p); this.emit('change', { reason:'prefix', prefix:this.prefix }); return this; }
  setScope(sel){ this.scope = String(sel||':root'); this.emit('change', { reason:'scope', scope:this.scope }); return this; }

  /* CRUD on tokens */
  has(key){ return _get(this.tokens, key) !== undefined; }
  get(key, dflt=undefined){ const v=_get(this.tokens, key); return v===undefined?dflt:v; }
  set(key, val, { label='theme:set', tryMerge=true } = {}){
    const patch = { set: { [key]: val }, remove: [] };
    return this._commit(patch, { label, tryMerge });
  }
  remove(key, { label='theme:remove', tryMerge=true } = {}){
    const patch = { set: {}, remove: [ key ] };
    return this._commit(patch, { label, tryMerge });
  }
  patch(all, { label='theme:patch', tryMerge=true } = {}){
    const set = {}; const remove = [];
    if (isObj(all?.set)) Object.assign(set, all.set);
    if (Array.isArray(all?.remove)) remove.push(...all.remove);
    return this._commit({ set, remove }, { label, tryMerge });
  }
  setTokens(obj, { label='theme:setTokens', tryMerge=false } = {}){
    // deep merge
    const flat = _flat(obj||{});
    return this._commit({ set: flat, remove: [] }, { label, tryMerge });
  }

  applyPatch(patch){
    const { set={}, remove=[] } = patch || {};
    for (const k of Object.keys(set)) _set(this.tokens, k, set[k]);
    for (const k of remove) _del(this.tokens, k);
    this.emit('change', { reason:'patch', set, remove, tokens:this.tokens });
    return this;
  }

  /* CSS output & application */
  toVarsMap(){
    const flat = _flat(this.tokens);
    const out = {};
    for (const k of Object.keys(flat)){
      const v = flat[k];
      const val = (isStr(v) && v.startsWith('$')) ? `var(${_varName(this.prefix, v.slice(1))})` : v;
      out[_varName(this.prefix, k)] = String(val);
    }
    return out;
  }
  toCSS({ selector=this.scope } = {}){
    const vars = this.toVarsMap();
    const lines = Object.keys(vars).map(k=>`  ${k}: ${vars[k]};`).join('\n');
    return `${selector} {\n${lines}\n}`;
  }
  applyTo(target=(typeof document!=='undefined'?document.documentElement:null), { inline=false, selector=this.scope, styleId=null } = {}){
    const vars = this.toVarsMap();
    if (inline){
      if (!target) return false;
      for (const k of Object.keys(vars)){
        try{ target.style.setProperty(k, vars[k]); }catch{}
      }
      this.emit('apply', { mode:'inline', target });
      return true;
    }
    if (typeof document==='undefined') return false;
    const id = styleId || `Ttheme-${this.id}`;
    let el = this._styleEl || document.getElementById(id);
    if (!el){
      el = document.createElement('style');
      el.type='text/css'; el.id=id;
      document.head.appendChild(el);
      this._styleEl = el;
    }
    el.textContent = `/* ${this.id} */\n${this.toCSS({ selector })}`;
    this.emit('apply', { mode:'stylesheet', selector, el });
    return true;
  }
  removeFromDoc(styleId=null){
    if (typeof document==='undefined') return true;
    const id = styleId || `Ttheme-${this.id}`;
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (this._styleEl === el) this._styleEl = null;
    return true;
  }

  /* history commit */
  _commit(patch, { label='theme:patch', tryMerge=true } = {}){
    if (this.history){
      this.history.exec(new TthemePatch(this, patch, label), { label, tryMerge });
      return this;
    }
    this.applyPatch(patch);
    return this;
  }

  /* serialization */
  toMinJSON(){
    const C=this.constructor; const cls=(C&&(C.$class||C.name))||'Ttheme';
    return { type: cls, args: [ this.id, { prefix:this.prefix, scope:this.scope, tokens:this.tokens } ] };
  }
static fromTokens(id, tokens, opts={}){ return new this(id, { ...opts, tokens }); }

  /* utilities */
  merge(obj){
    if (!isObj(obj)) return this;
    if (isObj(obj.tokens)) _deepMerge(this.tokens, obj.tokens);
    if (obj.prefix!=null) this.prefix = _pref(obj.prefix);
    if (obj.scope!=null) this.scope = String(obj.scope);
    this.emit('change', { reason:'merge' });
    return this;
  }
  toCssText(selector=':root'){
    return this.toCSS({ selector });
  }
  injectStyle(selector=':root'){
    return this.applyTo((typeof document!=='undefined'?document.documentElement:null), { inline:false, selector });
  }
});

export default { Ttheme, TthemePatch };

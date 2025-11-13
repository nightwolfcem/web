'use strict';
// Tinspector.js — Cem-spec unified (deep-clean, syntax-safe)
// Özellik paneli (Selection/Layers/DOM) + history entegrasyonu

import CLASS from './CLASS.js'
import { Tevents } from './Tevents.js';
import { isObj,getElement } from './utils.js';
import { Trender } from './Trender.js';

/* ================= helpers ================= */
function _ensureContainer(el){
  const c = getElement(el) || (typeof document!=='undefined' ? document.createElement('div') : null);
  if (!c) return null;
  if (!c.parentNode && typeof document!=='undefined') document.body.appendChild(c);
  return c;
}
function _deepGet(obj, path){
  if (obj==null) return undefined;
  if (!path) return obj;
  const segs = String(path).split('.');
  let cur = obj;
  for (const k of segs){
    if (cur==null) return undefined;
    cur = cur[k];
  }
  return cur;
}
function _deepSet(obj, path, val){
  const segs = String(path).split('.');
  let cur = obj;
  for (let i=0;i<segs.length-1;i++){
    const k = segs[i];
    if (!(cur[k] && typeof cur[k]==='object')) cur[k] = {};
    cur = cur[k];
  }
  cur[segs[segs.length-1]] = val;
  return obj;
}
function _same(a,b){ try{ return JSON.stringify(a)===JSON.stringify(b); }catch{ return a===b; } }
const MIXED = '—';

/* history push köprüsü: ThistoryManager.exec, .push(do,undo,meta) veya yok */
function _pushHistory(H, { label='insp:set', tag=null } = {}, doFn, undoFn){
  try{
    if (!H){ doFn?.(); return true; }
    // ThistoryManager tarzı
    if (typeof H.exec === 'function'){
      const cmd = { label, do: doFn, undo: undoFn, redo: doFn };
      H.exec(cmd, { label, tryMerge:true });
      return true;
    }
    // generic push(do, undo, meta)
    if (typeof H.push === 'function'){
      if (H.push.length >= 3){ H.push(()=>doFn?.(), ()=>undoFn?.(), { type:'inspector', label, tag }); }
      else { H.push({ do:doFn, undo:undoFn, redo:doFn, label }, label); }
      return true;
    }
    // begin/end fallback
    if (typeof H.begin === 'function' && typeof H.end === 'function'){
      H.begin(label); try{ doFn?.(); } finally { H.end(label); }
      return true;
    }
    doFn?.(); return true;
  }catch{ return false; }
}

/* ================= Tinspector ================= */
export const Tinspector = CLASS(class Tinspector extends CLASS.extends(Tevents) {
  /**
   * @param {object} opts
   *  - container: Element (panelin yazılacağı yer). Verilmezse body'e eklenir.
   *  - selection: Tselection
   *  - history: ThistoryManager
   *  - render: Trender — DOM için attr/style komutlarını kullanır
   *  - layers: herhangi bir layer yöneticisi (setProps destekleyen)
   *  - schema: grup/alan tanımı
   */
  constructor(opts={}){
    super();
    const { container=null, selection=null, history=null, render=null, layers=null, schema=null } = opts||{};
    this.container = _ensureContainer(container);
    this.selection = selection || null;
    this.history = history || null;
    this.render = (render instanceof Trender) ? render : null;
    this.layers = (layers && typeof layers.setProps === 'function') ? layers : null;

    this.schema = { groups: [] };
    if (schema) this.define(schema);

    this.root = (typeof document!=='undefined') ? document.createElement('div') : null;
    if (this.root){
      this.root.className = 'Tinspector';
      if (this.container) this.container.appendChild(this.root);
    }

    if (this.selection && this.selection.on){ try{ this.selection.on('change', ()=> this.refresh()); }catch{} }
    if (this.history && this.history.on){ try{
      this.history.on('undo', ()=> this.refresh());
      this.history.on('redo', ()=> this.refresh());
      this.history.on('push', ()=> this.refresh());
    }catch{} }

    this._building = false;
    this._mutating = false;

    this.build();
  }

  define(schema){ if (schema && schema.groups) this.schema = schema; return this; }
  setSelection(sel){ this.selection = sel; this.refresh(); return this; }
  setHistory(h){ this.history = h; return this; }
  setRender(r){ this.render = r; return this; }
  setLayers(L){ this.layers = L; return this; }

  /* -------- UI build / refresh -------- */
  build(){
    if (!this.root) return this;
    this._building = true;
    this.root.innerHTML = '';
    for (const grp of (this.schema.groups||[])){
      const g = document.createElement('section');
      g.className = 'Tinsp-group';
      const h = document.createElement('header');
      h.className = 'Tinsp-title';
      h.textContent = grp.title || grp.name || 'Group';
      g.appendChild(h);
      const body = document.createElement('div');
      body.className = 'Tinsp-body';
      g.appendChild(body);
      for (const f of (grp.fields||[])){
        const row = this._buildField(f);
        if (row) body.appendChild(row);
      }
      this.root.appendChild(g);
    }
    this._building = false;
    this.refresh();
    this.emit('build');
    return this;
  }

  _buildField(f){
    if (!f) return null;
    const row = document.createElement('div');
    row.className = 'Tinsp-row Tinsp-type-'+(f.type||'text');
    const lab = document.createElement('label');
    lab.textContent = f.label || f.key || f.name || '';
    lab.className = 'Tinsp-label';
    const inp = this._createInputFor(f);
    if (!inp) return null;
    const box = document.createElement('div');
    box.className = 'Tinsp-input';
    box.appendChild(inp);
    row.appendChild(lab); row.appendChild(box);
    // events
    inp.addEventListener('change', ()=> this._onInputChange(f, inp));
    if (f.type==='number' && f.live) inp.addEventListener('input', ()=> this._onInputChange(f, inp, { live:true }));
    row._field = f; row._input = inp;
    return row;
  }

  _createInputFor(f){
    const t = f.type || 'text';
    if (t==='select'){
      const s = document.createElement('select');
      const opts = f.options || [];
      for (const o of opts){
        const op = document.createElement('option');
        if (isObj(o)){ op.value = o.value; op.textContent = o.label ?? o.value; }
        else { op.value = String(o); op.textContent = String(o); }
        s.appendChild(op);
      }
      return s;
    }
    if (t==='checkbox'){ const c=document.createElement('input'); c.type='checkbox'; return c; }
    if (t==='color'){ const c=document.createElement('input'); c.type='color'; return c; }
    if (t==='textarea'){ const ta=document.createElement('textarea'); ta.rows=f.rows||3; return ta; }
    const i = document.createElement('input');
    i.type = (t==='number') ? 'number' : 'text';
    if (t==='number'){
      if (f.min!=null) i.min = String(f.min);
      if (f.max!=null) i.max = String(f.max);
      if (f.step!=null) i.step = String(f.step);
    }
    if (f.placeholder) i.placeholder = String(f.placeholder);
    return i;
  }

  refresh(){
    if (this._building || !this.root) return this;
    const items = (this.selection && typeof this.selection.list==='function') ? this.selection.list() : [];
    const mixed = (vals)=>{
      if (!vals.length) return '';
      const v0 = vals[0];
      for (let i=1;i<vals.length;i++){ if (!_same(vals[i], v0)) return MIXED; }
      return v0 ?? '';
    };
    const rows = this.root.querySelectorAll('.Tinsp-row');
    for (const row of rows){
      const f = row._field; const inp = row._input; if (!f || !inp) continue;
      const vals = items.map(it=> this._readField(f, it));
      const val = mixed(vals);
      this._setInputValue(inp, f, val);
      row.classList.toggle('Tinsp-mixed', val===MIXED);
    }
    this.emit('refresh', { count: items.length });
    return this;
  }

  _setInputValue(inp, f, val){
    const t = f.type || 'text';
    if (t==='checkbox'){ inp.checked = !!val; return; }
    if (t==='select'){ inp.value = (val==null||val===MIXED)?'':String(val); return; }
    if (t==='color'){ inp.value = (val==null||val===MIXED)?'#000000':String(val); return; }
    if (t==='textarea'){ inp.value = (val==null||val===MIXED)?'':String(val); return; }
    if (t==='number'){ inp.value = (val==null||val===MIXED)?'':String(val); return; }
    inp.value = (val==null||val===MIXED)?'':String(val);
  }

  /* -------- field get/set -------- */
  _readField(f, item){
    if (typeof f.get === 'function') return f.get(item, this);
    const key = f.key || f.name;
    const el = getElement(item);
    if (el){
      if (key==='text') return el.textContent || '';
      if (key==='class') return el.className || '';
      if (key?.startsWith('style.')) return el.style[key.slice(6)] || '';
      if (key?.startsWith('attr.')) return el.getAttribute(key.slice(5)) ?? '';
      if (key?.startsWith('dataset.')) return el.dataset?.[key.slice(8)] ?? '';
    }
    try{ return _deepGet(item, key); }catch{ return ''; }
  }

  _writeField(f, item, value, { live=false } = {}){
    if (typeof f.set === 'function') return f.set(item, value, { live, insp:this });
    const key = f.key || f.name;
    const el = getElement(item);
    const label = f.label || key || 'inspector:set';

    if (el){
      if (this.render instanceof Trender){
        if (key==='text') return this.render.text(el, value, { label });
        if (key==='class') return this.render.attr(el, { class: String(value) }, { label });
        if (key?.startsWith('style.')){ const k=key.slice(6); const v=(f.unit && typeof value==='number')?(String(value)+f.unit):value; const patch={}; patch[k]=v; return this.render.style(el, patch, { label }); }
        if (key?.startsWith('attr.')){ const k=key.slice(5); const patch={}; patch[k]=String(value); return this.render.attr(el, patch, { label }); }
        if (key?.startsWith('dataset.')){ const k=key.slice(8); const v=String(value); return this.render.attr(el, { ['data-'+k]: v }, { label }); }
      }
      // render yoksa doğrudan uygula + history push
      const before = {
        text: el.textContent,
        class: el.className,
        style: el.getAttribute('style')||''
      };
      const doFn = ()=>{
        if (key==='text') el.textContent = String(value);
        else if (key==='class') el.className = String(value);
        else if (key?.startsWith('style.')){ const k=key.slice(6); const v=(f.unit && typeof value==='number')?(String(value)+f.unit):value; el.style[k]=String(v); }
        else if (key?.startsWith('attr.')) el.setAttribute(key.slice(5), String(value));
        else if (key?.startsWith('dataset.')){ const k=key.slice(8); el.dataset[k]=String(value); }
      };
      const undoFn = ()=>{
        el.textContent = before.text;
        el.className = before.class;
        el.setAttribute('style', before.style);
      };
      _pushHistory(this.history, { label }, doFn, undoFn);
      return true;
    }

    if (this.layers && typeof this.layers.setProps === 'function' && item){
      const patch = {};
      if (key in item) patch[key] = value;
      else {
        const bag = {}; _deepSet(bag, key, value);
        patch.data = Object.assign({}, item.data||{}, bag);
      }
      try{ this.layers.setProps(item, patch, { label }); return true; }catch{ return false; }
    }

    // generic deep path as last resort
    try{
      const prev = _deepGet(item, key);
      const doFn = ()=> _deepSet(item, key, value);
      const undoFn = ()=> _deepSet(item, key, prev);
      _pushHistory(this.history, { label }, doFn, undoFn);
      return true;
    }catch{ return false; }
  }

  _onInputChange(f, inp, { live=false } = {}){
    if (this._mutating) return;
    const t = f.type || 'text';
    let v;
    if (t==='checkbox') v = !!inp.checked;
    else if (t==='number'){
      const n = parseFloat(inp.value);
      v = isNaN(n) ? null : (f.unit ? n : n);
    } else {
      v = inp.value;
    }

    const items = (this.selection && typeof this.selection.list==='function') ? this.selection.list() : [];
    if (!items.length) return;

    if (this.history && typeof this.history.begin==='function') this.history.begin(live ? 'insp:input(live)' : 'insp:input');
    this._mutating = true;
    try{
      for (const it of items) this._writeField(f, it, v, { live });
      this.emit('apply', { field:f, value:v, itemsCount:items.length, live });
    } finally {
      this._mutating = false;
      if (this.history && typeof this.history.end==='function') this.history.end(live ? 'insp:input(live)' : 'insp:input');
      this.refresh();
    }
  }

  /* -------- public API -------- */
  setSchema(schema){ return this.define(schema).build(); }
  addGroup(title, fields){ const g = { title, fields: fields||[] }; this.schema.groups.push(g); this.build(); return g; }
  addField(groupTitle, field){
    const g = (this.schema.groups||[]).find(x=> (x.title||x.name)===groupTitle);
    if (!g){ this.schema.groups.push({ title:groupTitle, fields:[field] }); }
    else g.fields.push(field);
    this.build(); return field;
  }

  /* -------- attach / target & raw get/set -------- */
  attach(container){
    const c = _ensureContainer(container);
    if (!c) return this;
    this.container = c;
    if (!this.root){
      if (typeof document!=='undefined'){
        this.root = document.createElement('div');
        this.root.className = 'Tinspector';
      }
    }
    if (this.root && !this.root.parentNode) c.appendChild(this.root);
    this.refresh();
    return this;
  }

  defineField(key, meta){
    if (!key) return this;
    const f = Object.assign({ key }, meta||{});
    if (!this.schema.groups.length) this.schema.groups.push({ title:'General', fields:[] });
    this.schema.groups[0].fields.push(f);
    return this.build();
  }
  defineFields(map){
    if (!map || typeof map!=='object') return this;
    for (const k of Object.keys(map)) this.defineField(k, map[k]);
    return this;
  }

  bindTarget(obj, { history=null } = {}){
    this.target = obj || null;
    if (history) this.history = history;
    return this;
  }

  setProp(path, value, { label='insp:set', tag=null } = {}){
    if (!this.target || !path) return this;
    const segs = String(path).split('.');
    let obj = this.target, last = segs.pop();
    for (const s of segs){ if (!obj) break; obj = obj[s]; }
    if (!obj) return this;
    const prev = obj[last];
    const doFn = ()=>{ obj[last] = value; this.emit?.('inspector:change', { path, prev, next:value }); };
    const undoFn = ()=>{ obj[last] = prev;  this.emit?.('inspector:change', { path, prev:value, next:prev }); };
    _pushHistory(this.history, { label, tag }, doFn, undoFn);
    return this;
  }

  getProp(path, def){
    if (!this.target || !path) return def;
    const v = _deepGet(this.target, String(path));
    return (v==null ? def : v);
  }
});

export default { Tinspector };

export function installInspector(app, opts = {}){
  const service = new Tinspector(opts);
  if (service && service.attach) service.attach(app);
  if (app && app.use) app.use('inspector', service);
  return service;
}

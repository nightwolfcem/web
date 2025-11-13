'use strict';
// Tclipboard.js — Cem-spec unified (clean, syntax-safe)
// Kopyala/Kes/Yapıştır köprüsü (Layers + DOM + Serializer Doc)

import CLASS from './CLASS.js'
import { Tevents } from './Tevents.js';
import Tserializer from './Tserializer.js'
import { getElement } from './utils.js';
/* ------------------ küçük yardımcılar ------------------ */
function _now(){ return Date.now(); }
function _arr(x){ return Array.isArray(x) ? x.slice() : (x ? [x] : []); }
function _doc(){ return (typeof document!=='undefined') ? document : null; }
function _ensureId(el){ if (!el) return null; if (!el.id){ el.id = 't-' + Math.random().toString(36).slice(2,9); } return el.id; }

/* fallback küçük DOM komutları (history yoksa doğrudan uygular) */
class _CmdBase{ constructor(label=''){ this.label=label; } do(){} undo(){} redo(){ this.do(); } mergeWith(_){ return false; } toPatch(){ return null; } }
class _DomInsert extends _CmdBase{
  constructor(parent, node, before=null, label='dom@insert'){ super(label); this.p=parent; this.n=node; this.b=before; this._op=null; this._on=null; }
  do(){ if (!this._op){ this._op=this.n.parentNode; this._on=this.n.nextSibling; } this.p.insertBefore(this.n, this.b||null); }
  undo(){ if (this._op){ this._op.insertBefore(this.n, this._on||null); } }
}
class _DomRemove extends _CmdBase{
  constructor(node, label='dom@remove'){ super(label); this.n=node; this._p=null; this._next=null; }
  do(){ this._p=this.n.parentNode; this._next=this.n.nextSibling; if (this.n.parentNode) this.n.parentNode.removeChild(this.n); }
  undo(){ if (this._p){ this._p.insertBefore(this.n, this._next||null); } }
}

/* ------------------ layer snapshot helpers ------------------ */
function _snapLayerTree(nodes){
  const roots = [];
  const set = new Set(_arr(nodes));
  // orman: yalnızca üst kökleri al
  for (const n of set){
    let p=n && n.parent, isRoot=true;
    while (p){ if (set.has(p)){ isRoot=false; break; } p=p.parent; }
    if (isRoot && n) roots.push(n);
  }
  function snap(node){
    return {
      name: node.name, visible: !!node.visible, locked: !!node.locked, z: node.z|0, data: node.data,
      children: Array.isArray(node.children) ? node.children.map(snap) : []
    };
  }
  return roots.map(snap);
}
function _restoreLayerTree(manager, trees, { parent=null, index=null, offsetZ=0 } = {}){
  const created = [];
  function build(t, p){
    const node = manager.create({ name:t.name, visible:t.visible, locked:t.locked, z:(t.z|0)+offsetZ, data:t.data }, p, index, { label:'layer:create' });
    created.push(node);
    for (const ch of (t.children||[])) build(ch, node);
    return node;
  }
  for (const t of trees) build(t, parent||manager.root);
  return created;
}

/* ------------------ instance store ------------------ */
const __WM = new WeakMap();
function S(self){
  let s = __WM.get(self);
  if (!s){
    s = { data: Object.create(null) };
    __WM.set(self, s);
  }
  return s;
}

/* ------------------ Tclipboard ------------------ */
export const Tclipboard = CLASS(class Tclipboard extends CLASS.extends(Tevents) {
  /**
   * @param {object} opts
   *  - history: ThistoryManager (opsiyonel; varsa batch ile çalışır)
   *  - layers: Tlayers (opsiyonel; layer tabanlı kopyala/yapıştır)
   *  - selection: Tselection (opsiyonel; paste sonrası seçimi ayarlar)
   *  - serializer: serializer (opsiyonel; doc tabanlı kopyala/yapıştır)
   */
  constructor(opts={}){
    super();
    const { history=null, layers=null, selection=null, serializer=null } = opts||{};
    this.history = history || null;
    this.layers = layers || null;
    this.selection = selection || null;
    this.serializer = serializer || Serializer || null;
    this.buffer = null;     // { type:'layers'|'dom'|'doc', payload:any, count?:number, ts }
  }

  /* ========== Copy ========== */
  copyLayers(nodes){
    if (!this.layers) return false;
    const arr = _arr(nodes);
    const trees = _snapLayerTree(arr);
    this.buffer = { type:'layers', payload: trees, count: arr.length, ts:_now() };
    this.emit && this.emit('copy', { type:'layers', count: arr.length });
    return true;
  }
  copyDOM(nodes){
    const D = _doc(); if (!D) return false;
    const arr = _arr(nodes);
    const html = arr.map(n=> getElement(n)?.outerHTML).filter(Boolean);
    this.buffer = { type:'dom', payload: html, count: html.length, ts:_now() };
    this.emit && this.emit('copy', { type:'dom', count: html.length });
    return true;
  }
  copyDoc(obj){
    const Srl=this.serializer; if (!Srl) return false;
    const doc = (Srl.toMinDoc ? Srl.toMinDoc(obj, { minimize:true }) : (Srl.toDoc ? Srl.toDoc(obj) : null));
    if (!doc) return false;
    this.buffer = { type:'doc', payload: doc, count: 1, ts:_now() };
    this.emit && this.emit('copy', { type:'doc', count:1 });
    return true;
  }

  /* ========== Cut ========== */
  cutLayers(nodes){
    const ok = this.copyLayers(nodes);
    if (!ok) return false;
    const arr = _arr(nodes);
    const H=this.history, L=this.layers;
    if (!L) return false;
    if (H && typeof H.begin==='function') H.begin('layer:cut');
    try{
      for (const n of arr){ L.remove && L.remove(n, { label:'layer:cut' }); }
    } finally { if (H && typeof H.end==='function') H.end('layer:cut'); }
    this.emit && this.emit('cut', { type:'layers', count: arr.length });
    return true;
  }
  cutDOM(nodes){
    const D = _doc(); if (!D) return false;
    const ok = this.copyDOM(nodes);
    if (!ok) return false;
    const arr = _arr(nodes).map(getElement).filter(Boolean);
    const H=this.history;
    if (H && typeof H.begin==='function') H.begin('dom@cut');
    try{
      for (const n of arr){
        if (H && typeof H.exec==='function') H.exec(new _DomRemove(n), { label:'dom@cut', tryMerge:false });
        else if (n.parentNode) n.parentNode.removeChild(n);
      }
    } finally { if (H && typeof H.end==='function') H.end('dom@cut'); }
    this.emit && this.emit('cut', { type:'dom', count: arr.length });
    return true;
  }

  /* ========== Paste ========== */
  pasteLayers({ parent=null, offsetZ=0, selectAfter=true } = {}){
    if (!this.buffer || this.buffer.type!=='layers') return [];
    const trees = this.buffer.payload || [];
    const H=this.history;
    const mgr=this.layers;
    if (!mgr) return [];

    if (H && typeof H.begin==='function') H.begin('layer:paste');
    let created=[];
    try{
      created = _restoreLayerTree(mgr, trees, { parent: parent||mgr.root, offsetZ });
    } finally { if (H && typeof H.end==='function') H.end('layer:paste'); }
    if (this.selection && selectAfter && typeof this.selection.set==='function'){ try{ this.selection.set(created); }catch{} }
    this.emit && this.emit('paste', { type:'layers', count: created.length });
    return created;
  }

  pasteDOM({ parent=null, before=null, selectAfter=false } = {}){
    if (!this.buffer || this.buffer.type!=='dom') return [];
    const D = _doc(); if (!D) return [];
    const html = this.buffer.payload || [];
    const p = getElement(parent) || D.body;
    const b = getElement(before) || null;
    const out = [];
    const H=this.history;
    if (H && typeof H.begin==='function') H.begin('dom@paste');
    try{
      for (const s of html){
        const tpl=D.createElement('template'); tpl.innerHTML = s;
        const node = tpl.content.firstElementChild;
        if (!node) continue;
        _ensureId(node);
        if (H && typeof H.exec==='function') H.exec(new _DomInsert(p, node, b), { label:'dom@paste', tryMerge:false });
        else p.insertBefore(node, b||null);
        out.push(node);
      }
    } finally { if (H && typeof H.end==='function') H.end('dom@paste'); }
    if (this.selection && selectAfter && typeof this.selection.set==='function'){ try{ this.selection.set(out); }catch{} }
    this.emit && this.emit('paste', { type:'dom', count: out.length });
    return out;
  }

  pasteDoc({ ctx=null } = {}){
    if (!this.buffer || this.buffer.type!=='doc') return null;
    const Srl=this.serializer; if (!Srl) return null;
    try{
      const obj = Srl.fromMinDoc ? Srl.fromMinDoc(this.buffer.payload, ctx||{}) : (Srl.fromDoc ? Srl.fromDoc(this.buffer.payload, ctx||{}) : null);
      this.emit && this.emit('paste', { type:'doc', count: obj?1:0 });
      return obj;
    }catch(e){
      this.emit && this.emit('error', { op:'pasteDoc', error:e });
      return null;
    }
  }

  /* ========== Text/OS Clipboard ========== */
  toText(){
    if (!this.buffer) return '';
    try{ return JSON.stringify({ type:this.buffer.type, payload:this.buffer.payload }); }
    catch{ return ''; }
  }
  fromText(txt){
    try{
      const o = JSON.parse(String(txt||'{}'));
      if (o && (o.type==='layers' || o.type==='dom' || o.type==='doc')){
        this.buffer = { type:o.type, payload:o.payload, ts:_now() };
        return true;
      }
    }catch{}
    return false;
  }
  async writeOS(){
    const s=this.toText(); if (!s) return false;
    try{ await (navigator.clipboard?.writeText?.(s)); this.emit && this.emit('os:write',{ ok:true }); return true; }catch{ this.emit && this.emit('os:write',{ ok:false }); return false; }
  }
  async readOS(){
    try{
      const s = await (navigator.clipboard?.readText?.());
      return this.fromText(s);
    }catch{ return false; }
  }

  /* ========== Info & serialization ========== */
  info(){ return { has: !!this.buffer, type:this.buffer?.type||null, count: this.buffer?.count||null, ts:this.buffer?.ts||null }; }
/* ========== Cem-spec: Data bag & selection bridge ========== */
  setData(type, payload){
    S(this).data[type] = payload;
    return this;
  }
  getData(type){
    return S(this).data[type];
  }

  /** Seçimden kopyala — layer + selection ver, iç cache'e serialized olarak koy. */
  copySelection(layer, selection, opts = {}){
    const { captureEvents = true } = opts;
    const EL_KEY  = 'application/x-cem-elements';
    const ids = selection && selection.items ? selection.items.map(x => (x && x.id) || x) : (selection && selection.list ? selection.list() : []);
    if (!layer || !Array.isArray(layer.children) || ids.length===0){
      this.setData(EL_KEY, []);
      return [];
    }
    const byId = new Map(layer.children.map(ch => [ch && ch.id, ch]));
    const Srl = this.serializer;
    const list = [];
    for (const id of ids){
      const el = byId.get(id);
      if (!el) continue;
      let min = null;
      try {
        if (Srl && typeof Srl.toMinJSON_withEvents === 'function'){
          min = Srl.toMinJSON_withEvents(el, { captureEvents });
        } else if (Srl && typeof Srl.toMinJSON === 'function'){
          min = Srl.toMinJSON(el);
        } else if (typeof el.toMinJSON === 'function'){
          min = el.toMinJSON({ captureEvents });
        } else {
          min = { id: el.id, x: el.x, y: el.y, w: el.w, h: el.h };
        }
      } catch {
        min = { id: el.id };
      }
      list.push(min);
    }
    this.setData(EL_KEY, list);
    return list;
  }

  /** İç cache'den yapıştır — opsiyonel onCreate ile eleman yarat. */
  pasteInto(layer, opts = {}){
    const { reattach = true, onCreate } = opts;
    const EL_KEY = 'application/x-cem-elements';
    const list = this.getData(EL_KEY);
    if (!Array.isArray(list) || !layer) return [];

    const created = [];
    const Srl = this.serializer;
    for (const min of list){
      let el = null;
      try {
        if (onCreate){
          el = onCreate(min);
        } else if (Srl && typeof Srl.fromMinJSON_withEvents === 'function'){
          el = Srl.fromMinJSON_withEvents(min);
        } else if (Srl && typeof Srl.fromMinJSON === 'function'){
          el = Srl.fromMinJSON(min);
        } else if (typeof globalThis!=='undefined' && typeof globalThis.Tserializer!=='undefined' && globalThis.Tserializer && typeof globalThis.Tserializer.fromJSON === 'function'){
          el = globalThis.Tserializer.fromJSON(min);
        } else {
          el = min; // fallback
        }
      } catch {
        el = null;
      }
      if (el){
        created.push(el);
        if (reattach && typeof layer.addChild==='function') layer.addChild(el, 'content');
      }
    }
    return created;
  }

  serialize(model, { captureEvents=true } = {}){
    if (!model) return null;
    const Srl = this.serializer;
    try {
      if (Srl){
        if (captureEvents && typeof Srl.toMinJSON_withEvents === 'function'){
          return Srl.toMinJSON_withEvents(model, { captureEvents });
        }
        if (typeof Srl.toMinJSON === 'function'){
          return Srl.toMinJSON(model);
        }
        if (typeof Srl.toJSON === 'function'){
          return Srl.toJSON(model);
        }
      }
    } catch {}
    return (typeof model === 'object') ? { ...model } : model;
  }

  deserialize(min, ctx={}){
    if (min == null) return min;
    const Srl = this.serializer;
    try {
      if (Srl){
        if (typeof Srl.fromMinJSON_withEvents === 'function'){
          return Srl.fromMinJSON_withEvents(min, ctx);
        }
        if (typeof Srl.fromMinJSON === 'function'){
          return Srl.fromMinJSON(min, ctx);
        }
        if (typeof Srl.fromJSON === 'function'){
          return Srl.fromJSON(min, ctx);
        }
      }
    } catch {}
    return min;
  }
});

export default { Tclipboard };
const Serializer = new Tserializer();
const serializer = Serializer;

export function installClipboard(app, opts = {}){
  const service = new Tclipboard(opts);
  if (app && app.use) app.use('clipboard', service);
  return service;
}

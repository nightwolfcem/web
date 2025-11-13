// ThistoryManager.full-merged.js
// core12 ThistoryManager + Thistory.js geniş birleşim
'use strict';

// --- Esnek importlar (CLASS/Tevents) ---
import * as CLASSMOD from './CLASS.js';
import * as EVMOD    from './Tevents.js';
import { getElement } from './utils.js';
const __pickFn = (M, ...paths)=>{
  for (const p of paths){
    const v = p.split('.').reduce((a,k)=> a && a[k], M);
    if (typeof v === 'function') return v;
  }
  return (typeof M?.default === 'function') ? M.default : null;
};

const CLASS   = __pickFn(CLASSMOD, 'default.CLASS','CLASS') || ((C)=>C);
const Tevents = __pickFn(EVMOD,    'default.Tevents','Tevents','Tevent','EventBus');

const __isObj = (v)=> v && typeof v==='object' && !Array.isArray(v);
const __now   = ()=> Date.now();

// --- path helper: "a.b[2].c" | ["a","b",2,"c"] ---
function __splitPath(path){
  if (Array.isArray(path)) return path.slice();
  const out = [];
  String(path).replace(/\[(\d+)\]|[^.[\]]+/g, (m, idx) => {
    out.push(idx !== undefined ? Number(idx) : m);
  });
  return out;
}
function __getByPath(obj, path){
  const segs = __splitPath(path);
  let cur = obj;
  for (let i=0;i<segs.length;i++){
    if (cur == null) return undefined;
    cur = cur[segs[i]];
  }
  return cur;
}
function __setByPath(obj, path, val){
  const segs = __splitPath(path);
  let cur = obj;
  for (let i=0;i<segs.length-1;i++){
    const k = segs[i];
    if (cur[k] == null || (typeof cur[k] !== 'object' && !Array.isArray(cur[k]))){
      cur[k] = (typeof segs[i+1] === 'number') ? [] : Object.create(null);
    }
    cur = cur[k];
  }
  const last = segs[segs.length-1];
  const old = cur[last];
  cur[last] = val;
  return old;
}
const __rtomap = (r)=> !r ? r : (('x' in r || 'y' in r || 'w' in r || 'h' in r) ? { left:r.x, top:r.y, width:r.w, height:r.h } : r);

// === Commands ===
export const Tcommand = CLASS(class Tcommand {
  constructor({ label='cmd' } = {}){ this.label=label; this.ts=__now(); }
  do(){} undo(){} redo(){ this.do?.(); } mergeWith(){ return false; } toPatch(){ return null; } isNoop(){ return false; }
});

export const TcompositeCommand = CLASS(class TcompositeCommand extends Tcommand {
  constructor(cmds=[], { label='composite' } = {}){ super({label}); this.cmds=[...cmds]; }
  add(cmd){ if (cmd && (!cmd.isNoop || !cmd.isNoop())) this.cmds.push(cmd); return this; }
  do(){ for(const c of this.cmds) c?.do?.(); }
  undo(){ for(let i=this.cmds.length-1;i>=0;i--) this.cmds[i]?.undo?.(); }
  redo(){ for(const c of this.cmds) c?.redo?.(); }
  mergeWith(other){ if(!(other instanceof TcompositeCommand)) return false; if(this.label&&other.label&&this.label!==other.label) return false; this.cmds.push(...other.cmds); this.ts=other.ts; return true; }
  toPatch(){ const items=this.cmds.map(c=>c?.toPatch?.()).filter(Boolean); return items.length?{type:'composite',items}:null; }
  isNoop(){ return this.cmds.length===0; }
});

export const TpropCommand = CLASS(class TpropCommand extends Tcommand {
  constructor(target, path, value, label='prop'){ super({label}); this.t=target; this.p=path; this.v=value; this._had=false; this._prev=undefined; }
  prime(prev){ this._had=true; this._prev=prev; return this; }
  do(){ if(!this._had){ this._prev=(typeof this.p==='string'||Array.isArray(this.p))?__getByPath(this.t,this.p):this.t[this.p]; this._had=true; }
       if (typeof this.p==='string'||Array.isArray(this.p)) __setByPath(this.t,this.p,this.v); else this.t[this.p]=this.v; }
  undo(){ if(!this._had) return; if(typeof this.p==='string'||Array.isArray(this.p)) __setByPath(this.t,this.p,this._prev); else this.t[this.p]=this._prev; }
  mergeWith(other){ if(!(other instanceof TpropCommand)||this.t!==other.t) return false; if(String(this.p)!==String(other.p)) return false; this.v=other.v; this.ts=other.ts; return true; }
  toPatch(){ return {type:'prop',path:this.p,value:this.v}; }
});

export const TarraySpliceCommand = CLASS(class TarraySpliceCommand extends Tcommand {
  constructor(arr, index, deleteCount, items=[], label='array-splice'){ super({label}); this.arr=arr; this.index=index|0; this.deleteCount=deleteCount|0; this.items=Array.isArray(items)?items.slice():[items]; this._removed=null; }
  do(){ this._removed=this.arr.splice(this.index,this.deleteCount,...this.items); }
  undo(){ this.arr.splice(this.index,this.items.length,...this._removed); }
  toPatch(){ return {type:'array-splice', index:this.index, deleteCount:this.deleteCount, items:this.items.slice()}; }
  mergeWith(next){ if(!(next instanceof TarraySpliceCommand)||this.arr!==next.arr) return false; if(this.index+this.items.length!==next.index) return false; if(this.deleteCount!==0||next.deleteCount!==0) return false; this.items.push(...next.items); return true; }
});

export const TdomStyleCommand = CLASS(class TdomStyleCommand extends Tcommand {
  constructor(el, styleObj, prevStyleObj=null, label='dom-style'){ super({label}); this.el=el; this.newS=styleObj||{}; this.oldS=prevStyleObj;
    if(!this.oldS){ this.oldS={}; for(const k of Object.keys(this.newS)){ this.oldS[k]=el?.style?.[k] ?? ''; } } }
  _apply(S){ const s=this.el?.style; if(!s) return; for(const k of Object.keys(S)){ s[k]=S[k]; } }
  do(){ this._apply(this.newS); } undo(){ this._apply(this.oldS); }
  mergeWith(other){ if(!(other instanceof TdomStyleCommand)||this.el!==other.el) return false; Object.assign(this.newS,other.newS); this.ts=other.ts; return true; }
  toPatch(){ return {type:'dom-style', targetId:this.el?.id||null, style:{...this.newS}}; }
});

export const TdomAttrCommand = CLASS(class TdomAttrCommand extends Tcommand {
  constructor(el, attrs, prevAttrs=null, label='dom-attr'){ super({label}); this.el=el; this.newA=attrs||{}; this.oldA=prevAttrs;
    if(!this.oldA){ this.oldA={}; for(const k of Object.keys(this.newA)){ this.oldA[k]=el?.getAttribute?.(k); } } }
  _apply(A){ if(!this.el) return; for(const k of Object.keys(A)){ const v=A[k]; (v==null) ? this.el.removeAttribute?.(k) : this.el.setAttribute?.(k,String(v)); } }
  do(){ this._apply(this.newA); } undo(){ this._apply(this.oldA); }
  mergeWith(other){ if(!(other instanceof TdomAttrCommand)||this.el!==other.el) return false; Object.assign(this.newA,other.newA); this.ts=other.ts; return true; }
  toPatch(){ return {type:'dom-attr', targetId:this.el?.id||null, attrs:{...this.newA}}; }
});

export const TdomDatasetCommand = CLASS(class TdomDatasetCommand extends Tcommand {
  constructor(el, patch, prev=null, label='dom-dataset'){ super({label}); this.el=el; this.newD=patch||{}; this.oldD=prev;
    if(!this.oldD){ this.oldD={}; for(const k of Object.keys(this.newD)){ this.oldD[k]=el?.dataset?.[k] ?? ''; } } }
  _apply(D){ if(!this.el) return; for(const k of Object.keys(D)){ const v=D[k]; if(v==null||v==='') delete this.el.dataset[k]; else this.el.dataset[k]=String(v); } }
  do(){ this._apply(this.newD); } undo(){ this._apply(this.oldD); }
  mergeWith(other){ if(!(other instanceof TdomDatasetCommand)||this.el!==other.el) return false; Object.assign(this.newD,other.newD); this.ts=other.ts; return true; }
  toPatch(){ return {type:'dom-dataset', targetId:this.el?.id||null, data:{...this.newD}}; }
});

export const TdomInsertCommand = CLASS(class TdomInsertCommand extends Tcommand {
  constructor(parent, node, before=null, label='insert'){ super({label}); this.p=parent; this.n=node; this.b=before??null; this._op=null; this._on=null; }
  do(){ if(this._op===null){ this._op=this.n.parentNode; this._on=this.n.nextSibling; } this.p.insertBefore(this.n, this.b||null); }
  undo(){ if(this._op){ this._op.insertBefore(this.n, this._on||null); } else if(this.n.parentNode){ this.n.parentNode.removeChild(this.n); } }
  toPatch(){ return {type:'dom-insert', parentId:this.p?.id||null, nodeTag:(this.n?.tagName||'#text'), beforeId:this.b?.id||null}; }
});

export const TdomRemoveCommand = CLASS(class TdomRemoveCommand extends Tcommand {
  constructor(node, label='remove'){ super({label}); this.n=node; this._p=null; this._next=null; }
  do(){ this._p=this.n.parentNode; this._next=this.n.nextSibling; if(this.n.parentNode) this.n.parentNode.removeChild(this.n); }
  undo(){ if(this._p){ this._p.insertBefore(this.n, this._next||null); } }
  toPatch(){ return {type:'dom-remove', targetId:this.n?.id||null}; }
});

export const TdomMoveCommand = CLASS(class TdomMoveCommand extends Tcommand {
  constructor(node, newParent, before=null, label='move'){ super({label}); this.n=node; this.p=newParent; this.b=before??null; this._op=null; this._on=null; }
  do(){ if(!this._op){ this._op=this.n.parentNode; this._on=this.n.nextSibling; } this.p.insertBefore(this.n, this.b||null); }
  undo(){ if(this._op){ this._op.insertBefore(this.n, this._on||null); } }
  mergeWith(other){ if(!(other instanceof TdomMoveCommand)||this.n!==other.n) return false; this.p=other.p; this.b=other.b; this.ts=other.ts; return true; }
  toPatch(){ return {type:'dom-move', targetId:this.n?.id||null, parentId:this.p?.id||null, beforeId:this.b?.id||null}; }
});

export const TdomSizeCommand = CLASS(class TdomSizeCommand extends Tcommand {
  constructor(el, oldRect, newRect, label='size'){ super({label}); this.el=el; this.old=__rtomap(oldRect); this.new=__rtomap(newRect); }
  _apply(r){ const s=this.el?.style; if(!s||!r) return;
    if('left' in r)   s.left   = r.left   + 'px';
    if('top' in r)    s.top    = r.top    + 'px';
    if('width' in r)  s.width  = r.width  + 'px';
    if('height' in r) s.height = r.height + 'px';
  }
  do(){ this._apply(this.new); } undo(){ this._apply(this.old); }
  mergeWith(other){ if(!(other instanceof TdomSizeCommand)||this.el!==other.el) return false; this.new={...this.new,...other.new}; this.ts=other.ts; return true; }
  toPatch(){ const n=this.new||{}; return {type:'dom-style', targetId:this.el?.id||null, style:{left:n.left+'px', top:n.top+'px', width:n.width+'px', height:n.height+'px'}}; }
});

// === Command History ===
export const TcommandHistory = CLASS(class TcommandHistory {
  constructor(limit=1000, mergeWindowMs=160){ this.limit=limit|0; this.mergeWindowMs=mergeWindowMs|0; this._stack=[]; this._index=-1; }
  clear(){ this._stack.length=0; this._index=-1; }
  canUndo(){ return this._index>=0; } canRedo(){ return this._index<this._stack.length-1; }
  get size(){ return this._stack.length; } get index(){ return this._index; }
  top(){ return this._stack[this._index]||null; }
  tryMerge(cmd){ const top=this.top(); if(!top) return false; if(this.mergeWindowMs>0 && (__now()-top.ts)>this.mergeWindowMs) return false; return !!(top.cmd?.mergeWith && top.cmd.mergeWith(cmd)); }
  push(cmd){ if(this._index<this._stack.length-1) this._stack.splice(this._index+1); this._stack.push({cmd,ts:cmd.ts||__now()}); if(this._stack.length>this.limit) this._stack.shift(); this._index=this._stack.length-1; }
  exec(cmd,{tryMerge=false}={}){ if(tryMerge && this.tryMerge(cmd)){ cmd.do?.(); this._stack[this._index].ts=cmd.ts||__now(); return; } cmd.do?.(); this.push(cmd); }
  undo(){ if(!this.canUndo()) return false; const rec=this._stack[this._index--]; rec?.cmd?.undo?.(); return true; }
  redo(){ if(!this.canRedo()) return false; const rec=this._stack[++this._index]; rec?.cmd?.do?.(); return true; }
});

// === ThistoryManager ===
export const ThistoryManager = CLASS(class ThistoryManager extends Tevents {
  constructor({ enabled=true, limit=1000, mergeWindowMs=160, serializer=null, root=null, diffMode='none', ignoreProps=null } = {}){
    super(); this.enabled=!!enabled; this.history=new TcommandHistory(limit, mergeWindowMs);
    this.serializer=serializer || (globalThis?.Tserializer || globalThis?.serializer || null);
    this.root=root||null; this.diffMode=diffMode; this.ignoreProps=ignoreProps;
    this.groups=[];
  }

  // Durum
  setEnabled(v){ this.enabled=!!v; this.emit?.('enabled',{on:this.enabled}); return this; }
  toggle(){ return this.setEnabled(!this.enabled); }
  clear(){ this.history.clear(); this.emit?.('history:clear'); return this; }
  canUndo(){ return this.history.canUndo(); } canRedo(){ return this.history.canRedo(); }
  get size(){ return this.history.size; } get index(){ return this.history.index; }

  // Grup/Transaction
  beginGroup(label='group'){ const g=new TcompositeCommand([], {label}); this.groups.push(g); this.emit?.('group:begin',{label,depth:this.groups.length}); return g; }
  endGroup(commit=true){ const g=this.groups.pop(); if(!g) return null; if(commit && !g.isNoop()){ this.history.push(g); this.emit?.('history:exec',{cmd:g}); this.emit?.('push',{cmd:g}); this._postCommitPayload(g,g.label||'group'); } this.emit?.('group:end',{commit,depth:this.groups.length}); return g; }
  cancelGroup(){ const g=this.groups.pop(); if(!g) return null; try{ g.undo?.(); }catch{} this.emit?.('group:end',{commit:false,depth:this.groups.length}); return g; }

  // alias (uyumluluk)
  begin(label){ return this.beginGroup(label); }
  end(labelOrCommit=true){ return this.endGroup(labelOrCommit===true || labelOrCommit===undefined); }
  cancel(){ return this.cancelGroup(); }

  // Yürütme
  exec(cmd, opts={}){ if(!cmd || !this.enabled) return this; const tryMerge=!!opts.tryMerge;
    if(this.groups.length){ cmd.do?.(); this.groups[this.groups.length-1].add(cmd); return this; }
    if(tryMerge && this.history.tryMerge(cmd)){ cmd.do?.(); this.emit?.('merge',{cmd}); this._postCommitPayload(this.history.top()?.cmd, cmd.label||'merge'); return this; }
    this.history.push(cmd); cmd.do?.(); this.emit?.('history:exec',{cmd}); this.emit?.('push',{cmd}); this._postCommitPayload(cmd, cmd.label||''); return this;
  }
  execMany(cmds=[],opts){ for(const c of (cmds||[])) this.exec(c,opts); return this; }
  batch(label, fn){ const g=this.beginGroup(label||'batch'); try{ fn&&fn(this); } finally { this.endGroup(true); } return g; }
  execProp(target, path, value, label='prop'){ return this.exec(new TpropCommand(target,path,value,label), {tryMerge:true}); }

  undo(){ const ok=this.history.undo(); if(ok){ this.emit?.('history:undo'); this.emit?.('undo',{index:this.history.index}); } return ok; }
  redo(){ const ok=this.history.redo(); if(ok){ this.emit?.('history:redo'); this.emit?.('redo',{index:this.history.index}); } return ok; }

  // Snapshot
  snapshotDiff({ space=0, updateBaseline=true } = {}){ const S=this.serializer; if(!S||!this.root||!S.serialize) return null; try{ return S.serialize(this.root,{space,ignoreProps:this.ignoreProps,updateBaseline}); }catch{ return null; } }
  snapshotFull({ space=0 } = {}){ const S=this.serializer; if(!S||!this.root||!S.stringify) return null; try{ return S.stringify(this.root,{space}); }catch{ return null; } }

  _postCommitPayload(cmd,label){ let payload=null;
    if(this.diffMode==='diff'){ payload=this.snapshotDiff({space:0,updateBaseline:true}); }
    else if(this.diffMode==='full'){ payload=this.snapshotFull({space:0}); }
    else { payload=cmd?.toPatch?.()||null; }
    this.emit?.('commit',{label,index:this.history.index,ts:__now(),payload});
  }

  // DOM Kısayollar


  insert(parent, node, before=null, label='insert'){ return this.exec(new TdomInsertCommand(getElement(parent), getElement(node), getElement(before), label)); }
  remove(node, label='remove'){ return this.exec(new TdomRemoveCommand(getElement(node), label)); }
  move(node, newParent, before=null, label='move'){ return this.exec(new TdomMoveCommand(getElement(node), getElement(newParent), getElement(before), label), {tryMerge:true}); }

  style(target, patch={}, label='style'){ return this.exec(new TdomStyleCommand(getElement(target), patch, null, label), {tryMerge:true}); }
  attr(target, attrs={}, label='attr'){ return this.exec(new TdomAttrCommand(getElement(target), attrs, null, label), {tryMerge:true}); }
  dataset(target, data={}, label='dataset'){ return this.exec(new TdomDatasetCommand(getElement(target), data, null, label), {tryMerge:true}); }
  text(target, textValue, label='text'){ const el=getElement(target); return this.exec(new TpropCommand(el,'textContent',textValue,label), {tryMerge:true}); }

  className(target, next, label='className'){ const el=getElement(target); const prev=String(el.className||''); el.className=String(next||''); return this.exec(new TdomAttrCommand(el, { class: el.className }, { class: prev }, label), {tryMerge:true}); }
  classAdd(target, name, label='classAdd'){ const el=getElement(target); const set=new Set(String(el.className||'').split(/\s+/).filter(Boolean)); set.add(String(name)); return this.className(el, Array.from(set).join(' '), label); }
  classRemove(target, name, label='classRemove'){ const el=getElement(target); const set=new Set(String(el.className||'').split(/\s+/).filter(Boolean)); set.delete(String(name)); return this.className(el, Array.from(set).join(' '), label); }
  classToggle(target, name, force=null, label='classToggle'){ const el=getElement(target); const set=new Set(String(el.className||'').split(/\s+/).filter(Boolean)); const on=(force===null)?!set.has(String(name)):!!force; if(on) set.add(String(name)); else set.delete(String(name)); return this.className(el, Array.from(set).join(' '), label); }

  rect(target, patch={}, label='rect'){ const el=getElement(target); const st={}; const r={};
    if('left' in patch){ st.left = patch.left+'px'; r.left=patch.left; }
    if('top' in patch){ st.top = patch.top+'px'; r.top=patch.top; }
    if('width' in patch){ st.width = patch.width+'px'; r.width=patch.width; }
    if('height' in patch){ st.height = patch.height+'px'; r.height=patch.height; }
    // stil uygula + explicit size komutu (geriye dönük uyum)
    return this.execMany([ new TdomStyleCommand(el, st, null, label), new TdomSizeCommand(el, null, r, label) ]);
  }
  size(target, patch={}, label='size'){ const el=getElement(target); const st={}; const r={};
    if('width' in patch){ st.width=patch.width+'px'; r.width=patch.width; }
    if('height' in patch){ st.height=patch.height+'px'; r.height=patch.height; }
    return this.execMany([ new TdomStyleCommand(el, st, null, label), new TdomSizeCommand(el, null, r, label) ]);
  }

  // Generic prop
  prop(target, pathArray, next, label='prop'){ return this.exec(new TpropCommand(target, pathArray, next, label), {tryMerge:true}); }

  // Tinteract köprüsü
  bindInteract(interact){
    const before=new Map();
    const get=(n)=>({ left:parseFloat(n.style.left||0), top:parseFloat(n.style.top||0), width:parseFloat(n.style.width||0), height:parseFloat(n.style.height||0) });
    interact.on('move:start',   ({group})=>{ before.clear(); group.forEach(n=> before.set(n, get(n))); });
    interact.on('resize:start', ({group})=>{ before.clear(); group.forEach(n=> before.set(n, get(n))); });
    const commit=(group,label)=>{ group.forEach(n=>{ const b=before.get(n); if(!b) return; const a=get(n);
      if (b.left!==a.left || b.top!==a.top || b.width!==a.width || b.height!==a.height){ this.rect(n, a, label); } }); before.clear(); };
    interact.on('move:end',   ({group})=> commit(group,'move'));
    interact.on('resize:end', ({group})=> commit(group,'resize'));
    return this;
  }
});

export default ThistoryManager;


// === Observers & Event Tracking (integrated) ===
function _rect(el){ const r=el.getBoundingClientRect(); return { left:Math.round(r.left), top:Math.round(r.top), width:Math.round(r.width), height:Math.round(r.height) }; }
function _equalsRect(a,b){ return a.left===b.left && a.top===b.top && a.width===b.width && a.height===b.height; }
function _cssTextToObj(s){ const o={}; if(!s) return o; for(const part of String(s).split(';')){ const i=part.indexOf(':'); if(i>0){ const k=part.slice(0,i).trim(); const v=part.slice(i+1).trim(); if(k) o[k]=v; } } return o; }
function _diffStyle(a,b){ const p={}; const keys=new Set([...Object.keys(a), ...Object.keys(b)]); for(const k of keys){ if(a[k]!==b[k]) p[k]=b[k]; } return p; }
function _throttle(fn, ms){ let lock=false, lastArgs=null, lastThis=null; const fire=()=>{ lock=false; if(lastArgs){ const a=lastArgs; const t=lastThis; lastArgs=null; lastThis=null; run(a,t);} }; const run=(args,ctx)=>{ try{ fn.apply(ctx,args); }finally{ setTimeout(fire, ms|0||0); } }; return function(...a){ if(lock){ lastArgs=a; lastThis=this; return; } lock=true; run(a,this); }; }

ThistoryManager.prototype.suspendObservers = function(){
  if(!this._tracked) return true;
  for(const rec of this._tracked.values()){ try{ rec.rez?.disconnect(); }catch{} try{ rec.mut?.disconnect(); }catch{} }
  this.emit?.('observe:suspend',{});
  return true;
};
ThistoryManager.prototype.resumeObservers = function(){
  if(!this._tracked) return true;
  for(const [target,rec] of this._tracked.entries()){
    try{ rec.rez && rec.rez.observe(rec.el); }catch{}
    try{ rec.mut && rec.mut.observe(rec.el, rec.cfg); }catch{}
  }
  this.emit?.('observe:resume',{});
  return true;
};

ThistoryManager.prototype.addTrack = function(target, opts={}){
  const el = (target && target.nodeType===1) ? target : (target && (target.$el||target.el||target.htmlObject)) || null;
  if(!el) return false;
  if(!this._tracked) this._tracked = new Map();
  if(this._tracked.has(target)) this.removeTrack(target);

  const final = { trackStyle:true, trackResize:true, trackChildren:false, trackAttr:false, throttleMs:50, onlyAttr:null, ignoreAttr:null, subtree:false, ...opts };
  const rec = { el, cfg:{ attributes: !!(final.trackStyle||final.trackAttr), attributeOldValue:true, childList:!!final.trackChildren, subtree:!!final.subtree, characterData:false }, rez:null, mut:null };
  const onlyAttr = Array.isArray(final.onlyAttr) ? new Set(final.onlyAttr.map(String)) : null;
  const ignoreSet = Array.isArray(final.ignoreAttr) ? new Set(final.ignoreAttr.map(String)) : null;
  const ignoreRe  = final.ignoreAttr instanceof RegExp ? final.ignoreAttr : null;

  if(final.trackResize && typeof ResizeObserver!=='undefined'){
    let last=_rect(el);
    rec.rez = new ResizeObserver(_throttle((entries)=>{
      const grp = this.beginGroup('resize');
      try{
        for(const e of entries){
          const cur=_rect(e.target);
          if(!_equalsRect(last,cur)){
            this.exec(new TdomSizeCommand(e.target, last, cur, 'resize@size'));
            last = cur;
          }
        }
      } finally { this.endGroup(true); }
      this.emit?.('observe:resize',{el});
    }, final.throttleMs|0||50));
    try{ rec.rez.observe(el); }catch{}
  }

  if(typeof MutationObserver!=='undefined' && (final.trackStyle || final.trackAttr || final.trackChildren)){
    rec.mut = new MutationObserver(_throttle((mutations)=>{
      const grp = this.beginGroup('mutations');
      try{
        for(const m of mutations){
          if(m.type==='attributes'){
            // filter which attribute
            if(onlyAttr && !onlyAttr.has(m.attributeName)) continue;
            if(ignoreSet && ignoreSet.has(m.attributeName)) continue;
            if(ignoreRe && ignoreRe.test(m.attributeName)) continue;
            const name=m.attributeName;
            if(name==='style' && final.trackStyle){
              const before=_cssTextToObj(m.oldValue||'');
              const after=_cssTextToObj(m.target.style?.cssText||'');
              const patch=_diffStyle(before, after);
              if(Object.keys(patch).length){
                this.exec(new TdomStyleCommand(m.target, patch, 'dom@style'), { tryMerge:true });
              }
            } else if(name!=='style' && final.trackAttr){
              const v=m.target.getAttribute(name);
              const attrs={}; attrs[name]=v;
              this.exec(new TdomAttrCommand(m.target, attrs, 'dom@attr'), { tryMerge:true });
            }
          } else if(m.type==='childList' && final.trackChildren){
            for(const n of m.addedNodes||[]){
              if(n.parentNode===m.target){
                this.exec(new TdomInsertCommand(m.target, n, n.nextSibling||null, 'dom@insert'));
              }
            }
            for(const n of m.removedNodes||[]){
              this.exec(new TdomRemoveCommand(n, 'dom@remove'));
            }
          }
        }
      } finally { this.endGroup(true); }
      this.emit?.('observe:mutations',{el, mutations});
    }, final.throttleMs|0||50));
    try{ rec.mut.observe(el, rec.cfg); }catch{}
  }

  this._tracked.set(target, rec);
  this.emit?.('track:add', { target, el, opts:final });
  return true;
};

ThistoryManager.prototype.removeTrack = function(target){
  if(!this._tracked) return false;
  const rec=this._tracked.get(target);
  if(!rec) return false;
  try{ rec.rez?.disconnect(); }catch{} try{ rec.mut?.disconnect(); }catch{}
  this._tracked.delete(target);
  this.emit?.('track:remove',{target});
  return true;
};

ThistoryManager.prototype.attachEventTracking = function(){
  if(this._eventPatched || typeof EventTarget==='undefined') return false;
  const mgr=this;
  const OA=EventTarget.prototype.addEventListener;
  const OR=EventTarget.prototype.removeEventListener;
  this._eventPatched=true;

  EventTarget.prototype.addEventListener = function(type, listener, options){
    const res = OA.call(this,type,listener,options);
    try{
      const t=this, l=listener, o=options;
      const cmd = {
        label:'event@add', do(){}, undo(){ try{ OR.call(t,type,l,o); }catch{} }, redo(){ try{ OA.call(t,type,l,o); }catch{} },
        toPatch(){ return { type:'event', op:'add', targetId:t?.id||null, event:type, listener:(l && (l.name||null)) }; }
      };
      mgr.exec(cmd, { tryMerge:false });
    }catch{}
    return res;
  };
  EventTarget.prototype.removeEventListener = function(type, listener, options){
    const res = OR.call(this,type,listener,options);
    try{
      const t=this, l=listener, o=options;
      const cmd = {
        label:'event@remove', do(){}, undo(){ try{ OA.call(t,type,l,o); }catch{} }, redo(){ try{ OR.call(t,type,l,o); }catch{} },
        toPatch(){ return { type:'event', op:'remove', targetId:t?.id||null, event:type, listener:(l && (l.name||null)) }; }
      };
      mgr.exec(cmd, { tryMerge:false });
    }catch{}
    return res;
  };
  this.emit?.('eventTracking:on', {});
  return true;
};

ThistoryManager.prototype.detachEventTracking = function(){
  if(!this._eventPatched || typeof EventTarget==='undefined') return false;
  // Basit kapama (orijinal prototipleri saklamadığımız için yeniden yükleme önerilir)
  this._eventPatched=false;
  this.emit?.('eventTracking:off', {});
  return true;
};

export function installHistory(app, opts = {}){
  const service = new ThistoryManager(opts);
  if (app && app.setHistory) app.setHistory(service);
  if (app && app.use) app.use('history', service);
  return service;
}

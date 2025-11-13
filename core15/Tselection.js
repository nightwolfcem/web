// Tselection.js — centralized model, history-aware, CLASS-based
import CLASS from './CLASS.js';
import { Tevents } from './Tevents.js';
import { Tcommand } from './Tcommand.js';

/* small helpers */
const _arr = (x)=>{
  if (x == null) return [];
  if (Array.isArray(x)) return x.slice();
  if (typeof x[Symbol.iterator] === 'function') return Array.from(x);
  return [x];  // işte Telement/Wrapped burada tek elemana sarılıyor
};

const _uniq = (xs)=> Array.from(new Set(xs));

/* ---------- History command ---------- */
class TselectionChange extends Tcommand{
  constructor(model, addIds=[], removeIds=[], label='select'){
    super(label);
    this.model = model;
    this.addIds = _uniq(_arr(addIds));
    this.removeIds = _uniq(_arr(removeIds));
    this._inverse = null;
  }
  do(){
    if (!this._inverse){
      const cur = new Set(this.model.selectedIds());
      const will = new Set(cur);
      for (const id of this.removeIds) will.delete(id);
      for (const id of this.addIds)   will.add(id);
      const invAdd=[]; const invRem=[];
      for (const id of cur) if (!will.has(id)) invAdd.push(id);
      for (const id of will) if (!cur.has(id)) invRem.push(id);
      this._inverse = { addIds:invAdd, removeIds:invRem };
    }
    this.model.applyIds({ add:this.addIds, remove:this.removeIds });
  }
  undo(){
    const inv=this._inverse||{addIds:[],removeIds:[]};
    this.model.applyIds({ add:inv.addIds, remove:inv.removeIds });
  }
  toPatch(){ return { type:'selection', add:this.addIds.slice(), remove:this.removeIds.slice() }; }
  mergeWith(next){
    if (!(next instanceof TselectionChange)) return false;
    if (next.model !== this.model) return false;
    const add = new Set(this.addIds), rem = new Set(this.removeIds);
    for (const id of next.addIds){ if (rem.has(id)) rem.delete(id); else add.add(id); }
    for (const id of next.removeIds){ if (add.has(id)) add.delete(id); else rem.add(id); }
    this.addIds = Array.from(add); this.removeIds = Array.from(rem);
    return true;
  }
}

/* ---------- Selection model ---------- */
export const Tselection = CLASS(class Tselection extends CLASS.extends(Tevents){
  /**
   * @param {Object} opts
   *  - mode: 'single'|'multiple' (default 'multiple')
   *  - idOf(item): -> id (string|number)
   *  - getById(id): -> item|null
   *  - getRect(item): -> {left,top,width,height}  (opsiyonel; range için)
   *  - history: ThistoryManager
   */
  constructor(opts={}){
    super();
    const { mode='multiple', idOf=null, getById=null, getRect=null, history=null } = opts||{};
    this.mode    = (mode==='single')? 'single' : 'multiple';
    this._set    = new Set();
    this._order  = [];            // seçim sırasını koru
    this._anchor = null;          // range için referans id
    this.history = history || null;

    // dependency injections
    this._idOf    = typeof idOf==='function'
      ? idOf
      : (it)=> it.$class.name +"-"+it.id;

    this._getById = typeof getById==='function'
      ? getById
      : (id)=>{
          if (id == null) return null;
          if (typeof id === 'object') return id;
          if (typeof document === 'undefined') return null;
          try{
            const doc = document;
            const key = String(id);
            const sel = `[data-id="${key}"],#${(globalThis.CSS && CSS.escape) ? CSS.escape(key) : key.replace(/"/g,'\"')}`;
            const el = doc.querySelector(sel);
            if (!el) return null;
            return el.owner || el;
          }catch(_){
            try{
              const el = document.getElementById(String(id));
              return el && (el.owner || el);
            }catch(__){
              return null;
            }
          }
        };

    this._getRect = typeof getRect==='function' ? getRect : (_)=> null;
  }


  _emitChange(emit=true){
    if (!emit) return this;
    const ids = this.selectedIds();
    const prev = Array.isArray(this._lastIds) ? this._lastIds : [];
    const prevSet = new Set(prev);
    const curSet  = new Set(ids);

    const addedIds   = ids.filter(id => !prevSet.has(id));
    const removedIds = prev.filter(id => !curSet.has(id));

    this._lastIds = ids.slice();

    const addedItems   = addedIds.map(id => this._getById(id)).filter(it => it != null);
    const removedItems = removedIds.map(id => this._getById(id)).filter(it => it != null);

    this.emit('change', {
      ids,
      addedIds,
      removedIds,
      added: addedItems,
      removed: removedItems
    });

    return this;
  }

  /* ---- read ---- */
  list(){
    // _order sırasına göre mevcut item'ları dön
    const out=[];
    for (const id of this._order){
      if (this._set.has(id)){
        const it = this._getById(id);
        if (it!=null) out.push(it);
      }
    }
    return out;
  }
  selectedIds(){ return this._order.filter(id=>this._set.has(id)); }
  ids(){ return this.selectedIds(); }
  *values(){ for (const id of this.selectedIds()) yield id; }
  has(it){ const id = typeof it==='string'||typeof it==='number' ? it : this._idOf(it); return id!=null && this._set.has(id); }
  get anchor(){ return this._anchor; }

  /* ---- write / mutate ---- */
  clear(emit=true){
    if (this._set.size===0 && this._order.length===0) return this;
    this._set.clear();
    this._order.length=0;
    this._anchor=null;
    this._emitChange(emit);
    return this;
  }

  set(want, mode='replace', emit=true){
    // want: item[] | id[] | Set | Iterable
    const ids = _uniq(_arr(want).map(it=> (typeof it==='string'||typeof it==='number') ? it : this._idOf(it)).filter(v=>v!=null));
    if (this.mode==='single'){
      if (mode==='toggle'){
        const id = ids[0];
        if (id==null) return this;
        if (this._set.has(id)) return this.clear(emit);
        this._set.clear(); this._order.length=0;
        this._set.add(id); this._order.push(id); this._anchor=id;
        this._emitChange(emit);
    return this;
      }
      const id = ids[0];
      this._set.clear(); this._order.length=0;
      if (id!=null){ this._set.add(id); this._order.push(id); this._anchor=id; }
      this._emitChange(emit);
    return this;
    }

    if (mode==='replace'){
      const changed = ids.length!==this._order.length || ids.some((id,i)=> id!==this._order[i]);
      if (!changed) return this;
      this._set = new Set(ids);
      this._order = ids.slice();
      this._anchor = ids.length? ids[ids.length-1] : null;
      this._emitChange(emit);
    return this;
    }
    if (mode==='add'){
      let dirty=false;
      for (const id of ids){ if (!this._set.has(id)){ this._set.add(id); this._order.push(id); dirty=true; } }
      if (ids.length) this._anchor = ids[ids.length-1];
      if (dirty) this._emitChange(emit);
      return this;
    }
    if (mode==='remove'){
      let dirty=false;
      if (ids.length===0) return this;
      const rm = new Set(ids);
      this._order = this._order.filter(id=>{
        if (rm.has(id)){ if (this._set.delete(id)) dirty=true; return false; }
        return true;
      });
      if (rm.has(this._anchor)) this._anchor=null;
      if (dirty) this._emitChange(emit);
      return this;
    }
    if (mode==='toggle'){
      let dirty=false;
      for (const id of ids){
        if (this._set.has(id)){
          this._set.delete(id);
          const idx=this._order.indexOf(id);
          if (idx>=0) this._order.splice(idx,1);
          dirty=true;
        }else{
          this._set.add(id); this._order.push(id); this._anchor=id; dirty=true;
        }
      }
      if (dirty) this._emitChange(emit);
      return this;
    }
    return this;
  }

  replace(ids, emit=true){ return this.set(ids, 'replace', emit); }
  add(ids, emit=true){ return this.set(ids, 'add', emit); }
  remove(ids, emit=true){ return this.set(ids, 'remove', emit); }
  toggle(want, opts={}){
    const multi = !!(opts && opts.multi);
    const range = !!(opts && opts.range);
    // multi/range yoksa: replace (tekli seçim)
    return this.set(want, (multi || range) ? 'toggle' : 'replace', true);
  }

  /* low-level apply patch with items (convert to ids) */
  apply(diff, emit=true){
    const addIds = _uniq(_arr(diff.add).map(it=> (typeof it==='string'||typeof it==='number') ? it : this._idOf(it)).filter(v=>v!=null));
    const remIds = _uniq(_arr(diff.remove).map(it=> (typeof it==='string'||typeof it==='number') ? it : this._idOf(it)).filter(v=>v!=null));
    return this.applyIds({ add:addIds, remove:remIds }, emit);
  }

  applyIds(diff, emit=true){
    const addIds = _uniq(_arr(diff.add).filter(v=>v!=null));
    const remIds = _uniq(_arr(diff.remove).filter(v=>v!=null));
    if (!addIds.length && !remIds.length) return this;
    // mutate via modes to preserve order logic
    if (addIds.length) this.set(addIds, 'add', false);
    if (remIds.length) this.set(remIds, 'remove', false);
    this._emitChange(emit);
    return this;
  }

  /* history glue */
  _commit(diff, { label='select', tryMerge=true }={}){
    const addIds = _uniq(_arr(diff.add).map(it=> (typeof it==='string'||typeof it==='number') ? it : this._idOf(it)).filter(v=>v!=null));
    const remIds = _uniq(_arr(diff.remove).map(it=> (typeof it==='string'||typeof it==='number') ? it : this._idOf(it)).filter(v=>v!=null));
    if (this.history && (addIds.length || remIds.length)){
      const cmd = new TselectionChange(this, addIds, remIds, label);
      this.history.exec(cmd, { label, tryMerge });
      return this;
    }
    return this.applyIds({ add:addIds, remove:remIds });
  }
});

export default Tselection;

export function installSelection(app, opts = {}){
  const service = new Tselection(opts);
  if (app && typeof app.setSelection==='function') app.setSelection(service);
  if (app && typeof app.use==='function') app.use('selection', service);
  return service;
}

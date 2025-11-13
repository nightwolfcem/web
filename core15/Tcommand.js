'use strict';
// core11/Tcommand.js — canonical (Cem-spec)
// Tek komut kaynağı: Tcommand, TsetProp, Tbatch
// CLASS merkezli mimari; Min-JSON serializer destekli

import CLASS from './CLASS.js';

/* ------------------ Yol yardımcıları ------------------ */
function _getByPath(obj, path) {
  const p = Array.isArray(path) ? path : String(path).split('.');
  let t = obj;
  for (const k of p) t = t?.[k];
  return t;
}
function _setByPath(obj, path, val) {
  const p = Array.isArray(path) ? path : String(path).split('.');
  let t = obj;
  for (let i = 0; i < p.length - 1; i++) {
    const k = p[i];
    if (t[k] == null || typeof t[k] !== 'object') t[k] = {};
    t = t[k];
  }
  t[p[p.length - 1]] = val;
}

/* ------------------ Taban Komut ------------------ */
export const Tcommand = CLASS(class Tcommand {
  constructor(meta = {}) {
    this.label = meta.label ?? this.constructor.name;
    this.time  = meta.time  ?? Date.now();
    this.group = meta.group ?? null;  // transaction/grup kimliği
    this.tag   = meta.tag   ?? null;
  }

  // override noktaları
  do(_ctx){ /* override */ }
  undo(_ctx){ /* override */ }
  redo(ctx){ this.do(ctx); }

  // birleşim uzlaşma
  canMerge(_prev){ return false; }
  merge(prev){ return this; }

  // Serializer (Min-JSON)
  toMinJSON(){
    return { c:'Tcommand', a:[ { id:this.id, label:this.label, time:this.time, group:this.group, tag:this.tag } ] };
  }
  static fromMinJSON(doc/*{c,a}*/, _ctx){
    const meta = doc?.a?.[0] || {};
    return new this(meta);
  }

  setLabel(l){ this.label = l || null; return this; }
  setTag(t){ this.tag = t || null; return this; }

  // Tarihçe ile çalıştırma (history varsa push eder)
  applyWithHistory(action, meta = {}){
    if (!action || typeof action.do !== 'function') return this;

    if (meta && meta.label != null) this.label = meta.label;
    if (meta && meta.tag   != null) this.tag   = meta.tag;

    try { action.do(); } catch {}

    try {
      const h = this.history || this.historyManager || this.hm;
      if (h && typeof h.push === 'function'){
        const doFn   = () => { try { action.do(); } catch {} };
        const undoFn = () => { try { action.undo && action.undo(); } catch {} };
        h.push(doFn, undoFn, { type:'command', label:this.label, tag:this.tag });
      }
    } catch {}

    return this;
  }
});

/* ------------------ Özellik set etme ------------------ */
export const TsetProp = CLASS(class TsetProp extends CLASS.extends(Tcommand) {
  constructor(targetId, path, prevValue, nextValue, meta = {}) {
    super({ ...meta, label: meta.label ?? `Set ${Array.isArray(path) ? path.join('.') : path}` });
    this.targetId  = targetId;
    this.path      = Array.isArray(path) ? path : String(path).split('.');
    this.prevValue = prevValue;            // undefined olabilir → lazy capture
    this.nextValue = nextValue;
    this._captured = typeof prevValue !== 'undefined';
  }

  do(ctx){
    const obj = ctx?.resolve?.(this.targetId);
    if (!obj) return;
    if (!this._captured) {
      this.prevValue = _getByPath(obj, this.path);
      this._captured = true;
    }
    _setByPath(obj, this.path, this.nextValue);
  }

  undo(ctx){
    const obj = ctx?.resolve?.(this.targetId);
    if (!obj) return;
    _setByPath(obj, this.path, this.prevValue);
  }

  canMerge(prev){
    return prev instanceof TsetProp &&
           prev.targetId === this.targetId &&
           prev.path.length === this.path.length &&
           prev.path.every((p,i)=>p===this.path[i]);
  }
  merge(prev){
    // Eski prev korunur; son next geçerli olur
    return new TsetProp(this.targetId, this.path, prev.prevValue, this.nextValue, { group:this.group, label:this.label, time:this.time });
  }

  // Ardışık set'leri tek komuta sıkıştırmak için kolaylık
  squashWith(other){
    if (!(other instanceof TsetProp)) return null;
    if (this.targetId !== other.targetId) return null;
    const a = this.path || [], b = other.path || [];
    if (a.length !== b.length || a.some((v,i)=>v!==b[i])) return null;
    const out = new TsetProp(this.targetId, this.path, this.prevValue, other.nextValue, other.meta || this.meta || {});
    if (other.label) out.label = other.label;
    return out;
  }

  toMinJSON(){
    return {
      c:'TsetProp',
      a:[
        this.targetId,
        this.path,
        this.prevValue,
        this.nextValue,
        { id:this.id, label:this.label, time:this.time, group:this.group, tag:this.tag }
      ]
    };
  }
  static fromMinJSON(doc, _ctx){
    const [targetId, path, prevValue, nextValue, meta] = doc?.a || [];
    return new TsetProp(targetId, path, prevValue, nextValue, meta || {});
  }
});

/* ------------------ Batch/Transaction ------------------ */
export const Tbatch = CLASS(class Tbatch extends CLASS.extends(Tcommand) {
  constructor(commands = [], meta = {}) {
    super({ ...meta, label: meta.label ?? 'Batch' });
    this.commands = Array.isArray(commands) ? commands.slice() : [];
  }

  do(ctx){ for (const c of this.commands) c?.do?.(ctx); }
  undo(ctx){ for (let i=this.commands.length-1; i>=0; i--) this.commands[i]?.undo?.(ctx); }

  // iç içe Tbatch'leri düzleştir
  flatten(){
    if (!this.commands) return this;
    const out = [];
    for (const c of this.commands){
      if (c && c.constructor && c.constructor.name === 'Tbatch' && Array.isArray(c.commands)){
        out.push(...c.commands);
      } else {
        out.push(c);
      }
    }
    this.commands = out;
    return this;
  }

  // ardışık komutları sıkıştır (TsetProp-aware)
  squash(){
    if (!Array.isArray(this.commands)) return this;
    const res = [];
    for (const cmd of this.commands){
      const last = res[res.length-1];
      if (last && typeof last.squashWith === 'function' && cmd){
        const sq = last.squashWith(cmd);
        if (sq){ res[res.length-1] = sq; continue; }
      }
      res.push(cmd);
    }
    this.commands = res;
    return this;
  }

  canMerge(prev){ return prev instanceof Tbatch && this.group && prev.group && this.group === prev.group; }
  merge(prev){ return new Tbatch([ ...prev.commands, ...this.commands ], { group:this.group, label:this.label, time:this.time }); }

  toMinJSON(){
    return {
      c:'Tbatch',
      a:[
        this.commands.map(c=>c?.toMinJSON?.()||null),
        { id:this.id, label:this.label, time:this.time, group:this.group, tag:this.tag }
      ]
    };
  }
  static fromMinJSON(doc, ctx){
    const [arr, meta] = doc?.a || [[],{}];
    const cmds = (arr||[]).map(d=>{
      if (!d || !d.c) return null;
      switch(d.c){
        case 'TsetProp': return TsetProp.fromMinJSON(d, ctx);
        case 'Tbatch':   return Tbatch.fromMinJSON(d, ctx);
        default:         return Tcommand.fromMinJSON(d, ctx);
      }
    }).filter(Boolean);
    return new Tbatch(cmds, meta || {});
  }
});

export default { Tcommand, TsetProp, Tbatch };

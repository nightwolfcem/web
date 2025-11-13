'use strict';
// Tsnap.js — Cem-spec unified (syntax-safe, feature-complete)
// Snap yöneticisi: grid + guide + element hizalama + sağlayıcı (provider) temelli nokta snap API'si

import CLASS from './CLASS.js'
import { Tevents } from './Tevents.js';

/* ================= helpers ================= */
const _isNum = (v)=> typeof v === 'number' && Number.isFinite(v);
const _n = (v, d=0)=> { v = parseFloat(v); return Number.isFinite(v) ? v : d; };
const _px = (n)=> (_n(n)|0) + 'px';
const _doc = ()=> (typeof document!=='undefined' ? document : null);
const _win = ()=> (typeof window!=='undefined' ? window : null);
function _rect(el){
  if (!el || !el.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  const W = _win();
  const sx = (W && W.scrollX) || 0;
  const sy = (W && W.scrollY) || 0;
  const L = r.left + sx, T = r.top + sy;
  return { left:L, top:T, width:r.width, height:r.height, right:L+r.width, bottom:T+r.height, cx:L+r.width/2, cy:T+r.height/2 };
}

/* ================= overlay ================= */
function _ensureOverlay(root){
  const D = _doc(); if (!D) return null;
  const R = root && root.nodeType===1 ? root : D.body;
  let ov = R.querySelector(':scope > .tsnap-overlay');
  if (!ov){
    ov = D.createElement('div');
    ov.className = 'tsnap-overlay';
    Object.assign(ov.style, {
      position:'absolute', left:'0', top:'0', right:'0', bottom:'0',
      pointerEvents:'none', zIndex: 9999
    });
    R.appendChild(ov);
  }
  return ov;
}
function _line(ov, cls){
  const D = _doc(); if (!D) return null;
  const el = D.createElement('div');
  el.className = cls;
  Object.assign(el.style, {
    position:'absolute', background:'rgba(0,150,255,0.7)',
    boxShadow:'0 0 0 1px rgba(0,150,255,0.3)',
    pointerEvents:'none'
  });
  ov.appendChild(el);
  return el;
}

/* ================= Tsnap ================= */
export const Tsnap = CLASS(class Tsnap extends CLASS.extends(Tevents) {
  /**
   * @param {Element} root
   * @param {object} opts
   *  - threshold: px (snap toleransı)
   *  - grid: { enabled, size }
   *  - guides: { enabled, v:[], h:[] }
   *  - elements: { enabled, selector, excludeSelected }
   *  - draw: { enabled }
   */
  constructor(root, opts={}){
    super();
    this.root = (root && root.nodeType===1) ? root : (_doc()?.body || null);
    this.threshold = _isNum(opts.threshold) ? opts.threshold : 6;

    const grid = opts.grid || {};
    this.grid = {
      enabled: ('enabled' in grid) ? !!grid.enabled : true,
      size: _isNum(grid.size) ? grid.size : 8
    };

    const guides = opts.guides || {};
    this.guides = {
      enabled: ('enabled' in guides) ? !!guides.enabled : true,
      v: Array.isArray(guides.v) ? guides.v.slice() : [],
      h: Array.isArray(guides.h) ? guides.h.slice() : []
    };

    const elements = opts.elements || {};
    this.elements = {
      enabled: ('enabled' in elements) ? !!elements.enabled : true,
      selector: elements.selector || '[owner]',
      excludeSelected: ('excludeSelected' in elements) ? !!elements.excludeSelected : true
    };

    const draw = opts.draw || {};
    this.draw = { enabled: ('enabled' in draw) ? !!draw.enabled : true };

    this.overlay = _ensureOverlay(this.root);
    this._active = [];

    // provider-based point snapping
    this._providers = new Map();
    this.useGrid(); // default point-snap grid provider
  }

  /* ---------- guide API ---------- */
  clearGuides(){ this.guides.v.length=0; this.guides.h.length=0; return this; }
  setGuides({ v=[], h=[] } = {}){ this.guides.v = v.slice(); this.guides.h = h.slice(); return this; }
  addV(x){ if (_isNum(x)) this.guides.v.push(x); return this; }
  addH(y){ if (_isNum(y)) this.guides.h.push(y); return this; }

  /* ---------- rect snap (for move/resize) ---------- */
  /**
   * @param {object} rect { left, top, width, height }
   * @param {object} options { preview?:boolean, node?:Element }
   * @returns {object} { rect, hits }
   */
  computeForRect(rect, { preview=false, node=null } = {}){
    const thr = this.threshold|0;
    let { left, top, width, height } = rect;
    let right = left + width, bottom = top + height;
    let cx = left + width/2, cy = top + height/2;

    const hits = [];

    // 1) grid
    if (this.grid.enabled && _isNum(this.grid.size) && this.grid.size>0){
      const g = this.grid.size;
      const s1 = (v)=> Math.round(v / g) * g;
      const snapAxis = (val, name)=>{
        const s = s1(val);
        if (Math.abs(s - val) <= thr){ hits.push({ type: name[0], at: s, reason:'grid' }); return s; }
        return val;
      };
      left = snapAxis(left, 'left');
      top  = snapAxis(top,  'top');
      right = left + width; bottom = top + height;
      cx = left + width/2; cy = top + height/2;
    }

    // 2) guides
    if (this.guides.enabled){
      const snapList = (val, list, axis)=>{
        if (!list || !list.length) return val;
        let best = val, bestD = Infinity, at=null;
        for (const x of list){ const d = Math.abs(x - val); if (d < bestD){ bestD=d; best=x; at=x; } }
        if (bestD <= thr){ hits.push({ type: axis, at, reason:'guide' }); return best; }
        return val;
      };
      if (this.guides.v.length) left = snapList(left, this.guides.v, 'v');
      if (this.guides.h.length) top  = snapList(top,  this.guides.h, 'h');
      right = left + width; bottom = top + height;
      cx = left + width/2; cy = top + height/2;
    }

    // 3) elements
    if (this.elements.enabled && this.root){
      const D = _doc();
      const nodes = Array.from(this.root.querySelectorAll(this.elements.selector));
      const isSel = (el)=> el && el.classList?.contains('selected');
      const cand = nodes.filter(el=>{
        if (!el || el === node) return false;
        if (this.elements.excludeSelected && isSel(el)) return false;
        const owner = el.owner || el.__owner || null;
        if (owner && owner.status && owner.status.snapEnabled === false) return false;
        return true;
      });
      const verts=[]; const horzs=[];
      for (const el of cand){
        const r = _rect(el); if (!r) continue;
        verts.push(r.left, r.cx, r.right);
        horzs.push(r.top, r.cy, r.bottom);
      }
      const snapList = (val, list, axis)=>{
        if (!list || !list.length) return val;
        let best = val, bestD = Infinity, at=null;
        for (const x of list){ const d = Math.abs(x - val); if (d < bestD){ bestD=d; best=x; at=x; } }
        if (bestD <= thr){ hits.push({ type: axis, at, reason:'element' }); return best; }
        return val;
      };
      if (verts.length) left = snapList(left, verts, 'v');
      if (horzs.length) top  = snapList(top,  horzs, 'h');
      right = left + width; bottom = top + height;
      cx = left + width/2; cy = top + height/2;
    }

    const out = { left, top, width, height };
    if (preview && this.draw.enabled) this.show(hits, out);
    return { rect: out, hits };
  }

  /* ---------- overlay draw ---------- */
  show(hits, rect=null){
    this.hide();
    if (!this.draw.enabled) return;
    if (!Array.isArray(hits) || !hits.length) return;
    const ov = this.overlay || _ensureOverlay(this.root); if (!ov) return;
    const R = (this.root && this.root.getBoundingClientRect) ? this.root.getBoundingClientRect() : { left:0, top:0, width:0, height:0 };
    const W = _win(); const sx=(W?.scrollX)||0, sy=(W?.scrollY)||0;
    for (const h of hits){
      if (h.type==='v'){
        const el = _line(ov, 'snap-v');
        Object.assign(el.style, { left:_px(h.at), top:_px(R.top+sy), width:'1px', height:_px(R.height||0) });
        this._active.push(el);
      } else if (h.type==='h'){
        const el = _line(ov, 'snap-h');
        Object.assign(el.style, { top:_px(h.at), left:_px(R.left+sx), height:'1px', width:_px(R.width||0) });
        this._active.push(el);
      }
    }
    if (rect){
      const D = _doc(); if (D){
        const box = D.createElement('div');
        box.className='snap-preview';
        Object.assign(box.style, {
          position:'absolute', left:_px(rect.left), top:_px(rect.top),
          width:_px(rect.width), height:_px(rect.height),
          border:'1px dashed rgba(0,150,255,0.5)', background:'transparent',
          pointerEvents:'none'
        });
        ov.appendChild(box);
        this._active.push(box);
      }
    }
  }
  hide(){
    for (const el of this._active){ try{ el.remove(); }catch{} }
    this._active.length=0;
  }

  /* ---------- provider-based point snapping ---------- */
  register(name, fn, prio = 0){
    if (!name || typeof fn !== 'function') return this;
    this._providers.set(String(name), { fn, prio: Number(prio)||0 });
    return this;
  }
  unregister(name){ this._providers.delete(String(name)); return this; }
  clearProviders(){ this._providers.clear(); return this; }
  list(){
    const arr = [];
    this._providers.forEach((v,k)=>arr.push({ name:k, prio:v.prio }));
    return arr.sort((a,b)=> b.prio - a.prio);
  }

  /**
   * @param {object} pt {x,y}
   * @param {object} ctx arbitrary context
   * @returns {object|null} { x, y, prio, dist, by }
   */
  compute(pt, ctx){
    let best = null;
    this._providers.forEach(({fn, prio}, name)=>{
      let out = null;
      try { out = fn(pt, ctx) || null; } catch { out = null; }
      if (!out || typeof out.x !== 'number' || typeof out.y !== 'number') return;
      const dx = out.x - pt.x, dy = out.y - pt.y;
      const dist = (out.dist != null) ? out.dist : Math.hypot(dx, dy);
      const p = (out.prio != null) ? out.prio : prio;
      if (!best || p > best.prio || (p === best.prio && dist < best.dist)){
        best = { x: out.x, y: out.y, prio: p, dist, by: out.by || name };
      }
    });
    return best;
  }

  /**
   * Basit grid sağlayıcısı
   * @param {object} opts { stepX, stepY, offsetX, offsetY }
   * @param {object} meta { name, prio }
   */
  useGrid(opts={ stepX:10, stepY:10, offsetX:0, offsetY:0 }, { name='grid', prio=0 } = {}){
    const cfg = { stepX:_n(opts.stepX,10), stepY:_n(opts.stepY,10), offsetX:_n(opts.offsetX,0), offsetY:_n(opts.offsetY,0) };
    const fn = (pt)=>{
      const x = Math.round((pt.x - cfg.offsetX)/cfg.stepX)*cfg.stepX + cfg.offsetX;
      const y = Math.round((pt.y - cfg.offsetY)/cfg.stepY)*cfg.stepY + cfg.offsetY;
      return { x, y, by:name, prio };
    };
    this.register(name, fn, prio);
    this._cemGrid = { ...cfg, name, prio };
    return this;
  }

  asProviders(){
    const arr = [];
    this._providers.forEach(({fn})=>arr.push(fn));
    return arr;
  }
  applyToPointer(ptr){
    if (!ptr) return this;
    try{ if (typeof ptr.setSnapProviders === 'function') ptr.setSnapProviders(this.asProviders()); }catch{}
    return this;
  }

  /* ---------- static helpers for quick point snap ---------- */
  static get DEFAULT_TOL(){ return 6; }
  static get DEFAULT_GRID(){ return { stepX:10, stepY:10, offsetX:0, offsetY:0 }; }

  static snapPointToGuides(pos, guides, tol=Tsnap.DEFAULT_TOL){
    const out = { x: pos.x, y: pos.y };
    if (!guides) return out;
    const tryList = (val, list)=>{
      if (!Array.isArray(list) || !list.length) return val;
      let best=val, dmin=Infinity;
      for (const v of list){ const d = Math.abs(v - val); if (d < dmin){ dmin=d; best=v; } }
      return (dmin <= tol) ? best : val;
    };
    if (Array.isArray(guides.v)) out.x = tryList(pos.x, guides.v);
    if (Array.isArray(guides.h)) out.y = tryList(pos.y, guides.h);
    return out;
  }
  static snapPointToGrid(pos, grid=Tsnap.DEFAULT_GRID){
    const gx = _n(grid.stepX,10), gy=_n(grid.stepY,10);
    const ox = _n(grid.offsetX,0), oy=_n(grid.offsetY,0);
    return {
      x: Math.round((pos.x - ox)/gx)*gx + ox,
      y: Math.round((pos.y - oy)/gy)*gy + oy
    };
  }

  /**
   * Guides + grid kombosu (drag sırasında pratik)
   */
  snapDrag(pos, guides, { tol = Tsnap.DEFAULT_TOL, grid = Tsnap.DEFAULT_GRID } = {}){
    const toGuides = Tsnap.snapPointToGuides(pos, guides, tol);
    const toGrid   = Tsnap.snapPointToGrid(pos, grid);
    const dxg = Math.hypot(toGuides.x - pos.x, toGuides.y - pos.y);
    const dxr = Math.hypot(toGrid.x   - pos.x, toGrid.y   - pos.y);
    return (dxg > 0 && dxg <= tol) ? toGuides : toGrid;
  }

  /* ---------- serialization ---------- */
});

export default { Tsnap };

export function installSnap(app, opts = {}){
  const service = new Tsnap(opts);
  if (app && app.use) app.use('snap', service);
  return service;
}

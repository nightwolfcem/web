'use strict';
// TpointerController.js — Cem-spec unified (feature-complete + compat)
// Olaylar:
//  - 'tpointer:tap', 'tpointer:dbltap', 'tpointer:press', 'tpointer:click'
//  - 'tpointer:dragstart', 'tpointer:drag', 'tpointer:dragend', 'tpointer:cancel'
//  - 'tpointer:move', 'tpointer:hover', 'tpointer:enter', 'tpointer:leave'
//  - 'tpointer:wheel'
// Çoklu-pointer, uzun basma, çift tık, hover-intent, ESC ile iptal, snap-provider desteği.
// Eski API uyumu: addEventListener/removeEventListener, setSnapProviders, enable/disable.

import CLASS from './CLASS.js'
import { Tevents } from './Tevents.js';

/* ------------- helpers ------------- */
const now = ()=> (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
function pt(ev){ return { x:(ev.clientX|0), y:(ev.clientY|0) }; }
function _ptLocal(ev, origin){
  try{
    const bb = (origin && origin.getBoundingClientRect) ? origin.getBoundingClientRect() : { left:0, top:0 };
    const bl = origin?.clientLeft || 0, bt = origin?.clientTop || 0;
    const sx = origin?.scrollLeft || 0, sy = origin?.scrollTop || 0;
    return { xL: ((ev.clientX|0) - bb.left + sx - bl), yL: ((ev.clientY|0) - bb.top + sy - bt) };
  }catch{ return { xL:(ev.clientX|0), yL:(ev.clientY|0) }; }
}
function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }
function emit(self, type, detail){ try{ self.emit(type, detail); }catch{} }
function withPrevent(ev, on=true){ if (!ev) return; try{ if (on){ ev.preventDefault(); ev.stopPropagation(); } }catch{} }
function isMac(){ try{ return /Mac|iPhone|iPad|iPod/.test(navigator.platform||'') || /Mac OS/.test(navigator.userAgent||''); }catch{ return false; } }

function _resolveTarget(ev, root){
  if (!root || !ev) return root || null;
  let t = ev.target || null;

  try{
    if (typeof document !== 'undefined' && document.elementsFromPoint){
      const stack = document.elementsFromPoint(ev.clientX|0, ev.clientY|0) || [];
      for (const el of stack){
        if (el && root.contains && root.contains(el)) return el;
      }
    }
  }catch{}

  try{
    if (t && root.contains && root.contains(t)) return t;
  }catch{}

  return root || t || null;
}

/* ------------- class ------------- */
export const TpointerController = CLASS(class TpointerController extends CLASS.extends(Tevents) {
  /**
   * @param {Element} root
   * @param {object} opts
   *  - dragThreshold: px
   *  - pressDelay: ms
   *  - dblTapDelay: ms
   *  - tapMaxDelay: ms
   *  - tapMaxDistance: px
   *  - pointerCapture: bool
   *  - preventDefaultOnMove: bool
   *  - preventDefaultOnDrag: bool
   *  - hoverIntent: ms (0 kapalı)
   *  - hoverLeaveDelay: ms
   *  - allowRightClickDrag: bool
   *  - windowMove: bool (move/up dinleyicileri window'a bağla)
   *  - snap: { enabled, providers: [fn], grid?: {stepX,stepY,offsetX,offsetY}, guides?:{v:[],h:[]}, tol?:number }
   */
  constructor(root, opts={}){
    super();
    this.root = (root && root.el) ? root.el : root;
    if (!this.root || !this.root.addEventListener) throw new Error('TpointerController: root gerekli.');

    const defaults = {
      dragThreshold: 4,
      pressDelay: 550,
      dblTapDelay: 300,
      tapMaxDelay: 250,
      tapMaxDistance: 8,
      pointerCapture: true,
      preventDefaultOnMove: false,
      preventDefaultOnDrag: true,
      hoverIntent: 0,
      hoverLeaveDelay: 0,
      allowRightClickDrag: false,
      windowMove: true,
      snap: {
        enabled: false,
        providers: [],
        grid: null,
        guides: null,
        tol: 6
      }
    };
    this.opts = Object.assign({}, defaults, opts||{});

    this._active = new Map();   // pointerId -> state
    this._hoverTarget = null;
    this._hoverTimer = null;
    this._lastTap = { t: 0, x: 0, y: 0, id: null };

    this.origin = this.root;     // local koordinat için referans
    this._boundMove = this._onMove.bind(this);
    this._boundUp   = this._onUp.bind(this);
    this._boundCancel = this._onCancel.bind(this);
    this._boundKey  = this._onKey.bind(this);

    this._enabled = true;

    this._onDown = this._onDown.bind(this);
    this._onEnter = this._onEnter.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onWheel = this._onWheel.bind(this);

    this.root.addEventListener('pointerdown', this._onDown, { passive:false });
    this.root.addEventListener('pointerenter', this._onEnter);
    this.root.addEventListener('pointerleave', this._onLeave);
    this.root.addEventListener('wheel', this._onWheel, { passive:true });
  }

  setSnapProviders(list){
    const snap = this.opts.snap || (this.opts.snap = {});
    snap.providers = Array.isArray(list) ? list.slice(0) : [];
  }
  addSnapProvider(fn){
    const snap = this.opts.snap || (this.opts.snap = {});
    if (!snap.providers) snap.providers = [];
    snap.providers.push(fn);
  }

  enable(){ this._enabled = true; }
  disable(){ this._enabled = false; }

  destroy(){
    this.disable();
    this._unbindWindow();
    this.root.removeEventListener('pointerdown', this._onDown);
    this.root.removeEventListener('pointerenter', this._onEnter);
    this.root.removeEventListener('pointerleave', this._onLeave);
    this.root.removeEventListener('wheel', this._onWheel);
  }

  _bindWindow(){
    if (this._winBound) return;
    const target = this.opts.windowMove ? (window || this.root.ownerDocument || this.root) : this.root;
    target.addEventListener('pointermove', this._boundMove, { passive:false });
    target.addEventListener('pointerup', this._boundUp, { passive:false });
    target.addEventListener('pointercancel', this._boundCancel, { passive:false });
    target.addEventListener('keydown', this._boundKey, { passive:false, capture:true });
    this._winTarget = target;
    this._winBound = true;
  }

  _unbindWindow(){
    if (!this._winBound) return;
    const target = this._winTarget;
    if (!target) return;
    target.removeEventListener('pointermove', this._boundMove);
    target.removeEventListener('pointerup', this._boundUp);
    target.removeEventListener('pointercancel', this._boundCancel);
    target.removeEventListener('keydown', this._boundKey, { capture:true });
    this._winTarget = null;
    this._winBound = false;
  }

  _snapPoint(p){
    const snap = this.opts.snap;
    if (!snap || !snap.enabled) return null;
    let best = null;
    const tol = snap.tol || 6;

    if (snap.grid && snap.grid.stepX>0 && snap.grid.stepY>0){
      const { stepX, stepY, offsetX=0, offsetY=0 } = snap.grid;
      const gx = Math.round((p.x - offsetX)/stepX)*stepX + offsetX;
      const gy = Math.round((p.y - offsetY)/stepY)*stepY + offsetY;
      const dx = gx - p.x, dy = gy - p.y;
      const d = Math.hypot(dx,dy);
      if (d <= tol){
        best = best && best.d < d ? best : { x:gx, y:gy, d, type:'grid' };
      }
    }

    const providers = Array.isArray(snap.providers) ? snap.providers : [];
    for (const fn of providers){
      try{
        const res = fn(p);
        if (!res) continue;
        const cand = Array.isArray(res) ? res : [res];
        for (const c of cand){
          if (!c || typeof c.x!=='number' || typeof c.y!=='number') continue;
          const d = Math.hypot(c.x-p.x, c.y-p.y);
          if (d<=tol){
            const obj = { x:c.x, y:c.y, d, type:c.type||'guide', meta:c.meta };
            best = (!best || d < best.d) ? obj : best;
          }
        }
      }catch(e){}
    }
    return best;
  }

  _onDown(ev){
    if (!this._enabled) return;
    if (!this.opts.allowRightClickDrag && ev.button===2) return;
    withPrevent(ev, true);
    if (this.opts.pointerCapture){ try{ this.root.setPointerCapture(ev.pointerId); }catch{} }

    const p = pt(ev); const pl = _ptLocal(ev, this.origin);
    const downTarget = _resolveTarget(ev, this.root);
    const st = { x0:p.x, y0:p.y, x0L:pl.xL, y0L:pl.yL, last:p, t0:now(), started:false, pressT:0, pressTimer:null,
      downEv:ev, downTarget, buttons: ev.buttons|0, tapOk:true
    };
    this._active.set(ev.pointerId, st);

    // long-press
    if (this.opts.pressDelay>0){
      st.pressTimer = setTimeout(()=>{
        st.pressT = now();
        emit(this, 'tpointer:press', { x:p.x, y:p.y, originalEvent: ev });
      }, this.opts.pressDelay);
    }

    this._bindWindow();
  }

  _onMove(ev){
    // hover if none active for this pointer
    const st = this._active.get(ev.pointerId);
    if (!st){
      if (this.opts.hoverIntent>0){
        clearTimeout(this._hoverTimer);
        const tgt = ev.target;
        if (this._hoverTarget !== tgt){
          this._hoverTarget = tgt;
          this._hoverTimer = setTimeout(
            ()=> emit(this, 'tpointer:hover', { target:tgt, x:ev.clientX|0, y:ev.clientY|0, originalEvent:ev }),
            this.opts.hoverIntent
          );
        }
      }
      emit(this, 'tpointer:move', { x:ev.clientX|0, y:ev.clientY|0, target: _resolveTarget(ev, this.root), originalEvent: ev });
      return;
    }

    if (this.opts.preventDefaultOnMove) withPrevent(ev, true);
    const p = pt(ev);

    // tap distance guard
    if (st.tapOk && dist(p, {x:st.x0, y:st.y0}) > this.opts.tapMaxDistance) st.tapOk = false;

    if (!st.started){
      if (dist(p, { x:st.x0, y:st.y0 }) >= this.opts.dragThreshold){
        st.started = true;
        if (st.pressTimer){ clearTimeout(st.pressTimer); st.pressTimer=null; }
        const snap = this._snapPoint(p);
        const payload = snap
          ? { x0:st.x0, y0:st.y0, x:snap.x, y:snap.y, rawX:p.x, rawY:p.y, snap }
          : { x0:st.x0, y0:st.y0, x:p.x, y:p.y };
        emit(this, 'tpointer:dragstart', { ...payload, target: st.downTarget || _resolveTarget(ev, this.root), originalEvent: ev });
      } else {
        emit(this, 'tpointer:move', { x:p.x, y:p.y, target: st.downTarget || _resolveTarget(ev, this.root), originalEvent: ev });
        st.last = p;
        return;
      }
    }

    st.last = p;
    const snap = this._snapPoint(p);
    const payload = snap
      ? { x0:st.x0, y0:st.y0, x:snap.x, y:snap.y, rawX:p.x, rawY:p.y, snap }
      : { x0:st.x0, y0:st.y0, x:p.x, y:p.y };
    if (this.opts.preventDefaultOnDrag) withPrevent(ev, true);
    emit(this, 'tpointer:drag', { ...payload, target: st.downTarget || _resolveTarget(ev, this.root), originalEvent: ev });
  }

  _endPointer(ev, kind){
    const st = this._active.get(ev.pointerId);
    if (!st) return;
    if (st.pressTimer){ clearTimeout(st.pressTimer); st.pressTimer=null; }
    const p = pt(ev);
    this._active.delete(ev.pointerId);
    try{ this.root.releasePointerCapture?.(ev.pointerId); }catch{}

    if (kind==='cancel'){
      emit(this, 'tpointer:cancel', { x0:st.x0, y0:st.y0, x:p.x, y:p.y, target: st.downTarget || _resolveTarget(ev, this.root), originalEvent: ev });
      return;
    }

    if (st.started){
      const snap = this._snapPoint(p);
      const payload = snap
        ? { x0:st.x0, y0:st.y0, x:snap.x, y:snap.y, rawX:p.x, rawY:p.y, snap }
        : { x0:st.x0, y0:st.y0, x:p.x, y:p.y };
      emit(this, 'tpointer:dragend', { ...payload, target: st.downTarget || _resolveTarget(ev, this.root), originalEvent: ev });
      return;
    }

    // TAP / DBLTAP / CLICK
    const t = now();
    const isTap = st.tapOk && (t - st.t0) <= this.opts.tapMaxDelay;
    if (isTap){
      emit(this,'tpointer:tap',{ x:p.x, y:p.y, ..._ptLocal(ev, this.origin), target: st.downTarget || _resolveTarget(ev, this.root), originalEvent: ev });
      const isDbl = (t - this._lastTap.t) <= this.opts.dblTapDelay &&
                    dist({x:this._lastTap.x, y:this._lastTap.y}, p) <= (this.opts.tapMaxDistance*1.5);
      if (isDbl) emit(this, 'tpointer:dbltap', { x:p.x, y:p.y, target: st.downTarget || _resolveTarget(ev, this.root), originalEvent: ev });
      this._lastTap = { t, x:p.x, y:p.y, id: ev.pointerId };
    }
    emit(this,'tpointer:click',{ x:p.x, y:p.y, ..._ptLocal(ev, this.origin), button: ev.button|0, buttons: ev.buttons|0, target: st.downTarget || _resolveTarget(ev, this.root), originalEvent: ev });
  }

  _onUp(ev){
    if (!this._enabled) return;
    withPrevent(ev, false);
    this._endPointer(ev, 'up');
    if (this._active.size===0) this._unbindWindow();
  }

  _onCancel(ev){
    if (!this._enabled) return;
    this._endPointer(ev, 'cancel');
    if (this._active.size===0) this._unbindWindow();
  }

  _onEnter(ev){
    emit(this, 'tpointer:enter', { target: _resolveTarget(ev, this.root), x: ev.clientX|0, y: ev.clientY|0, originalEvent: ev });
  }

  _onLeave(ev){
    if (this.opts.hoverLeaveDelay>0){
      setTimeout(()=> emit(this, 'tpointer:leave', { target: _resolveTarget(ev, this.root), x: ev.clientX|0, y: ev.clientY|0, originalEvent: ev }), this.opts.hoverLeaveDelay);
    } else {
      emit(this, 'tpointer:leave', { target: _resolveTarget(ev, this.root), x: ev.clientX|0, y: ev.clientY|0, originalEvent: ev });
    }
    this._hoverTarget = null; clearTimeout(this._hoverTimer);
  }

  _onWheel(ev){
    emit(this, 'tpointer:wheel', { dx: ev.deltaX, dy: ev.deltaY, mode: ev.deltaMode, ctrlKey: !!ev.ctrlKey, altKey: !!ev.altKey, shiftKey: !!ev.shiftKey, target: _resolveTarget(ev, this.root), originalEvent: ev });
  }

  _onKey(ev){
    if (ev.key === 'Escape'){
      for (const [pid, st] of this._active){
        const fake = { pointerId: pid, clientX: st.last.x, clientY: st.last.y, button: 0 };
        this._endPointer(fake, 'cancel');
      }
      this._unbindWindow();
    }
  }

  // util
  isDragging(){ for (const st of this._active.values()) if (st.started) return true; return false; }
  activeCount(){ return this._active.size; }
  lastPosition(){ const it=this._active.values().next(); if (it.done) return null; return it.value.last; }

  /* -------- serialization -------- */
});

export default { TpointerController };

export function installPointer(app, opts = {}){
  const service = new TpointerController(opts);
  if (app && app.use) app.use('pointer', service);
  return service;
}

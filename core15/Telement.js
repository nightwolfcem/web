'use strict';

import { defaultLayers } from './layers.defaults.js';
import { ensureBodySublayers, getSlot, applyPointerPolicy } from './ensureBodySublayers.js';
// Telement.js — Cem-spec unified

import CLASS from './CLASS.js';
import { Tevents } from './Tevents.js';
import { isObj, isStr, getElement } from './utils.js';
import { createEnum, createOrd } from './enums.js';
import { Eborder, Ealign, EelementStatus, Oposition } from './const.enums.js';
import { TelementRect } from './geo2d.js';
import { slotSelector } from './ensureBodySublayers.js';

/* ---------------- yardımcılar ---------------- */

function _px(n){ return (Math.round(parseFloat(n) || 0)) + 'px'; }

function _num(v, d = 0){
  v = parseFloat(v);
  return Number.isNaN(v) ? d : v;
}

function _stop(e){
  try{
    e.preventDefault();
    e.stopPropagation();
  }catch{}
}

function _class(el, on, name){
  try{ el.classList.toggle(name, !!on); }catch{}
}

function _rect(el){
  if (!el || !el.getBoundingClientRect) {
    return { left:0, top:0, width:0, height:0 };
  }
  const r = el.getBoundingClientRect();
  const ref = el.offsetParent || el.parentElement || document.body;
  let pl = 0, pt = 0, sx = 0, sy = 0;
  try{
    const pr = ref.getBoundingClientRect();
    pl = pr.left; pt = pr.top;
    sx = ref.scrollLeft || 0;
    sy = ref.scrollTop || 0;
  }catch{}
  return {
    left: Math.round(r.left - pl + sx),
    top:  Math.round(r.top  - pt + sy),
    width: r.width,
    height: r.height
  };
}

/* ========= Telement’e özel enum/ord ========= */

export const OelementState = createOrd('TelementState', 'idle,moving,resizing');

const _STATE = new WeakMap();

/* ================= Telement ================= */

export const Telement = CLASS(class Telement extends CLASS.extends(Tevents) {
  constructor(tagOrEl = 'div', opts = {}){
    super(opts);

    this.layer        = (opts && opts.layer) || null;
    this.localPointer = !!(opts && opts.localPointer);
    this._designMode  = !!(opts && opts.designMode);

const html = (tagOrEl && tagOrEl.nodeType === 1)
      ? tagOrEl
      : (isStr(tagOrEl) ? document.createElement(tagOrEl) : document.createElement('div'));

    this.el = html;
    this.htmlObject = html;
    html.owner = this;
const domId = this.$class.name +"-"+ this.id;
 if (opts && opts.id != null) {
  html.id = String(opts.id);
} else {
  html.id = domId;
}
  html.setAttribute('data-id', domId);

    // align fallback (Ealign varsa)
    try{
      if (Ealign && typeof Ealign.bind === 'function'){
        Ealign.bind(this, 'align', (opts && opts.align) ? opts.align : 'left top');
      }
      if (html.align == null) html.align = this.align;
    }catch{}

    // el.rect proxy + owner=this
    try{
      if (!html.__tRect && TelementRect && typeof TelementRect.bind === 'function') {
        const __proxy = TelementRect.bind(html, { owner: this, refresh: true });
        Object.defineProperty(this, 'rect', {
          enumerable: true,
          configurable: true,
          get(){ return __proxy; },
          set(v){ if (v && typeof v === 'object') __proxy.assign(v); }
        });
      }
    }catch{}

    const {
      id = null,
      className = null,
      style = null,
      attrs = null,
      events = null,
      parent = null,
      children = [],
      selectable = false,
      movable = false,
      resizable = false,
      dockable = false,
      draggable = false,
      snap = null,
      render = null,
      history = null,
      delegatePointer = false,
      designMode = false,
      position = null,
      dragOptions = null,
      moveOptions = null,
      resizeOptions = null,
      dropOptions = null,
      ...extra
    } = isObj(opts) ? opts : {};

   
      const clsDef = this.constructor.$class || this.constructor.name || 'Telement';
      const clsUsr = Array.isArray(className)
        ? className
        : String(className || '').trim().split(/\s+/).filter(Boolean);

      try{ html.classList.add(clsDef, ...clsUsr); }catch{}

      if (isObj(style)) Object.assign(html.style, style);
      if (isObj(attrs)){
        for (const k of Object.keys(attrs)){
          try{ html.setAttribute(k, attrs[k]); }catch{}
        }
      }

      this.snap    = snap   || null;
      this.render  = render || null;
      this.history = history || null;

      // enum status: doğrudan özellik erişimi
      const st = EelementStatus.bind(this, 'status');
      st.visible    = true;
      st.movable    = (movable !== false);
      st.selectable = !!selectable;
      st.resizable  = !!resizable;
      st.dockable   = !!dockable;
      st.draggable  = !!draggable;

      this._resizeEdges = st.resizable
        ? (Eborder.left | Eborder.right | Eborder.top | Eborder.bottom)
        : 0;

      Object.defineProperty(this, 'resizeEdges', {
        enumerable: true,
        configurable: true,
        get(){ return this._resizeEdges | 0; },
        set(v){ this._resizeEdges = Number(v) || 0; }
      });

      // position enum + CSS sync (Oposition)
      let initialPosition = null;
      if (position != null){
        initialPosition = position;
      } else if (style && typeof style === 'object' && style.position != null){
        initialPosition = style.position;
      } else if (html && html.style && html.style.position){
        initialPosition = html.style.position;
      }

      try{
        if (Oposition && typeof Oposition.bind === 'function'){
          Oposition.bind(this, 'position');
        }
      }catch{}

      if (initialPosition != null){
        this.position = initialPosition;
      }

      // movable ise ve position static/boş ise absolute'a çek
      try{
        if (this.status && this.status.movable){
          const v = this.position;
          const vStr = (v && v.toString) ? v.toString() : v;
          if (!vStr || vStr === 'static'){
            if (Oposition && Object.prototype.hasOwnProperty.call(Oposition, 'absolute')){
              this.position = Oposition.absolute;
            }else{
              this.position = 'absolute';
            }
          }
        }
      }catch{}

      // CSS'e işle
      try{
        if (this.el && this.el.style){
          let v = this.position;
          if (v && typeof v !== 'string' && v.toString){
            v = v.toString();
          }
          if (v){
            this.el.style.position = v;
          }
        }
      }catch{}

    

      Object.defineProperty(this, 'designMode', {
        enumerable: true,
        configurable: true,
        get(){ return !!this._designMode; },
        set(v){
          const newVal = !!v;
          if (newVal === this._designMode) return;
          this._designMode = newVal;
          const shouldDelegate = !!this._delegatePointerRequested || newVal;
          const wasDelegating = !!this._delegatePointer;
          if (shouldDelegate && !wasDelegating){
            if (typeof this._unbindPointer === 'function') this._unbindPointer();
            this._delegatePointer = true;
          } else if (!shouldDelegate && wasDelegating){
            this._delegatePointer = false;
            if (typeof this._bindPointer === 'function') this._bindPointer();
          } else {
            this._delegatePointer = shouldDelegate;
          }
        }
      });
this.dragOptions = Object.assign({
        handle: null,
        dragClass: 'dragging'
      }, isObj(dragOptions) ? dragOptions : {});

      this.moveOptions = Object.assign({
        handle: null,
        bound: true,
        xable: true,
        yable: true,
        axis: null
      }, isObj(moveOptions) ? moveOptions : {});

      if (this.moveOptions && typeof this.moveOptions.axis === 'string'){
        const ax = this.moveOptions.axis;
        if (ax === 'x'){
          this.moveOptions.xable = true;
          this.moveOptions.yable = false;
        } else if (ax === 'y'){
          this.moveOptions.xable = false;
          this.moveOptions.yable = true;
        }
      }

this.resizeOptions = Object.assign({
        pad: 6,
        minW: 20,
        minH: 20,
        maxW: Infinity,
        maxH: Infinity,
        useHelper: false,
        edges: null
      }, isObj(resizeOptions) ? resizeOptions : {});

      if (this.resizeOptions && this.resizeOptions.edges != null){
        this.resizeEdges = this.resizeOptions.edges;
      }

this.dropOptions = Object.assign({
        hoverClass: 'droppable-hover',
        accept: null,
        acceptables: null
      }, isObj(dropOptions) ? dropOptions : {});

      if (this.dropOptions && this.dropOptions.acceptables && !this.dropOptions.accept){
        this.dropOptions.accept = this.dropOptions.acceptables;
      }

this.children = [];
      for (const ch of (children || [])) this.appendChild(ch);

      this._delegatePointerRequested = !!delegatePointer;
      this._delegatePointer = this._delegatePointerRequested || !!this._designMode;
      if (!this._delegatePointer) this._bindPointer();

      if (isObj(events)){
        for (const [type, fn] of Object.entries(events)){
          try{ this.bind(type, fn); }catch{}
        }
      }

      if (parent){
        const p = getElement(parent);
        if (p && p.owner && typeof p.owner.appendChild === 'function') {
          p.owner.appendChild(this);
        } else if (p && typeof p.appendChild === 'function') {
          p.appendChild(html);
        }
      }

      this._applyStatusClasses();
      this.emit('init', { el: this.el, options: opts, extra });
  }

  /* -------- DOM order stacking -------- */

  bringToFront(){
    const p = this.el.parentNode;
    if (!p) return false;
    p.appendChild(this.el);
    this.emit('stack:front', { parent: p });
    return true;
  }

  sendToBack(){
    const p = this.el.parentNode;
    if (!p) return false;
    p.insertBefore(this.el, p.firstChild);
    this.emit('stack:back', { parent: p });
    return true;
  }

  moveBefore(sibling){
    const p   = this.el.parentNode;
    const sib = getElement(sibling);
    if (!p || !sib) return false;
    p.insertBefore(this.el, sib);
    this.emit('stack:before', { parent:p, sibling:sib });
    return true;
  }

  moveAfter(sibling){
    const p   = this.el.parentNode;
    const sib = getElement(sibling);
    if (!p || !sib) return false;
    p.insertBefore(this.el, sib.nextSibling);
    this.emit('stack:after', { parent:p, sibling:sib });
    return true;
  }

  /* -------- pointer / move / resize -------- */

 
  _bindPointer(){
    const el = this.el;
    if (!el || _STATE.get(el)) return;

    const S = {
      mode: 'idle',
      edge: null,
      sx: 0,
      sy: 0,
      base: null,
      moved: false,
      resized: false
    };

    const startMove = (e)=>{
      try{ el.setPointerCapture(e.pointerId); }catch{}
      const r = _rect(el);
      el.style.position = el.style.position || 'absolute';
      el.style.left = _px(r.left);
      el.style.top  = _px(r.top);
      S.mode = 'move';
      S.sx = e.clientX;
      S.sy = e.clientY;
      S.base = {
        left: _num(el.style.left),
        top:  _num(el.style.top)
      };
      S.moved = false;
      el.addEventListener('pointermove', pm);
      el.addEventListener('pointerup', pu);
      el.addEventListener('lostpointercapture', pu);
      this.emit('move:start', { el, rect:r });
    };

    const startResize = (edge, e)=>{
      try{ el.setPointerCapture(e.pointerId); }catch{}
      const r = _rect(el);
      S.mode = 'resize';
      S.edge = edge;
      S.sx = e.clientX;
      S.sy = e.clientY;
      S.base = {
        L: _num(el.style.left,   r.left),
        T: _num(el.style.top,    r.top),
        W: _num(el.style.width,  r.width),
        H: _num(el.style.height, r.height)
      };
      el.style.position = el.style.position || 'absolute';
      el.addEventListener('pointermove', pm);
      el.addEventListener('pointerup', pu);
      el.addEventListener('lostpointercapture', pu);
      this.emit('resize:start', { el, rect:r, edge });
    };

    const pm = (e)=>{
      if (S.mode === 'move'){
        if (!this.status.movable) return;

        let dx = e.clientX - S.sx;
        let dy = e.clientY - S.sy;

        if (this.moveOptions){
          if (this.moveOptions.xable === false) dx = 0;
          if (this.moveOptions.yable === false) dy = 0;
        }

        const left = S.base.left + dx;
        const top  = S.base.top  + dy;

        el.style.left = _px(left);
        el.style.top  = _px(top);

        S.moved = true;

        this.emit('move', {
          el,
          left,
          top
        });
      } else if (S.mode === 'resize'){
        if (!this.status.resizable) return;

        const dx = e.clientX - S.sx;
        const dy = e.clientY - S.sy;
        let { L, T, W, H } = S.base;

        const mask = (this.resizeEdges | 0);

        if (S.edge === 'left' && (mask & (Number(Eborder.left) || 1))){
          L = S.base.L + dx;
          W = S.base.W - dx;
        } else if (S.edge === 'right' && (mask & (Number(Eborder.right) || 2))){
          W = S.base.W + dx;
        } else if (S.edge === 'top' && (mask & (Number(Eborder.top) || 4))){
          T = S.base.T + dy;
          H = S.base.H - dy;
        } else if (S.edge === 'bottom' && (mask & (Number(Eborder.bottom) || 8))){
          H = S.base.H + dy;
        }

        if (this.resizeOptions){
          const { minW, minH, maxW, maxH } = this.resizeOptions;
          if (minW != null && W < minW) W = minW;
          if (minH != null && H < minH) H = minH;
          if (maxW != null && W > maxW) W = maxW;
          if (maxH != null && H > maxH) H = maxH;
        }

        el.style.left   = _px(L);
        el.style.top    = _px(T);
        el.style.width  = _px(W);
        el.style.height = _px(H);

        S.resized = true;

        this.emit('resize', {
          el,
          left:L,
          top:T,
          width:W,
          height:H,
          edge:S.edge
        });
      }
    };

    const pu = (e)=>{
      el.removeEventListener('pointermove', pm);
      el.removeEventListener('pointerup', pu);
      el.removeEventListener('lostpointercapture', pu);

      const H = this.history;
      const wasMove = (S.mode === 'move');
      const didMove = !!S.moved;

      if (wasMove && didMove && H && typeof H.begin === 'function'){
        H.begin('element:move');
        try{} finally{ H.end('element:move'); }
        this.emit('move:end', { el });
      }

      if (S.mode === 'resize' && S.resized && H && typeof H.begin === 'function'){
        H.begin('element:resize');
        try{} finally{ H.end('element:resize'); }
        this.emit('resize:end', { el, edge:S.edge });
      }

      if (wasMove && didMove && this.status.draggable){
        try{
          const doc = el.ownerDocument || document;
          const x = e.clientX;
          const y = e.clientY;
          const target = (doc.elementFromPoint && doc.elementFromPoint(x, y)) || null;
          const acceptConf = this.dropOptions && (this.dropOptions.accept || this.dropOptions.acceptables);
          let accepted = null;

          if (target && acceptConf){
            if (typeof acceptConf === 'string'){
              accepted = target.closest && target.closest(acceptConf);
            } else if (Array.isArray(acceptConf)){
              for (const sel of acceptConf){
                if (typeof sel !== 'string') continue;
                const cand = target.closest && target.closest(sel);
                if (cand){ accepted = cand; break; }
              }
            } else if (typeof acceptConf === 'function'){
              const ok = acceptConf(target, { source:this, event:e });
              accepted = ok ? target : null;
            }
          }

          this.emit('drop', {
            el,
            event: e,
            target,
            accepted
          });
        }catch(_){}
      }

      if (this.snap && typeof this.snap.hide === 'function'){
        try{ this.snap.hide(); }catch{}
      }

      S.mode = 'idle';
      S.edge = null;
      S.moved = false;
      S.resized = false;
    };

    const handlers = {
      pd: (e)=>{
        if (e.button !== 0) return;

        const target = e.target || el;

        if (this.status.resizable){
          const r = el.getBoundingClientRect();
          const pad = this.resizeOptions.pad | 0;
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;

          const mask = (this.resizeEdges | 0);
          let edge = null;

          if (x < pad && (mask & (Number(Eborder.left) || 1)))   edge = 'left';
          else if (x > r.width - pad && (mask & (Number(Eborder.right) || 2))) edge = 'right';
          else if (y < pad && (mask & (Number(Eborder.top) || 4)))             edge = 'top';
          else if (y > r.height - pad && (mask & (Number(Eborder.bottom) || 8))) edge = 'bottom';

          if (edge){
            _stop(e);
            startResize(edge, e);
            return;
          }
        }

        if (this.status.movable){
          const handleSel = this.moveOptions && this.moveOptions.handle;
          if (handleSel){
            const h = (typeof handleSel === 'string')
              ? el.querySelector(handleSel)
              : handleSel;
            if (h && h.contains && !h.contains(target)) return;
          }
          _stop(e);
          startMove(e);
        }
      }
    };

    el.addEventListener('pointerdown', handlers.pd);
    _STATE.set(el, { handlers, state:S });
  }

  _unbindPointer(){
    const el = this.el;
    const Sentry = _STATE.get(el);
    if (!el || !Sentry) return;
    const { handlers } = Sentry;
    if (handlers && handlers.pd){
      try{ el.removeEventListener('pointerdown', handlers.pd); }catch{}
    }
    _STATE.delete(el);
  }

  /* -------- utilities -------- */

  isRendered(){ return this.el.offsetParent !== null; }

  setPosition(x, y){
    this.el.style.left = _px(x);
    this.el.style.top  = _px(y);
    return this;
  }

  setSize(w, h){
    this.el.style.width  = _px(w);
    this.el.style.height = _px(h);
    return this;
  }

  show(){
    this.status.visible = true;
    this._applyStatusClasses();
    this.emit('show');
    return this;
  }

  hide(){
    this.status.visible = false;
    this._applyStatusClasses();
    this.emit('hide');
    return this;
  }

  bind(type, handler, ...args){
    const fn = (...evArgs)=> handler.call(this, ...evArgs, this, ...args);
    fn._orig = handler;
    this.el.addEventListener(type, fn);
    return fn;
  }

  unbind(type, wrapped){
    try{
      if (wrapped) this.el.removeEventListener(type, wrapped);
    }catch{}
  }

  mount(target, { before = null } = {}){
    const parent =
      (target && target.el)       ? target.el :
      (typeof target === 'string') ? document.querySelector(target) :
      target || document.body;

    if (!parent) return this;

    if (before){
      const ref = (before && before.el)
        ? before.el
        : (typeof before === 'string' ? parent.querySelector(before) : before);
      parent.insertBefore(this.el, ref || null);
    }else{
      parent.appendChild(this.el);
    }

    // owner + data-id senkronu
    try{
      const E = this.el;
      if (E){
        try{ E.owner = this; }catch{}
        if (E.getAttribute && E.setAttribute && !E.getAttribute('data-id')){
          let idStr = null;
          if (this.id != null)               idStr = String(this.id);
          else if (typeof this.uid === 'function') idStr = String(this.uid());
          else idStr = String(Date.now());
          if (this.id == null) this.id = idStr;
          E.setAttribute('data-id', idStr);
        }
      }
    }catch{}

    return this;
  }

  unmount(){
    const p = this.el && this.el.parentNode;
    if (p) p.removeChild(this.el);
    return this;
  }

  body(parent = document.body){
    return this.mount(parent);
  }

  html(content){
    if (content == null) return this;

    if (typeof content === 'string'){
      this.el.innerHTML = content;
      return this;
    }
    if (content instanceof Node){
      this.el.replaceChildren(content);
      return this;
    }
    if (Array.isArray(content)){
      this.el.replaceChildren(...content.map(n =>
        n instanceof Node ? n : document.createTextNode(String(n))
      ));
      return this;
    }
    if (typeof content === 'function'){
      const res = content(this.el);
      return res === undefined ? this : res;
    }
    return this;
  }

  _applyStatusClasses(){
    const el = this.el;
    _class(el, !!this.status.visible,    'visible');
    _class(el, !!this.status.movable,    'movable');
    _class(el, !!this.status.resizable,  'sizable');
    _class(el, !!this.status.dockable,   'dockable');
    _class(el, !!this.status.draggable,  'draggable');
    _class(el, !!this.status.selectable, 'selectable');
    _class(el, !!this.status.locked,     'locked');
  }

  getChild(query){
    if (!query) return null;
    const host = this.el || this.host || (typeof document !== 'undefined' ? document : null);
    if (!host || !host.querySelector) return null;

    if (typeof query === 'string' && query.startsWith('layer:')){
      const name = query.slice(6).trim();
      if (!name) return null;
      const sel = (typeof slotSelector === 'function')
        ? slotSelector(name)
        : `[data-slot="${name}"],[data-layer="${name}"],.t-layer-slot.t-layer-${name}`;
      const node = host.querySelector(sel);
      return node ? (node.owner || node) : null;
    }

    const node = host.querySelector(String(query));
    if (!node) return null;
    return node.owner || node;
  }

  /* -------- layering helpers -------- */

  ensureSubLayers(spec = true, options = {}){
    const host = this.el || this.host || (typeof document !== 'undefined' ? document.body : null);
    const names = Array.isArray(spec)
      ? spec.slice()
      : (spec === true ? (defaultLayers || []) : ['content', 'overlay', 'selection']);

    try{
      ensureBodySublayers(host, { order: names });

      if (options && options.pointerPolicy){
        applyPointerPolicy(host, options.pointerPolicy);
      }

      this._layersMap = this._layersMap || Object.create(null);

      for (const n of names){
        const slotEl = getSlot(host, n);
        if (!slotEl) continue;

        let child = this._layersMap[n];
        if (!child){
          child = new Telement('div', { name: 'layer:'+n });
          child.el = slotEl;
          child.host = slotEl;
          child.parent = this;
          this._layersMap[n] = child;
        }else{
          child.el = slotEl;
          child.host = slotEl;
          child.parent = this;
        }
      }
    }catch{}

    return this;
  }

  layers(name){
    return this.getSlot(name);
  }

  getLayer(name){
    const key = String(name);
    this._layersMap = this._layersMap || Object.create(null);
    return this._layersMap[key] || null;
  }

  setLayer(name, child){
    const key = String(name);
    this._layersMap = this._layersMap || Object.create(null);
    this._layersMap[key] = child;
    return child;
  }

  getSlot(name){
    const host = this.el || this.host || (typeof document !== 'undefined' ? document.body : null);
    if (!host) return null;

    try{
      if (typeof getSlot === 'function'){
        const node = getSlot(host, name);
        if (node) return node;
      }
    }catch{}

    let sel;
    try{
      sel = (typeof slotSelector === 'function')
        ? slotSelector(name)
        : `[data-slot="${name}"],[data-layer="${name}"],.t-layer-slot.t-layer-${name}`;
    }catch{
      sel = `[data-slot="${name}"],[data-layer="${name}"],.t-layer-slot.t-layer-${name}`;
    }

    try{
      return host.querySelector(sel);
    }catch{
      return null;
    }
  }

  getOverlaySlot(){
    return this.getSlot('overlay');
  }

  getSelectionSlot(){
    return this.getSlot('selection');
  }

  /* -------- geometry / hit test -------- */

  hitTest(px, py){
    const r = (this.rect && this.rect.left != null)
      ? {
          left: this.rect.left,
          top: this.rect.top,
          width: this.rect.width,
          height: this.rect.height
        }
      : _rect(this.el);

    return (
      px >= r.left &&
      px <= r.left + r.width &&
      py >= r.top &&
      py <= r.top + r.height
    );
  }

  onSelect(state){ /* Tinteract override eder */ }

  onMove(dx, dy, ctx){ /* Tinteract override eder */ }

  onResize(edges, deltas, ctx){ /* Tinteract override eder */ }
});

export default { Telement, EelementStatus, OelementState };

// global slotSelector fallback (diğer modüller için)
try{
  if (typeof globalThis !== 'undefined'){
    if (typeof globalThis.slotSelector !== 'function'){
      if (typeof slotSelector === 'function'){
        globalThis.slotSelector = slotSelector;
      }else{
        globalThis.slotSelector = function(name){
          const n = String(name);
          return `[data-slot="${n}"],[data-layer="${n}"],.t-layer-slot.t-layer-${n}`;
        };
      }
    }
  }
}catch{}

'use strict';
// Troot.js — Telement tabanlı kök element

import CLASS from './CLASS.js';
import { isStr, isObj } from './utils.js';
import { Telement } from './Telement.js';

export const Troot = CLASS(class Troot extends CLASS.extends(Telement) {

  constructor(tag = 'div', props = {}){
    super(tag, props);

    // Temel sub-layer'ları otomatik kur
    try {
      this.ensureSubLayers(
        ['background','base','content','selection','overlay'],
        { pointerPolicy: { content:'auto', overlay:'none', selection:'none' } }
      );
    } catch {}

    this.tagName = isStr(tag) ? tag : 'div';
    this.title   = isStr(props.title) ? props.title : null;
    this.meta    = isObj(props.meta) ? { ...props.meta } : {};
  }

  /* ---------------- head helpers ---------------- */
  applyHead(){
    if (typeof document === 'undefined') return this;

    if (this.title != null){
      document.title = String(this.title);
    }

    if (this.meta && typeof this.meta === 'object'){
      for (const k of Object.keys(this.meta)){
        let m = document.querySelector(`meta[name="${k}"]`);
        if (!m){
          m = document.createElement('meta');
          m.setAttribute('name', k);
          document.head.appendChild(m);
        }
        m.setAttribute('content', String(this.meta[k]));
      }
    }
    return this;
  }

  setTitle(t){
    this.title = (t == null) ? null : String(t);
    try {
      if (typeof document !== 'undefined' && document && this.title != null){
        document.title = this.title;
      }
    } catch {}
    return this;
  }

  setMeta(k, v){
    if (!k) return this;
    if (!this.meta || typeof this.meta !== 'object') this.meta = {};
    this.meta[String(k)] = v;

    try{
      if (typeof document !== 'undefined' && document){
        let m = document.querySelector(`meta[name="${k}"]`);
        if (!m){
          m = document.createElement('meta');
          m.setAttribute('name', String(k));
          document.head.appendChild(m);
        }
        m.setAttribute('content', String(v));
      }
    }catch{}
    return this;
  }

  mergeMeta(obj){
    if (!obj || typeof obj !== 'object') return this;
    for (const k of Object.keys(obj)) this.setMeta(k, obj[k]);
    return this;
  }

  /* ---------------- mount/attach ---------------- */
  attach(container){
    if (typeof document === 'undefined') return this;
    if (!container) return this;

    try {
      if (!this.el){
        const tag = this.tagName || 'div';
        this.el = document.createElement(tag);
        this.el.className = (this.el.className ? (this.el.className + ' ') : '') + 'Troot';
        this.el.owner = this;
      }
      const parent = (container && container.el) ? container.el : container;
      if (parent && !this.el.parentNode) parent.appendChild(this.el);
      this.applyHead();
    } catch {}
    return this;
  }

  mount(target, opts = {}){
    const r = super.mount(target, opts);
    try { this.applyHead(); } catch {}
    return r;
  }

  /* ---------------- serialization ---------------- */
  toMinJSON(){
    const C = this.constructor;
    const cls = (C && (C.$class || C.name)) || 'Troot';
    return { type: cls, args: [ this.tagName, { title:this.title, meta:this.meta } ] };
  }

  toJSON(){
    const C = this.constructor;
    const type = (C && (C.$ns ? (C.$ns + ':') : '') + (C.$class || C.name)) || 'Troot';
    return { type, tag:this.tagName, title:this.title, meta:{ ...this.meta } };
  }
});

export default { Troot };

// mount sırasında root'u işaretle ve kilitle
try{
  const __origMountR = Troot.prototype.mount;
  Troot.prototype.mount = function(target, opts){
    const el = __origMountR ? __origMountR.call(this, target, opts) : (this.el || null);
    try{
      this.status = this.status || {};
      this.status.locked = true;
      if (this.el){
        this.el.setAttribute?.('data-root','true');
        const s = this.el.style;
        if (s){
          if (!s.position || s.position === 'static') s.position = 'absolute';
          s.left   = '0';
          s.top    = '0';
          s.right  = '0';
          s.bottom = '0';
        }
      }
    }catch{}
    return this.el || el;
  };
}catch{}

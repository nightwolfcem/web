'use strict';
import CLASS from './CLASS.js'

/*
 * Trender — hafif DOM renderer (VDOM patching, key’li diff, event/attr/style set)
 * Kullanım:
 *   import Trender, { Trender as T } from './Trender.js';
 *   const r = new T(document.getElementById('app'));
 *   r.render(T.h('div', {class:'wrap'}, 'hello'));
 */

export const Trender = CLASS(class Trender {
  constructor(root){
    this.root = root || document.body;
    this._old = null; // eski vnode
  }

  // ——— Namespace yardımcıları
  static h(tag, props, ...children){
    return { tag, props: props || {}, children: children.flat() };
  }
  static text(value){ return value == null ? '' : String(value); }

  // ——— Dış API
  mount(el){ if (el && this.root && el!==this.root) this.root.appendChild(el); }
  unmount(el){ try{ el?.remove?.(); }catch{} }
  clear(){ if (this.root) { this.root.textContent = ''; this._old = null; } }
  setRoot(root){ this.root = root; return this; }
  render(vnode){ this._old = this.#patch(this.root, this._old, vnode); return this._old; }
  html(raw){ if (this.root) { this.root.innerHTML = raw || ''; this._old = null; } }

  // ——— Patch (key destekli)
  #patch(container, oldV, newV){
    if (oldV === newV) return newV;
    // null/undefined → kaldır
    if (newV == null || newV === false){
      if (oldV && oldV._el) oldV._el.remove();
      return null;
    }

    // string/number → text
    if (typeof newV === 'string' || typeof newV === 'number'){
      if (oldV && oldV._el && oldV._el.nodeType === 3){
        const sv = String(newV);
        if (oldV._el.nodeValue !== sv) oldV._el.nodeValue = sv;
        oldV._text = sv;
        return oldV; // text vnode’u yeniden kullan
      }
      const tn = document.createTextNode(String(newV));
      container && container.appendChild(tn);
      return { _el: tn, _text: String(newV) };
    }

    // array fragment
    if (Array.isArray(newV)){
      const parent = container;
      const outChildren = [];
      const oldChildren = oldV?.children || [];
      for (let i=0;i<newV.length;i++){
        const c = this.#patch(parent, oldChildren[i] || null, newV[i]);
        outChildren.push(c);
        if (c && c._el && c._el.parentNode!==parent) parent.appendChild(c._el);
      }
      // fazla eski çocukları sil
      for (let i=newV.length;i<oldChildren.length;i++){
        const o = oldChildren[i];
        if (o && o._el) o._el.remove();
      }
      return { _el: parent, children: outChildren };
    }

    // element
    const tag = newV.tag;
    const key = newV.props?.key ?? null;

    if (!oldV || !oldV._el || oldV.tag !== tag){
      const el = document.createElement(tag);
      this.#applyProps(el, {}, newV.props||{});
      // children mount
      const kids = (newV.children||[]).map(ch=>{
        const vn = this.#patch(el, null, ch);
        return vn;
      });
      container && container.appendChild(el);
      return Object.assign(newV, { _el: el, children: kids, key, tag });
    }

    // aynı tag → props diff + children diff
    const el = oldV._el;
    this.#applyProps(el, oldV.props||{}, newV.props||{});
    // children diff (key öncelikli)
    const oldKids = oldV.children||[];
    const newKids = newV.children||[];
    const keyedOld = new Map();
    const freeOld = [];
    for (const c of oldKids){
      const k = c?.props?.key ?? c?.key ?? null;
      if (k!=null) keyedOld.set(k, c); else freeOld.push(c);
    }
    const outKids = [];
    for (const nk of newKids){
      const k = nk?.props?.key ?? nk?.key ?? null;
      let match = null;
      if (k!=null && keyedOld.has(k)){
        match = keyedOld.get(k);
        keyedOld.delete(k);
      } else if (freeOld.length){
        match = freeOld.shift();
      }
      const patched = this.#patch(el, match, nk);
      outKids.push(patched);
      if (patched && patched._el && patched._el.parentNode!==el) el.appendChild(patched._el);
    }
    // arta kalan eski çocukları sil
    for (const rest of keyedOld.values()){ rest?._el?.remove?.(); }
    for (const rest of freeOld){ rest?._el?.remove?.(); }

    return Object.assign(newV, { _el: el, children: outKids, key, tag });
  }

  // ——— Prop/setter
  #applyProps(el, oldP, newP){
    // remove eski
    for (const k in oldP){
      if (!(k in newP)) this.#setProp(el, k, oldP[k], undefined);
    }
    // set yeni
    for (const k in newP){
      const nv = newP[k], ov = oldP[k];
      if (nv !== ov) this.#setProp(el, k, ov, nv);
    }
  }
  #setProp(el, k, ov, nv){
    if (k === 'key') return;
    if (k.startsWith('on')){
      const type = k.slice(2).toLowerCase();
      if (typeof ov === 'function') el.removeEventListener(type, ov);
      if (typeof nv === 'function') el.addEventListener(type, nv);
      return;
    }
    if (k === 'style' && (typeof nv === 'object')){
      const os = ov || {};
      for (const p in os) if (!(p in nv)) el.style[p] = '';
      for (const p in nv) el.style[p] = nv[p];
      return;
    }
    if (k === 'class' || k === 'className'){
      el.className = nv || '';
      return;
    }
    if (nv === false || nv == null){
      el.removeAttribute(k);
      if (k in el) try{ el[k] = typeof el[k] === 'boolean' ? false : ''; }catch{}
      return;
    }
    if (k in el){
      try{ el[k] = nv; }catch{ el.setAttribute(k, nv); }
    } else {
      el.setAttribute(k, nv);
    }
  }
});

export default Trender;

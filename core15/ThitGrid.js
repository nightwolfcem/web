'use strict';

import CLASS from './CLASS.js';
import { isObj } from './utils.js';
import TgridIndex from './TgridIndex.js';

/**
 * ThitGrid
 *  - Telement veya benzeri owner nesneler için grid tabanlı hit-test yöneticisi.
 *  - Amaç: layer olmayan / ayrı tutulmak istenen elementleri hızlıca hittest edebilmek.
 *
 * Owner için desteklenen rect kaynakları (öncelik sırası):
 *  - owner.getBoundsWorld() -> { left, top, width, height }
 *  - owner.rect             -> { left, top, width, height }
 *  - owner.el.getBoundingClientRect()
 *
 * Not: hareket / resize sonrası update(owner) çağırmak gerekiyor.
 */
const ThitGrid = CLASS(class ThitGrid {

  constructor(opts = {}){
    super(opts);
    const o = isObj(opts) ? opts : {};
    this.cellSize = Number(o.cellSize) > 0 ? Number(o.cellSize) : 64;
    this.grid = new TgridIndex({ cellSize: this.cellSize });
    this._items = new Set();
  }

  /* ---------- internal helpers ---------- */

  _rectOf(owner){
    if (!owner) return null;

    try{
      if (typeof owner.getBoundsWorld === 'function'){
        const r = owner.getBoundsWorld();
        if (r && r.width >= 0 && r.height >= 0) return {
          left: r.x != null ? r.x : r.left,
          top:  r.y != null ? r.y : r.top,
          width: r.width,
          height: r.height
        };
      }
    }catch(_){}

    const r2 = owner.rect;
    if (r2 && r2.left != null && r2.top != null && r2.width != null && r2.height != null){
      return {
        left: r2.left,
        top:  r2.top,
        width: r2.width,
        height: r2.height
      };
    }

    const el = owner.el || owner.htmlObject || null;
    if (el && typeof el.getBoundingClientRect === 'function'){
      const b = el.getBoundingClientRect();
      return {
        left: b.left,
        top:  b.top,
        width: b.width,
        height: b.height
      };
    }

    return null;
  }

  _ensureRect(owner){
    const r = this._rectOf(owner);
    if (!r) return null;
    if (!isFinite(r.width) || !isFinite(r.height)) return null;
    if (r.width <= 0 || r.height <= 0) return null;
    return r;
  }

  /* ---------- public API: index yönetimi ---------- */

  register(owner){
    const r = this._ensureRect(owner);
    if (!r) return this;
    this._items.add(owner);
    this.grid.add(owner, r);
    return this;
  }

  update(owner){
    const r = this._ensureRect(owner);
    if (!r){
      this.unregister(owner);
      return this;
    }
    if (!this._items.has(owner)){
      this._items.add(owner);
    }
    this.grid.update(owner, r);
    return this;
  }

  unregister(owner){
    if (!owner) return this;
    this._items.delete(owner);
    this.grid.remove(owner);
    return this;
  }

  clear(){
    this._items.clear();
    this.grid.clear();
    return this;
  }

  /* ---------- public API: queries ---------- */

  /**
   * hitPoint(x, y, opts)
   *  - opts.all === true ise tüm isabetleri dizi olarak döner.
   *  - aksi halde ilk isabet (veya null).
   */
  hitPoint(x, y, opts){
    const all = !!(opts && opts.all);
    const cand = this.grid.queryPoint(x, y);
    if (!cand || !cand.length){
      return all ? [] : null;
    }

    const hits = [];
    for (const owner of cand){
      if (!owner) continue;
      try{
        if (typeof owner.hitTest === 'function'){
          if (!owner.hitTest(x, y)) continue;
        }else{
          // fallback: sadece rect ile test et
          const r = this._ensureRect(owner);
          if (!r) continue;
          if (x < r.left || x > r.left + r.width || y < r.top || y > r.top + r.height){
            continue;
          }
        }
        hits.push(owner);
      }catch(_){}
    }

    if (all) return hits;
    return hits.length ? hits[0] : null;
  }

  /**
   * hitRect(rect, opts)
   *  rect: { left, top, width, height }
   *  - dikdörtgenle kesişen tüm owner'ları döner.
   */
  hitRect(rect, opts){
    if (!rect || rect.width <= 0 || rect.height <= 0) return [];
    const cand = this.grid.queryRect(rect);
    if (!cand || !cand.length) return [];

    const L = rect.left;
    const T = rect.top;
    const R = rect.left + rect.width;
    const B = rect.top  + rect.height;

    const hits = [];
    for (const owner of cand){
      if (!owner) continue;
      const r = this._ensureRect(owner);
      if (!r) continue;
      const rL = r.left;
      const rT = r.top;
      const rR = r.left + r.width;
      const rB = r.top  + r.height;

      const overlap =
        rL <= R &&
        rR >= L &&
        rT <= B &&
        rB >= T;

      if (!overlap) continue;

      if (opts && typeof owner.hitTestRect === 'function'){
        try{
          if (!owner.hitTestRect(rect)) continue;
        }catch(_){}
      }

      hits.push(owner);
    }

    return hits;
  }

});

export default ThitGrid;

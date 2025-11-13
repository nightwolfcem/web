'use strict';

import CLASS from './CLASS.js';
import { isObj } from './utils.js';

/**
 * TgridIndex
 * Basit bir 2D grid tabanlı spatial index.
 * - cellSize: world koordinatlarında hücre boyutu (px)
 * - add/update: bir item + rect ver, grid'e yerleştir
 * - remove: item'ı tüm hücrelerden sil
 * - queryPoint(x,y): noktanın içindeki tüm item'lar
 * - queryRect(rect): alanla çakışan tüm item'lar
 *
 * Item genelde bir Telement veya onun DOM node'u olabilir.
 */
const TgridIndex = CLASS(class TgridIndex {

  constructor(opts = {}){
    super(opts);
    const o = isObj(opts) ? opts : {};
    this.cellSize = Number(o.cellSize) > 0 ? Number(o.cellSize) : 64;
    this.buckets = new Map();   // key: "cx,cy" -> Set(items)
    this.itemCells = new WeakMap(); // item -> Array<{cx,cy}>
  }

  _key(cx, cy){
    return cx + ',' + cy;
  }

  _cellsForRect(rect){
    if (!rect) return [];
    const cs = this.cellSize;
    if (!cs || !isFinite(cs)) return [];

    const left   = Math.floor(rect.left / cs);
    const top    = Math.floor(rect.top / cs);
    const right  = Math.floor((rect.left + rect.width)  / cs);
    const bottom = Math.floor((rect.top  + rect.height) / cs);

    const cells = [];
    for (let cy = top; cy <= bottom; cy++){
      for (let cx = left; cx <= right; cx++){
        cells.push({ cx, cy });
      }
    }
    return cells;
  }

  _setItemCells(item, cells){
    // eski hücrelerden temizle
    const prev = this.itemCells.get(item);
    if (prev && Array.isArray(prev)){
      for (const c of prev){
        const key = this._key(c.cx, c.cy);
        const bucket = this.buckets.get(key);
        if (bucket){
          bucket.delete(item);
          if (!bucket.size) this.buckets.delete(key);
        }
      }
    }

    if (!cells || !cells.length){
      this.itemCells.delete(item);
      return;
    }

    // yeni hücrelere ekle
    for (const c of cells){
      const key = this._key(c.cx, c.cy);
      let bucket = this.buckets.get(key);
      if (!bucket){
        bucket = new Set();
        this.buckets.set(key, bucket);
      }
      bucket.add(item);
    }

    this.itemCells.set(item, cells.slice());
  }

  add(item, rect){
    if (!item || !rect) return this;
    const cells = this._cellsForRect(rect);
    this._setItemCells(item, cells);
    return this;
  }

  update(item, rect){
    // add ile aynı; _setItemCells eski hücreleri temizler
    return this.add(item, rect);
  }

  remove(item){
    if (!item) return this;
    this._setItemCells(item, null);
    return this;
  }

  clear(){
    this.buckets.clear();
    this.itemCells = new WeakMap();
    return this;
  }

  queryPoint(x, y){
    const cs = this.cellSize;
    if (!cs || !isFinite(cs)) return [];
    const cx = Math.floor(x / cs);
    const cy = Math.floor(y / cs);
    const key = this._key(cx, cy);
    const bucket = this.buckets.get(key);
    if (!bucket) return [];
    return Array.from(bucket);
  }

  queryRect(rect){
    const cells = this._cellsForRect(rect);
    if (!cells.length) return [];
    const seen = new Set();
    const out = [];
    for (const c of cells){
      const key = this._key(c.cx, c.cy);
      const bucket = this.buckets.get(key);
      if (!bucket) continue;
      for (const item of bucket){
        if (seen.has(item)) continue;
        seen.add(item);
        out.push(item);
      }
    }
    return out;
  }

});

export default TgridIndex;

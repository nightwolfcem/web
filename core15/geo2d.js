'use strict';
// geo2d.js — Cem-spec unified (deep-clean, fixed)
import CLASS from './CLASS.js'
import { clamp } from './utils.js';
import { Ealign } from './const.enums.js';

/* ======================= İç yardımcılar ======================= */
const _doc = () => (typeof document !== 'undefined' ? document : null);
const _win = () => (typeof window !== 'undefined' ? window : null);
const _px  = (n) => Math.round(+n || 0) + 'px';

/** Sayfa kaydırması */
function _scroll(){
  const w = _win(), d = _doc();
  return {
    x: (w && (w.pageXOffset != null)) ? w.pageXOffset : (d?.documentElement?.scrollLeft || 0),
    y: (w && (w.pageYOffset != null)) ? w.pageYOffset : (d?.documentElement?.scrollTop  || 0),
  };
}
/** offsetParent için güvenli bulucu */
function _offsetParent(el){
  if (!el) return null;
  const doc = _doc();
  return el.offsetParent || (doc && doc.documentElement) || null;
}

/* ================== Tvec2 ================== */
export const Tvec2 = CLASS(class Tvec2 {
  constructor(x=0, y=0){ this.x = +x || 0; this.y = +y || 0; }
  clone(){ return new Tvec2(this.x, this.y); }
  set(x,y){ this.x=+x||0; this.y=+y||0; return this; }
  add(v){ this.x+=v.x; this.y+=v.y; return this; }
  sub(v){ this.x-=v.x; this.y-=v.y; return this; }
  mul(s){ this.x*=s; this.y*=s; return this; }
  div(s){ this.x/=s; this.y/=s; return this; }
  dot(v){ return this.x*v.x + this.y*v.y; }
  cross(v){ return this.x*v.y - this.y*v.x; }
  len(){ return Math.hypot(this.x, this.y); }
  len2(){ return this.x*this.x + this.y*this.y; }
  norm(){ const l=this.len()||1; this.x/=l; this.y/=l; return this; }
  distance(v){ return Math.hypot(this.x-v.x, this.y-v.y); }
  angle(){ return Math.atan2(this.y, this.x); }
  rotate(rad, origin=null){
    const c=Math.cos(rad), s=Math.sin(rad);
    let x=this.x, y=this.y;
    if (origin){ x-=origin.x; y-=origin.y; }
    const nx = x*c - y*s, ny = x*s + y*c;
    if (origin){ this.x = nx+origin.x; this.y = ny+origin.y; } else { this.x=nx; this.y=ny; }
    return this;
  }
  lerp(v, t){ this.x = this.x + (v.x-this.x)*t; this.y = this.y + (v.y-this.y)*t; return this; }
  equals(v, eps=1e-6){ return Math.abs(this.x-v.x)<=eps && Math.abs(this.y-v.y)<=eps; }
  toArray(){ return [this.x, this.y]; }
  toMinJSON(){ return { $:'v2', d:[this.x, this.y] }; }
  static from(a){ if (a instanceof Tvec2) return a.clone(); if (Array.isArray(a)) return new Tvec2(a[0], a[1]); if (a&&'x'in a) return new Tvec2(a.x,a.y); return new Tvec2(a||0,0); }
  static zero(){ return new Tvec2(0,0); }
});

/* ================== Tmat3 (2D affine, 2x3) ================== */
// [ a c tx ]
// [ b d ty ]
// [ 0 0  1 ]
export const Tmat3 = CLASS(class Tmat3 {
  constructor(a=1,b=0,c=0,d=1,tx=0,ty=0){ this.a=a; this.b=b; this.c=c; this.d=d; this.tx=tx; this.ty=ty; }
  clone(){ return new Tmat3(this.a,this.b,this.c,this.d,this.tx,this.ty); }
  set(a,b,c,d,tx,ty){ this.a=a; this.b=b; this.c=c; this.d=d; this.tx=tx; this.ty=ty; return this; }
  identity(){ this.a=1;this.b=0;this.c=0;this.d=1;this.tx=0;this.ty=0; return this; }
  multiply(m){
    const a=this; const b=m;
    const a0=a.a*b.a + a.c*b.b;
    const b0=a.b*b.a + a.d*b.b;
    const c0=a.a*b.c + a.c*b.d;
    const d0=a.b*b.c + a.d*b.d;
    const tx0=a.a*b.tx + a.c*b.ty + a.tx;
    const ty0=a.b*b.tx + a.d*b.ty + a.ty;
    this.a=a0; this.b=b0; this.c=c0; this.d=d0; this.tx=tx0; this.ty=ty0; return this;
  }
  static multiply(a,b){ return a.clone().multiply(b); }
  invert(){
    const det = this.a*this.d - this.b*this.c;
    if (!det) return this.identity();
    const id = 1/det;
    const a=this.a, b=this.b, c=this.c, d=this.d, tx=this.tx, ty=this.ty;
    this.a = d*id; this.b = -b*id; this.c = -c*id; this.d = a*id;
    this.tx = -(this.a*tx + this.c*ty); this.ty = -(this.b*tx + this.d*ty);
    return this;
  }
  transformPoint(p){
    return new Tvec2(
      p.x*this.a + p.y*this.c + this.tx,
      p.x*this.b + p.y*this.d + this.ty
    );
  }
  toArray(){ return [this.a,this.b,this.c,this.d,this.tx,this.ty]; }
  toMinJSON(){ return { $:'m3', d:[this.a,this.b,this.c,this.d,this.tx,this.ty] }; }
  static identity(){ return new Tmat3(); }
  static fromTranslation(x,y){ return new Tmat3(1,0,0,1,x,y); }
  static fromScale(sx,sy){ return new Tmat3(sx,0,0,sy,0,0); }
  static fromRotation(rad){ const c=Math.cos(rad), s=Math.sin(rad); return new Tmat3(c,s,-s,c,0,0); }
});

/* ================== Trect / Tcircle / Tsegment ================== */
export const Trect = CLASS(class Trect {
  constructor(left=0,top=0,width=0,height=0){
    this._left=+left||0; this._top=+top||0;
    this._width=Math.max(0,+width||0); this._height=Math.max(0,+height||0);
    Object.defineProperty(this, 'left',   { enumerable:true, get: ()=> this._left,   set: v=>{ this._left=+v||0; this.commit(); } });
    Object.defineProperty(this, 'top',    { enumerable:true, get: ()=> this._top,    set: v=>{ this._top=+v||0; this.commit(); } });
    Object.defineProperty(this, 'width',  { enumerable:true, get: ()=> this._width,  set: v=>{ this._width=Math.max(0,+v||0); this.commit(); } });
    Object.defineProperty(this, 'height', { enumerable:true, get: ()=> this._height, set: v=>{ this._height=Math.max(0,+v||0); this.commit(); } });
  }
  get x(){ return this.left; }  set x(v){ this.left=v; }
  get y(){ return this.top; }   set y(v){ this.top=v; }
  get w(){ return this.width; } set w(v){ this.width=v; }
  get h(){ return this.height;} set h(v){ this.height=v; }
  get right(){ return this.left + this.width; }  set right(v){ this.left = (+v||0) - this.width; }
  get bottom(){ return this.top + this.height; } set bottom(v){ this.top  = (+v||0) - this.height; }

  clone(){ return new Trect(this.left, this.top, this.width, this.height); }
  moveBy(dx=0,dy=0){ this.left+=+dx||0; this.top+=+dy||0; return this; }
  sizeBy(dw=0,dh=0){ this.width=Math.max(0,this.width+(+dw||0)); this.height=Math.max(0,this.height+(+dh||0)); return this; }

  set(patch){
    if (!patch) return this;
    const n = Object.assign({}, patch);
    if (n.left != null && n.x == null) n.x = +n.left||0;
    if (n.top  != null && n.y == null) n.y = +n.top ||0;
    if (n.width!= null && n.w == null) n.w = Math.max(0,+n.width||0);
    if (n.height!=null && n.h == null) n.h = Math.max(0,+n.height||0);
    if (n.x != null) this._left = +n.x||0;
    if (n.y != null) this._top  = +n.y||0;
    if (n.w != null) this._width = Math.max(0,+n.w||0);
    if (n.h != null) this._height= Math.max(0,+n.h||0);
    if (n.right != null)  this._left = (+n.right||0)  - this._width;
    if (n.bottom != null) this._top  = (+n.bottom||0) - this._height;
    return this;
  }
  assign(patch){ return this.set(patch).commit(); }
  commit(){ return this; } // TelementRect override eder

  static proxy(rect, onChange=null){
    if (!rect || rect.__isRectProxy) return rect;
    const KEYS = new Set(['left','top','width','height','x','y','w','h','right','bottom']);
    const handler = {
      get(target, prop, recv){
        if (prop === '__isRectProxy') return true;
        return Reflect.get(target, prop, recv);
      },
      set(target, prop, value, recv){
        if (KEYS.has(prop)){
          if (prop==='x' || prop==='left')   target._left = +value||0;
          else if (prop==='y' || prop==='top')    target._top = +value||0;
          else if (prop==='w' || prop==='width')  target._width = Math.max(0,+value||0);
          else if (prop==='h' || prop==='height') target._height= Math.max(0,+value||0);
          else if (prop==='right')  target._left = (+value||0) - target._width;
          else if (prop==='bottom') target._top  = (+value||0) - target._height;
          target.commit(); if (typeof onChange==='function') try{ onChange(target); }catch{}
          return true;
        }
        return Reflect.set(target, prop, value, recv);
      },
      ownKeys(target){ return Reflect.ownKeys(target).concat(['left','top','width','height','x','y','w','h','right','bottom']); },
      getOwnPropertyDescriptor(target, prop){
        if (KEYS.has(prop)){
          return { configurable:true, enumerable:true, writable:true, value: target[prop] };
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }
    };
    return new Proxy(rect, handler);
  }

  containsPoint(p){ return p.x>=this.left && p.x<=this.right && p.y>=this.top && p.y<=this.bottom; }
  center(){ return new Tvec2(this.left + this.width/2, this.top + this.height/2); }
  inflate(dx,dy){ this.left-=dx; this.top-=dy; this.width+=2*dx; this.height+=2*dy; return this; }
  intersect(r){
    const x1=Math.max(this.left,r.left), y1=Math.max(this.top,r.top);
    const x2=Math.min(this.right, r.right), y2=Math.min(this.bottom, r.bottom);
    if (x2>=x1 && y2>=y1) return new Trect(x1,y1,x2-x1,y2-y1);
    return null;
  }
  union(r){
    const x1=Math.min(this.left,r.left), y1=Math.min(this.top, r.top);
    const x2=Math.max(this.right, r.right), y2=Math.max(this.bottom, r.bottom);
    return new Trect(x1,y1,x2-x1,y2-y1);
  }

  toArray(){ return [this.left,this.top,this.width,this.height]; }
  toMinJSON(){ return { $:'r', d:[this.left, this.top, this.width, this.height] }; }

  static from(v){
    if (!v) return new Trect();
    if (v instanceof Trect) return v.clone();
    if (v.getBoundingClientRect) return rectOfEl(v);
    if (typeof v==='object') return new Trect(v.left||v.x||0, v.top||v.y||0, v.width||v.w||0, v.height||v.h||0);
    return new Trect();
  }
});

export const Tcircle = CLASS(class Tcircle {
  constructor(cx=0, cy=0, r=0){ this.cx=cx; this.cy=cy; this.r=r; }
  clone(){ return new Tcircle(this.cx,this.cy,this.r); }
  containsPoint(p){ return Math.hypot(p.x-this.cx, p.y-this.cy) <= this.r; }
  toMinJSON(){ return { $:'c', d:[this.cx,this.cy,this.r] }; }
});

export const Tsegment = CLASS(class Tsegment {
  constructor(p0=Tvec2.zero(), p1=Tvec2.zero()){ this.p0=Tvec2.from(p0); this.p1=Tvec2.from(p1); }
  length(){ return this.p0.distance(this.p1); }
  closestPoint(p){
    const vx=this.p1.x-this.p0.x, vy=this.p1.y-this.p0.y;
    const wx=p.x-this.p0.x, wy=p.y-this.p0.y;
    const c1=vx*wx + vy*wy, c2=vx*vx + vy*vy;
    const t = c2>0 ? clamp(c1/c2, 0, 1) : 0;
    return new Tvec2(this.p0.x + vx*t, this.p0.y + vy*t);
  }
  distanceToPoint(p){ return this.closestPoint(p).distance(Tvec2.from(p)); }
  intersects(other){
    const p = this.p0, r = new Tvec2(this.p1.x-this.p0.x, this.p1.y-this.p0.y);
    const q = other.p0, s = new Tvec2(other.p1.x-other.p0.x, other.p1.y-other.p0.y);
    const rxs = r.cross(s); const q_p = new Tvec2(q.x-p.x,q.y-p.y); const q_pxr = q_p.cross(r);
    if (Math.abs(rxs) < 1e-6 && Math.abs(q_pxr) < 1e-6){
      const t0=(q_p.x*r.x + q_p.y*r.y)/(r.x*r.x+r.y*r.y); const t1=t0 + (s.x*r.x + s.y*r.y)/(r.x*r.x+r.y*r.y);
      const [a,b]=[Math.min(t0,t1), Math.max(t0,t1)];
      return !(b<0 || a>1);
    }
    if (Math.abs(rxs) < 1e-6) return false;
    const t = (q_p.cross(s))/rxs; const u = (q_p.cross(r))/rxs;
    return t>=0 && t<=1 && u>=0 && u<=1;
  }
  toMinJSON(){ return { $:'s2', d:[this.p0.toArray(), this.p1.toArray()] }; }
});

/* ======================= Koordinat Sistemleri ======================= */
export const Ecs = Object.freeze({ page:'page', client:'client', viewport:'client', offset:'offset' });

export function rectOfEl(el){
  if (!el || !el.getBoundingClientRect) return new Trect();
  const r = el.getBoundingClientRect();
  const s = _scroll();
  return new Trect(r.left + s.x, r.top + s.y, r.width, r.height); // PAGE
}
export function rectInSpace(el, cs=Ecs.page){
  if (!el) return new Trect();
  const r = el.getBoundingClientRect();
  if (cs === Ecs.page){
    const s = _scroll();
    return new Trect(r.left + s.x, r.top + s.y, r.width, r.height);
  }
  return new Trect(r.left, r.top, r.width, r.height);
}
function _pageToOffset(el, pageLeft, pageTop){
  const op = _offsetParent(el);
  if (!op) return {left: pageLeft, top: pageTop};
  const opRect = rectOfEl(op);
  const cs = (typeof getComputedStyle!=='undefined') ? getComputedStyle(op) : null;
  const bl = cs ? parseFloat(cs.borderLeftWidth)||0 : 0;
  const bt = cs ? parseFloat(cs.borderTopWidth)||0 : 0;
  return { left: pageLeft - opRect.left - bl, top: pageTop - opRect.top - bt };
}
function _offsetToPage(el, cssLeft, cssTop){
  const op = _offsetParent(el);
  if (!op) return {left: cssLeft, top: cssTop};
  const opRect = rectOfEl(op);
  const cs = (typeof getComputedStyle!=='undefined') ? getComputedStyle(op) : null;
  const bl = cs ? parseFloat(cs.borderLeftWidth)||0 : 0;
  const bt = cs ? parseFloat(cs.borderTopWidth)||0 : 0;
  return { left: opRect.left + bl + cssLeft, top: opRect.top + bt + cssTop };
}
export function convertRect(src, from=Ecs.page, to=Ecs.page, el=null){
  if (!src) return new Trect();
  const r = (src instanceof Trect) ? src.clone() : new Trect(src.left, src.top, src.width, src.height);
  if (from === to) return r;
  if (to === Ecs.page && from !== Ecs.page){
    if (from === Ecs.offset && el) {
      const page = _offsetToPage(el, r.left, r.top);
      return new Trect(page.left, page.top, r.width, r.height);
    }
    const s = _scroll(); return new Trect(r.left+s.x, r.top+s.y, r.width, r.height);
  }
  if (to === Ecs.offset && el){
    const page = (from === Ecs.page) ? {left:r.left, top:r.top} : {left:r.left+_scroll().x, top:r.top+_scroll().y};
    const css = _pageToOffset(el, page.left, page.top);
    return new Trect(css.left, css.top, r.width, r.height);
  }
  if (to === Ecs.client && from === Ecs.page){
    const s=_scroll(); return new Trect(r.left-s.x, r.top-s.y, r.width, r.height);
  }
  return r;
}

/* ======================= Align Parse & Hesap ======================= */
function _flagsFromString(str){
  const s = String(str).toLowerCase().replace(/[\s,]+/g, '+');
  const parts = s.split('+').filter(Boolean);
  const flags = new Set();
  for (const t of parts){
    if (t==='left' || t==='right' || t==='center' || t==='hcenter') flags.add(t==='hcenter'?'center':t);
    else if (t==='top' || t==='bottom' || t==='middle' || t==='vcenter') flags.add(t==='vcenter'?'middle':t);
    else if (t==='outer' || t==='outside') flags.add('outer');
    else if (t==='inner' || t==='inside') flags.add('inner');
  }
  return flags;
}
function _tokensFromFlags(f){
  if (f && typeof f!=='number'){
    const flags = new Set(f);
    let hx = 'left';
    if (flags.has('right') && !flags.has('left')) hx = 'right';
    else if (flags.has('center')) hx = 'center';
    else if (flags.has('left') && flags.has('right')) hx = 'center';

    let vy = 'top';
    if (flags.has('bottom') && !flags.has('top')) vy = 'bottom';
    else if (flags.has('middle')) vy = 'middle';
    else if (flags.has('top') && flags.has('bottom')) vy = 'middle';

    const inner = !flags.has('outer');
    return { hx, vy, inner, flags };
  }
  const E = (typeof Ealign==='object' && Ealign) ? Ealign : {};
  const has = (name)=> typeof E[name]==='number' ? ((f & E[name]) === E[name]) : false;
  const flags = new Set();
  if (has('left')) flags.add('left');
  if (has('right')) flags.add('right');
  if (has('top')) flags.add('top');
  if (has('bottom')) flags.add('bottom');
  if (has('center')||has('hCenter')) flags.add('center');
  if (has('middle')||has('vCenter')) flags.add('middle');
  if (has('outer')) flags.add('outer');
  if (has('inner')) flags.add('inner');
  let hx = 'left';
  if (flags.has('right') && !flags.has('left')) hx = 'right';
  else if (flags.has('center')) hx = 'center';
  else if (flags.has('left') && flags.has('right')) hx = 'center';
  let vy = 'top';
  if (flags.has('bottom') && !flags.has('top')) vy = 'bottom';
  else if (flags.has('middle')) vy = 'middle';
  else if (flags.has('top') && flags.has('bottom')) vy = 'middle';
  const inner = !flags.has('outer');
  return { hx, vy, inner, flags };
}
export function parseAlignSpec(spec){
  if (spec == null) spec = '';
  if (typeof spec === 'number' && typeof Ealign?.strOf === 'function'){
    return parseAlignSpec(Ealign.strOf(spec));
  }
  if (spec && typeof spec==='object'){
    if (typeof spec.toFlags==='function') return _tokensFromFlags(spec.toFlags());
    if (typeof spec.flags==='number') return _tokensFromFlags(spec.flags);
    if (typeof spec.value==='number') return _tokensFromFlags(spec.value);
    if (typeof spec.spec==='string')  spec = spec.spec;
  }
  let s = String(spec).toLowerCase().trim();
  s = s.replace(/[\s,]+/g,' ');
  s = s.replace(/\bleft\s+right\b/g,'left+right').replace(/\btop\s+bottom\b/g,'top+bottom').replace(/\bcenter\b/g,'middle');
  s = s.replace(/\s+/g,'+');
  const flags = _flagsFromString(s);
  let tok = _tokensFromFlags(flags);
  const hasX = tok.flags.has('left') || tok.flags.has('right') || tok.flags.has('center') || tok.flags.has('hstretch');
  const hasY = tok.flags.has('top')  || tok.flags.has('bottom') || tok.flags.has('middle') || tok.flags.has('vstretch');
  if (hasX && !hasY){ tok.vy = 'middle'; tok.flags.add('middle'); }
  if (!hasX && hasY){ tok.hx = 'left';   tok.flags.add('left'); }
  return tok;
}
function computeAlignedXY(srcRect, dstRect, parsed, ox=0, oy=0){
  const flags = (parsed && parsed.flags instanceof Set) ? parsed.flags : new Set();
  const hx = parsed && parsed.hx ? parsed.hx : 'left';
  const vy = parsed && parsed.vy ? parsed.vy : 'top';
  const inner = (parsed && typeof parsed.inner === 'boolean')
                  ? parsed.inner
                  : (parsed && parsed.mode ? (parsed.mode !== 'outer') : true);

  const off = { left:0, right:0, top:0, bottom:0 };
  if (typeof ox==='number') off.left = +ox||0; else if (ox && typeof ox==='object') Object.assign(off, ox);
  if (typeof oy==='number') off.top  = +oy||0; else if (oy && typeof oy==='object') Object.assign(off, oy);

  const bothX = flags.has('left') && flags.has('right');
  const bothY = flags.has('top')  && flags.has('bottom');

  let width  = srcRect.width;
  let height = srcRect.height;

  let left;
  if (bothX){
    left  = dstRect.left + off.left;
    width = dstRect.width;
  } else if (flags.has('left')){
    left = inner ? (dstRect.left + off.left) : (dstRect.left - width - off.left);
  } else if (flags.has('right')){
    left = inner ? (dstRect.left + dstRect.width - width - off.right)
                 : (dstRect.left + dstRect.width + off.right);
  } else {
    left = dstRect.left + (dstRect.width - width)/2 + (off.left - off.right);
  }

  let top;
  if (bothY){
    top    = dstRect.top + off.top;
    height = dstRect.height;
  } else if (flags.has('top')){
    top = inner ? (dstRect.top + off.top) : (dstRect.top - height - off.top);
  } else if (flags.has('bottom')){
    top = inner ? (dstRect.top + dstRect.height - height - off.bottom)
                : (dstRect.top + dstRect.height + off.bottom);
  } else {
    top = dstRect.top + (dstRect.height - height)/2 + (off.top - off.bottom);
  }

  return { left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) };
}

/* ======================= DOM-entegrasyon: TelementRect ======================= */
export const TelementRect = CLASS(class TelementRect extends Trect {
  constructor(el, owner=el){
    const r = el ? rectOfEl(el) : new Trect();
    super(r.left, r.top, r.width, r.height);
    this._el = el || null;
    this._owner = owner || this._el || null;
  }

  get owner(){ return this._owner || this._el || null; }
  set owner(v){ this._owner = v || null; }

  refresh(cs=Ecs.page){
    if (!this._el) return this;
    const r = rectInSpace(this._el, cs);
    this._left=r.left; this._top=r.top; this._width=r.width; this._height=r.height;
    return this;
  }

  commit(cssSpace=Ecs.offset){
    if (!this._el || !this._el.style) return this;
    const cs = (typeof getComputedStyle!=='undefined') ? getComputedStyle(this._el) : null;
    const space = (cs && cs.position === 'fixed') ? Ecs.client : cssSpace;
    const target = convertRect(new Trect(this._left, this._top, this._width, this._height), Ecs.page, space, this._el);
    const s = this._el.style;
    if (space === Ecs.offset){
      if (s.position === '' || s.position === 'static') s.position = 'absolute';
    } else if (space === Ecs.client){
      s.position = 'fixed';
    }
    s.left = _px(target.left);
    s.top  = _px(target.top);
    s.width  = _px(target.width);
    s.height = _px(target.height);
    return this;
  }

  alignTo(dst, spec='left top', ox=0, oy=0, apply=true){
    if (spec == null || spec === ''){
      const ow = this.owner;
      const fb = ow && (ow.align != null ? ow.align : ow.eAlign);
      const elSpec = this._el && (this._el.align != null ? this._el.align : this._el.eAlign);
      spec = (fb != null) ? fb : (elSpec != null ? elSpec : 'left top');
    }
    const dstRect = (dst instanceof Trect) ? dst.clone()
                  : (dst && dst.getBoundingClientRect ? rectOfEl(dst) : null);
    const anchor = dstRect || new Trect(0,0, (_win()?.innerWidth||0), (_win()?.innerHeight||0));
    const parsed = parseAlignSpec(((typeof spec==='string' && spec.trim()==='')||spec==null)?(this.owner?.align ?? this._el?.align ?? 'left top'):spec);
    const xy = computeAlignedXY(this, anchor, parsed, ox, oy);
    this._left = xy.left; this._top = xy.top;
    this._width = xy.width; this._height = xy.height;
    if (apply) this.commit();
    return this;
  }
  toAlign(dst, spec='left top', ox=0, oy=0, apply=true){ return this.alignTo(dst, spec, ox, oy, apply); }

  static alignTo(srcEl, dst, spec='left top', ox=0, oy=0){
    if (!srcEl) return { left:0, top:0, width:0, height:0 };
    const srcRect = rectOfEl(srcEl);
    const dstRect = (dst instanceof Trect) ? dst.clone()
                  : (dst && dst.getBoundingClientRect ? rectOfEl(dst) : null);
    const parsed = parseAlignSpec(spec);
    const anchor = dstRect || new Trect(0,0, (_win()?.innerWidth||0), (_win()?.innerHeight||0));
    const xy = computeAlignedXY(srcRect, anchor, parsed, ox, oy);
    return { left: xy.left, top: xy.top, width: xy.width, height: xy.height };
  }
  static applyPageRect(el, r){
    if (!el || !el.style || !r) return;
    const s = el.style;
    if (s.position === '' || s.position === 'static') s.position = 'absolute';
    s.left = _px(r.left); s.top = _px(r.top); s.width = _px(r.width); s.height = _px(r.height);
  }

  static bind(el, {refresh=true, owner=el}={}){
    if (!el) return null;
    if (el.__tRect && el.__tRectProxy) return el.__tRectProxy;
    const r = new TelementRect(el, owner);
    const proxy = Trect.proxy(r);
    Object.defineProperty(el, 'rect', {
      configurable: true,
      enumerable: false,
      get(){ return proxy; },
      set(v){
        if (v && typeof v==='object'){ r.set(v).commit(); }
      }
    });
    Object.defineProperty(el, '__tRect', { value: r, configurable: true, enumerable: false, writable: true });
    Object.defineProperty(el, '__tRectProxy', { value: proxy, configurable: true, enumerable: false, writable: true });
    if (refresh) r.refresh();
    return proxy;
  }
  static ensure(el){ return (el && el.rect) ? el.rect : TelementRect.bind(el); }
  static unbind(el){
    if (!el) return;
    try { delete el.rect; } catch {}
    if ('__tRect' in el) delete el.__tRect;
    if ('__tRectProxy' in el) delete el.__tRectProxy;
  }

  static proxy(rect){ return Trect.proxy(rect); }
});

/* ======================= 2D Pose ======================= */
export const Tpose2d = CLASS(class Tpose2d {
  constructor(x=0, y=0, rot=0, sx=1, sy=1, ox=0, oy=0){
    this.x=+x||0; this.y=+y||0; this.rot=+rot||0; this.sx=(+sx||0)||1; this.sy=(+sy||0)||1; this.ox=+ox||0; this.oy=+oy||0;
  }
  set(p){ if(!p) return this;
    if ('x' in p) this.x=+p.x||0;
    if ('y' in p) this.y=+p.y||0;
    if ('rot' in p) this.rot=+p.rot||0;
    if ('sx' in p) this.sx=(+p.sx||0)||1;
    if ('sy' in p) this.sy=(+p.sy||0)||1;
    if ('ox' in p) this.ox=+p.ox||0;
    if ('oy' in p) this.oy=+p.oy||0;
    return this;
  }
  assign(p){ return this.set(p).commit(); }
  commit(){ return this; }

  toMatrix3(){
    const c=Math.cos(this.rot), s=Math.sin(this.rot);
    const a =  c*this.sx, b = s*this.sx;
    const c2 = -s*this.sy, d = c*this.sy;
    const e = this.x - this.ox*a - this.oy*c2;
    const f = this.y - this.ox*b - this.oy*d;
    return [a, b, c2, d, e, f];
  }
  toCSSTransform(){ const [a,b,c,d,e,f]=this.toMatrix3(); return `matrix(${a},${b},${c},${d},${e},${f})`; }
  applyTo(el){ if(!el||!el.style) return this; el.style.transform = this.toCSSTransform(); return this; }

  toMinJSON(){ return { $:'pose2', d:[this.x,this.y,this.rot,this.sx,this.sy,this.ox,this.oy] }; }
  static fromMinJSON(o){ if(!o||o.$!=='pose2') return null; const [x,y,rot,sx,sy,ox,oy]=o.d||[0,0,0,1,1,0,0]; return new Tpose2d(x,y,rot,sx,sy,ox,oy); }
});

/* ======================= Çokgen yardımcıları ======================= */
export function polygonArea(pts){ let a=0; for(let i=0,j=pts.length-1;i<pts.length;j=i++) a += (pts[j].x+pts[i].x)*(pts[j].y-pts[i].y); return a*0.5; }
export function isClockwise(pts){ return polygonArea(pts) < 0; }
export function centroid(pts){ let x=0,y=0; for (const p of pts){ x+=p.x; y+=p.y; } const n=pts.length||1; return new Tvec2(x/n,y/n); }
export function convexHull(points){
  const pts = points.map(Tvec2.from).sort((a,b)=> a.x===b.x ? a.y-b.y : a.x-b.x);
  if (pts.length<=1) return pts;
  const cross=(o,a,b)=> (a.x-o.x)*(b.y-o.y) - (a.y-o.y)*(b.x-o.x);
  const lower=[]; for(const p of pts){ while(lower.length>=2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop(); lower.push(p); }
  const upper=[]; for(let i=pts.length-1;i>=0;i--){ const p=pts[i]; while(upper.length>=2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop(); upper.push(p); }
  upper.pop(); lower.pop(); return lower.concat(upper);
}

/* ======================= Kolaylık & Alias ======================= */
export function alignElTo(el, dst, spec='left top', ox=0, oy=0, apply=true){
  const patch = TelementRect.alignTo(el, dst, spec, ox, oy);
  if (apply) TelementRect.applyPageRect(el, new Trect(patch.left, patch.top, patch.width, patch.height));
  return patch;
}
// Eski beklenti için alias:
export { Tmat3 as Tmat2d };

export default {
  Tvec2, Tmat3, Trect, Tcircle, Tsegment,
  TelementRect, Tpose2d,
  Ecs, rectOfEl, rectInSpace, convertRect,
  parseAlignSpec, alignElTo,
  polygonArea, isClockwise, centroid, convexHull
};

// === Cem-spec APPEND (non-breaking): minimal 2D geometry helpers ===
export const within = (v, a, b) => v >= a && v <= b;
export function point(x=0, y=0){ return { x:+x||0, y:+y||0 }; }
export function pointOf(p){ return point(p.x, p.y); }
export function pointEqual(a,b){ return !!a && !!b && a.x===b.x && a.y===b.y; }
export function rect(x=0, y=0, w=0, h=0){ return { x:+x||0, y:+y||0, w:+w||0, h:+h||0 }; }
export function rectOf(r){ return rect(r.x, r.y, r.w, r.h); }
export function rectEqual(a,b){ return !!a && !!b && a.x===b.x && a.y===b.y && a.w===b.w && a.h===b.h; }
export function rectNormalize(r){ const x = Math.min(r.x, r.x+r.w); const y = Math.min(r.y, r.y+r.h); const w = Math.abs(r.w); const h = Math.abs(r.h); return { x, y, w, h }; }
export function rectContainsPoint(r, p){ return p.x>=r.x && p.x<=r.x+r.w && p.y>=r.y && p.y<=r.y+r.h; }
export function rectIntersects(a,b){ return !(a.x+a.w < b.x || b.x+b.w < a.x || a.y+a.h < b.y || b.y+b.h < a.y); }
export function rectUnion(a,b){ const x=Math.min(a.x,b.x), y=Math.min(a.y,b.y); const x2=Math.max(a.x+a.w,b.x+b.w), y2=Math.max(a.y+a.h,b.y+b.h); return { x, y, w:x2-x, h:y2-y }; }
export function rectTranslate(r, dx=0, dy=0){ return { x:r.x+dx, y:r.y+dy, w:r.w, h:r.h }; }
export function rectScale(r, sx=1, sy=1, cx=r.x, cy=r.y){ const nx = cx + (r.x - cx)*sx; const ny = cy + (r.y - cy)*sy; return { x:nx, y:ny, w:r.w*sx, h:r.h*sy }; }
export function rectGrow(r, g=0){ return { x:r.x-g, y:r.y-g, w:r.w+2*g, h:r.h+2*g }; }
export function rectCenter(r){ return { x:r.x + r.w/2, y:r.y + r.h/2 }; }
export function rectSize(r){ return { w:r.w, h:r.h }; }
export function distance(a, b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx, dy); }
export function snap(v, step=1){ return Math.round(v/step)*step; }
export function snapToGrid(p, step=1){ return { x:snap(p.x, step), y:snap(p.y, step) }; }
// === END APPEND ===

// === Cem-spec APPEND: segment/polygon & rotated AABB helpers ========
/** Noktanın çokgen içinde olup olmadığını (ray casting) test eder. */
export function pointInPolygon(pt, poly){
  const x = pt.x, y = pt.y;
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++){
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/((yj-yi)||1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** İki doğru parçasının kesişimi: { hit, t, u, p } – hit:false ise p null. */
export function segmentIntersect(a1, a2, b1, b2){
  const r = { hit:false, t:0, u:0, p:null };
  const x1=a1.x, y1=a1.y, x2=a2.x, y2=a2.y;
  const x3=b1.x, y3=b1.y, x4=b2.x, y4=b2.y;
  const dx1 = x2-x1, dy1 = y2-y1;
  const dx2 = x4-x3, dy2 = y4-y3;
  const denom = dx1*dy2 - dy1*dx2;
  if (Math.abs(denom) < 1e-9) return r; // paralel
  const t = ((x3-x1)*dy2 - (y3-y1)*dx2) / denom;
  const u = ((x3-x1)*dy1 - (y3-y1)*dx1) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return r;
  r.t = t; r.u = u; r.hit = true;
  r.p = { x: x1 + t*dx1, y: y1 + t*dy1 };
  return r;
}

/** Bir noktayı segmente projeksiyon: {p, t, dist}. t∈[0,1] clamp'li. */
export function projectPointOnSegment(p, a, b){
  const ax=a.x, ay=a.y, bx=b.x, by=b.y;
  const abx = bx-ax, aby = by-ay;
  const apx = p.x-ax, apy = p.y-ay;
  const ab2 = abx*abx + aby*aby || 1e-12;
  let t = (apx*abx + apy*aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t*abx, py = ay + t*aby;
  const dx = p.x - px, dy = p.y - py;
  return { p:{x:px,y:py}, t, dist: Math.hypot(dx,dy) };
}

/** Döndürülmüş dikdörtgenin AABB'si (axis-aligned bbox). */
export function rotatedRectAABB({ x, y, w, h, cx=x+w/2, cy=y+h/2, rot=0 }){
  const c = Math.cos(rot), s = Math.sin(rot);
  const pts = [
    {x:x-cx,     y:y-cy},
    {x:x+w-cx,   y:y-cy},
    {x:x+w-cx,   y:y+h-cy},
    {x:x-cx,     y:y+h-cy},
  ].map(p=>({ x: cx + p.x*c - p.y*s, y: cy + p.x*s + p.y*c }));
  let minX=+Infinity, minY=+Infinity, maxX=-Infinity, maxY=-Infinity;
  for (const p of pts){ if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y; }
  return { x:minX, y:minY, w:maxX-minX, h:maxY-minY };
}

/** Çizgi–AABB çarpışma testi (Cohen–Sutherland benzeri hızlı test). */
export function segmentIntersectsRect(a, b, r){
  // AABB hızlı dışlama
  const rx1=r.x, ry1=r.y, rx2=r.x+r.w, ry2=r.y+r.h;
  if (Math.max(a.x,b.x) < rx1 || Math.min(a.x,b.x) > rx2 ||
      Math.max(a.y,b.y) < ry1 || Math.min(a.y,b.y) > ry2) return false;
  // Her iki nokta içeride ise
  if (a.x>=rx1&&a.x<=rx2&&a.y>=ry1&&a.y<=ry2) return true;
  if (b.x>=rx1&&b.x<=rx2&&b.y>=ry1&&b.y<=ry2) return true;
  // Kenarlara kesişim
  const p = segmentIntersect(a,b,{x:rx1,y:ry1},{x:rx2,y:ry1}); if (p.hit) return true;
  const p2= segmentIntersect(a,b,{x:rx2,y:ry1},{x:rx2,y:ry2}); if (p2.hit) return true;
  const p3= segmentIntersect(a,b,{x:rx2,y:ry2},{x:rx1,y:ry2}); if (p3.hit) return true;
  const p4= segmentIntersect(a,b,{x:rx1,y:ry2},{x:rx1,y:ry1}); if (p4.hit) return true;
  return false;
}
// === END APPEND ====================================================================

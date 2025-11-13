'use strict';
// math2D — Math benzeri 2D namespace (OBJE). CLASS kullanılmaz.

let EPS = 1e-6;
const PI  = Math.PI;
const TAU = Math.PI * 2;

// Yardımcılar (içte kullanılır)
const _clamp = (x,min,max)=>{
  if (min>max){ const t=min; min=max; max=t; }
  return x<min?min:(x>max?max:x);
};

export const math2D = Object.freeze({
  // ==== Sabitler / Ayarlar ====
  get EPS(){ return EPS; },
  PI, TAU,
  setEps(v){
    const nv = +v;
    if (Number.isFinite(nv) && nv > 0) EPS = Math.max(1e-12, nv);
    return EPS;
  },

  // ==== Skaler ====
  eq(a,b,eps){ const e = eps ?? EPS; return Math.abs(a-b) <= e; },
  neq(a,b,eps){ return !this.eq(a,b,eps); },
  lt(a,b,eps){ const e = eps ?? EPS; return a < b - e; },
  gt(a,b,eps){ const e = eps ?? EPS; return a > b + e; },
  le(a,b,eps){ return !this.gt(a,b,eps); },
  ge(a,b,eps){ return !this.lt(a,b,eps); },
  approxZero(a,eps){ const e = eps ?? EPS; return Math.abs(a) <= e; },

  clamp(x,min,max){ return _clamp(x,min,max); },
  lerp(a,b,t){ return a + (b-a)*t; },
  rad(deg){ return deg * (Math.PI/180); },
  deg(rad){ return rad * (180/Math.PI); },
  normAngle(rad){
    let r = rad % TAU;
    if (r >=  Math.PI) r -= TAU;
    if (r <  -Math.PI) r += TAU;
    return r;
  },

  // ==== Vec2 ====
  v2(x=0,y=0){ return [x,y]; },
  add2(a,b){ return [a[0]+b[0], a[1]+b[1]]; },
  sub2(a,b){ return [a[0]-b[0], a[1]-b[1]]; },
  scale2(a,s){ return [a[0]*s, a[1]*s]; },
  dot2(a,b){ return a[0]*b[0] + a[1]*b[1]; },
  cross2(a,b){ return a[0]*b[1] - a[1]*b[0]; }, // z-bileşeni
  len2(a){ return Math.hypot(a[0], a[1]); },
  len2Sq(a){ return a[0]*a[0] + a[1]*a[1]; },
  norm2(a){ const L=this.len2(a); return L>0?[a[0]/L,a[1]/L]:[0,0]; },
  dist2(a,b){ return Math.hypot(a[0]-b[0], a[1]-b[1]); },
  dist2Sq(a,b){ const dx=a[0]-b[0], dy=a[1]-b[1]; return dx*dx+dy*dy; },
  angle2(a){ return Math.atan2(a[1], a[0]); },
  fromAngle2(rad,len=1){ return [Math.cos(rad)*len, Math.sin(rad)*len]; },
  perp2(a){ return [-a[1], a[0]]; },

  // ==== Doğru/Kesişim ====
  intersectLines2(p, r, q, s){
    const rxs = this.cross2(r, s);
    const qmp = this.sub2(q, p);
    if (this.approxZero(rxs)) return { hit:false, parallel:true };
    const t = this.cross2(qmp, s) / rxs;
    const u = this.cross2(qmp, r) / rxs;
    return { hit:true, t, u, point: [p[0]+t*r[0], p[1]+t*r[1]] };
  },
  intersectSegments2(a0,a1,b0,b1){
    const r = this.sub2(a1,a0);
    const s = this.sub2(b1,b0);
    const res = this.intersectLines2(a0,r,b0,s);
    if (!res.hit) return { hit:false, parallel:res.parallel };
    const {t,u,point} = res;
    if (t>=-EPS && t<=1+EPS && u>=-EPS && u<=1+EPS) return { hit:true, t, u, point };
    return { hit:false };
  },
  projectPointToSeg2(p,a,b){
    const ab = this.sub2(b,a);
    const ap = this.sub2(p,a);
    const abLenSq = this.len2Sq(ab);
    if (this.approxZero(abLenSq)) return { proj:a.slice(), t:0, clamp:true };
    let t = this.dot2(ap, ab) / abLenSq;
    const clamped = (t<0 || t>1);
    t = _clamp(t, 0, 1);
    return { proj:[a[0]+ab[0]*t, a[1]+ab[1]*t], t, clamp:clamped };
  },

  // ==== BBox2 ====
  bbox2FromPoints(pts){
    let minx=+Infinity, miny=+Infinity, maxx=-Infinity, maxy=-Infinity;
    for (const p of pts){ const x=p[0], y=p[1]; if (x<minx)minx=x; if (y<miny)miny=y; if (x>maxx)maxx=x; if (y>maxy)maxy=y; }
    return { min:[minx,miny], max:[maxx,maxy], width:maxx-minx, height:maxy-miny };
  },
  bbox2Expand(bb, pad){
    const p = Math.abs(+pad)||0;
    return { min:[bb.min[0]-p,bb.min[1]-p], max:[bb.max[0]+p,bb.max[1]+p], width:bb.width+2*p, height:bb.height+2*p };
  },
  bbox2ContainsPoint(bb, pt){
    return pt[0]>=bb.min[0]-EPS && pt[0]<=bb.max[0]+EPS &&
           pt[1]>=bb.min[1]-EPS && pt[1]<=bb.max[1]+EPS;
  },
  bbox2Intersects(a,b){
    return !(a.max[0] < b.min[0]-EPS || a.min[0] > b.max[0]+EPS ||
             a.max[1] < b.min[1]-EPS || a.min[1] > b.max[1]+EPS);
  },

  // ==== Çokgen ====
  polyArea2(pts){
    let s=0, n=pts.length;
    for (let i=0;i<n;i++){ const p=pts[i], q=pts[(i+1)%n]; s += p[0]*q[1] - p[1]*q[0]; }
    return 0.5*s;
  },
  polyCentroid2(pts){
    let A = this.polyArea2(pts);
    if (this.approxZero(A)) {
      let cx=0, cy=0; for (const p of pts){ cx+=p[0]; cy+=p[1]; }
      const n=pts.length||1; return [cx/n, cy/n];
    }
    let cx=0, cy=0;
    for (let i=0;i<pts.length;i++){
      const p=pts[i], q=pts[(i+1)%pts.length];
      const cross = p[0]*q[1] - q[0]*p[1];
      cx += (p[0]+q[0])*cross; cy += (p[1]+q[1])*cross;
    }
    const k = 1/(6*A);
    return [cx*k, cy*k];
  },
  polyClockwise2(pts){ return this.polyArea2(pts) < 0; },
  pointInPoly2(pt, poly){
    let inside=false, n=poly.length, x=pt[0], y=pt[1];
    for (let i=0,j=n-1;i<n;j=i++){
      const xi=poly[i][0], yi=poly[i][1], xj=poly[j][0], yj=poly[j][1];
      const intersect = ((yi>y)!=(yj>y)) && (x < (xj - xi)*(y - yi)/(yj - yi + 0.0) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },

  // ==== Dikdörtgen yardımcıları ====
  rectFromXYWH(x,y,w,h){ return { x, y, w, h }; },
  rectContainsPoint(r, p){
    return p[0]>=r.x-EPS && p[0]<=r.x+r.w+EPS &&
           p[1]>=r.y-EPS && p[1]<=r.y+r.h+EPS;
  },
  rectIntersects(a,b){
    return !(a.x+a.w < b.x-EPS || b.x+b.w < a.x-EPS ||
             a.y+a.h < b.y-EPS || b.y+b.h < a.y-EPS);
  },

  // ==== Mat2D (affine) ====
  mat2dIdentity(){ return { a:1, b:0, c:0, d:1, tx:0, ty:0 }; },
  mat2d(a=1,b=0,c=0,d=1,tx=0,ty=0){ return { a,b,c,d,tx,ty }; },
  mat2dMultiply(A,B){
    return {
      a: A.a*B.a + A.c*B.b,
      b: A.b*B.a + A.d*B.b,
      c: A.a*B.c + A.c*B.d,
      d: A.b*B.c + A.d*B.d,
      tx: A.a*B.tx + A.c*B.ty + A.tx,
      ty: A.b*B.tx + A.d*B.ty + A.ty
    };
  },
  mat2dTranslate(tx,ty){ return { a:1,b:0,c:0,d:1,tx,ty }; },
  mat2dScale(sx,sy){ return { a:sx,b:0,c:0,d:sy,tx:0,ty:0 }; },
  mat2dRotate(rad){
    const c=Math.cos(rad), s=Math.sin(rad);
    return { a:c,b:s,c:-s,d:c,tx:0,ty:0 };
  },
  mat2dInvert(M){
    const det = M.a*M.d - M.b*M.c;
    if (Math.abs(det) <= EPS) return null;
    const id = 1/det;
    return {
      a:  M.d*id,  b: -M.b*id,
      c: -M.c*id,  d:  M.a*id,
      tx: (M.c*M.ty - M.d*M.tx)*id,
      ty: (M.b*M.tx - M.a*M.ty)*id
    };
  },
  mat2dApplyToPoint(M, p){
    return [ M.a*p[0] + M.c*p[1] + M.tx,  M.b*p[0] + M.d*p[1] + M.ty ];
  },
  mat2dCompose({tx=0,ty=0,rot=0,scale:[sx,sy]=[1,1]}={}){
    const T = this.mat2dTranslate(tx,ty);
    const R = this.mat2dRotate(rot);
    const S = this.mat2dScale(sx,sy);
    return this.mat2dMultiply(T, this.mat2dMultiply(R,S));
  },
});

export const Math2D = math2D;
export default math2D;

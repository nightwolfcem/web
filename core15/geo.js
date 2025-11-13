'use strict';
import CLASS from './CLASS.js'

/*
 * Tgeo — Genel geometri yardımcıları (2D ağırlıklı, 3D temel).
 * Cem-spec: CLASS merkezli mimari, T-önek, min-serializer önceliği.
 * - Namespace tarzı statik sınıf (örnek oluşturmadan kullanılır)
 * - Vektörler basit dizi olarak temsil edilir: [x, y] / [x, y, z]
 * - Mat2D: { a,b,c,d,tx,ty }  (SVG/Canvas ile uyumlu)
 */

export const Tgeo = CLASS(class Tgeo {

  // ====== Sabitler / Ayarlar ======
  static EPS = 1e-6;
  static PI  = Math.PI;
  static TAU = Math.PI * 2;

  static setEps(v){
    const nv = +v;
    if (Number.isFinite(nv) && nv > 0) this.EPS = Math.max(1e-12, nv);
    return this.EPS;
  }

  // ====== Karşılaştırma yardımcıları (epsilon’lu) ======
  static eq(a,b,eps){ const e = eps ?? this.EPS; return Math.abs(a-b) <= e; }
  static neq(a,b,eps){ return !this.eq(a,b,eps); }
  static lt(a,b,eps){ const e = eps ?? this.EPS; return a < b - e; }
  static gt(a,b,eps){ const e = eps ?? this.EPS; return a > b + e; }
  static le(a,b,eps){ return !this.gt(a,b,eps); }
  static ge(a,b,eps){ return !this.lt(a,b,eps); }
  static approxZero(a,eps){ const e = eps ?? this.EPS; return Math.abs(a) <= e; }

  // ====== Skaler yardımcıları ======
  static clamp(x, min, max){ if (min>max){const t=min;min=max;max=t;} return x<min?min:(x>max?max:x); }
  static lerp(a,b,t){ return a + (b-a)*t; }
  static rad(deg){ return deg * (Math.PI/180); }
  static deg(rad){ return rad * (180/Math.PI); }
  static normAngle(rad){
    let r = rad % this.TAU;
    if (r >=  Math.PI) r -= this.TAU;
    if (r <  -Math.PI) r += this.TAU;
    return r;
  }

  // ====== Vec2 (dizi [x,y]) ======
  static v2(x=0,y=0){ return [x,y]; }
  static add2(a,b){ return [a[0]+b[0], a[1]+b[1]]; }
  static sub2(a,b){ return [a[0]-b[0], a[1]-b[1]]; }
  static scale2(a,s){ return [a[0]*s, a[1]*s]; }
  static dot2(a,b){ return a[0]*b[0] + a[1]*b[1]; }
  static cross2(a,b){ return a[0]*b[1] - a[1]*b[0]; } // z-bileşeni
  static len2(a){ return Math.hypot(a[0], a[1]); }
  static len2Sq(a){ return a[0]*a[0] + a[1]*a[1]; }
  static norm2(a){ const L=this.len2(a); return L>0?[a[0]/L,a[1]/L]:[0,0]; }
  static dist2(a,b){ return Math.hypot(a[0]-b[0], a[1]-b[1]); }
  static dist2Sq(a,b){ const dx=a[0]-b[0], dy=a[1]-b[1]; return dx*dx+dy*dy; }
  static angle2(a){ return Math.atan2(a[1], a[0]); }
  static fromAngle2(rad,len=1){ return [Math.cos(rad)*len, Math.sin(rad)*len]; }
  static perp2(a){ return [-a[1], a[0]]; } // 90° sola

  // ====== Vec3 (dizi [x,y,z]) temel ======
  static v3(x=0,y=0,z=0){ return [x,y,z]; }
  static add3(a,b){ return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
  static sub3(a,b){ return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
  static scale3(a,s){ return [a[0]*s, a[1]*s, a[2]*s]; }
  static dot3(a,b){ return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  static cross3(a,b){
    return [
      a[1]*b[2]-a[2]*b[1],
      a[2]*b[0]-a[0]*b[2],
      a[0]*b[1]-a[1]*b[0]
    ];
  }
  static len3(a){ return Math.hypot(a[0],a[1],a[2]); }
  static norm3(a){ const L=this.len3(a); return L>0?[a[0]/L,a[1]/L,a[2]/L]:[0,0,0]; }

  // ====== Doğrular & Kesim (2D) ======
  // Doğru P = p + t*r  , Q = q + u*s
  // Dönüş: { hit, t, u, point:[x,y] } (sonsuz doğrular için)
  static intersectLines2(p, r, q, s){
    const rxs = this.cross2(r, s);
    const qmp = this.sub2(q, p);
    if (this.approxZero(rxs)) {
      // Paralel (örtüşmeyi ayrıca belirlemiyoruz: sonsuz/boş)
      return { hit:false, parallel:true };
    }
    const t = this.cross2(qmp, s) / rxs;
    const u = this.cross2(qmp, r) / rxs;
    return { hit:true, t, u, point: [p[0]+t*r[0], p[1]+t*r[1]] };
    }

  // Parçalar (seg) için 0<=t<=1 ve 0<=u<=1 koşulu ile
  static intersectSegments2(a0,a1,b0,b1){
    const r = this.sub2(a1,a0);
    const s = this.sub2(b1,b0);
    const res = this.intersectLines2(a0,r,b0,s);
    if (!res.hit) return { hit:false, parallel:res.parallel };
    const {t,u,point} = res;
    if (t>=-this.EPS && t<=1+this.EPS && u>=-this.EPS && u<=1+this.EPS){
      return { hit:true, t, u, point };
    }
    return { hit:false };
  }

  // Noktanın seg[a,b] üzerine izdüşümü
  // Dönüş: { proj:[x,y], t, clamp:boolean }
  static projectPointToSeg2(p,a,b){
    const ab = this.sub2(b,a);
    const ap = this.sub2(p,a);
    const abLenSq = this.len2Sq(ab);
    if (this.approxZero(abLenSq)) return { proj:a.slice(), t:0, clamp:true };
    let t = this.dot2(ap, ab) / abLenSq;
    const clamped = (t<0 || t>1);
    t = this.clamp(t, 0, 1);
    return { proj:[a[0]+ab[0]*t, a[1]+ab[1]*t], t, clamp:clamped };
  }

  // ====== BBox2 ======
  static bbox2FromPoints(pts){
    let minx=+Infinity, miny=+Infinity, maxx=-Infinity, maxy=-Infinity;
    for (const p of pts){ const x=p[0], y=p[1]; if (x<minx)minx=x; if (y<miny)miny=y; if (x>maxx)maxx=x; if (y>maxy)maxy=y; }
    return { min:[minx,miny], max:[maxx,maxy], width:maxx-minx, height:maxy-miny };
  }
  static bbox2Expand(bb, pad){
    const p = Math.abs(+pad)||0;
    return { min:[bb.min[0]-p,bb.min[1]-p], max:[bb.max[0]+p,bb.max[1]+p], width:bb.width+2*p, height:bb.height+2*p };
  }
  static bbox2ContainsPoint(bb, pt){
    return pt[0]>=bb.min[0]-this.EPS && pt[0]<=bb.max[0]+this.EPS &&
           pt[1]>=bb.min[1]-this.EPS && pt[1]<=bb.max[1]+this.EPS;
  }
  static bbox2Intersects(a,b){
    return !(a.max[0] < b.min[0]-this.EPS || a.min[0] > b.max[0]+this.EPS ||
             a.max[1] < b.min[1]-this.EPS || a.min[1] > b.max[1]+this.EPS);
  }

  // ====== Çokgen (2D) ======
  static polyArea2(pts){
    let s=0, n=pts.length;
    for (let i=0;i<n;i++){
      const p=pts[i], q=pts[(i+1)%n];
      s += p[0]*q[1] - p[1]*q[0];
    }
    return 0.5*s;
  }
  static polyCentroid2(pts){
    let A = this.polyArea2(pts);
    if (this.approxZero(A)) {
      // düşey: ortalama nokta
      let cx=0, cy=0; for (const p of pts){ cx+=p[0]; cy+=p[1]; }
      const n=pts.length||1; return [cx/n, cy/n];
    }
    let cx=0, cy=0;
    for (let i=0;i<pts.length;i++){
      const p=pts[i], q=pts[(i+1)%pts.length];
      const cross = p[0]*q[1] - q[0]*p[1];
      cx += (p[0]+q[0])*cross;
      cy += (p[1]+q[1])*cross;
    }
    const k = 1/(6*A);
    return [cx*k, cy*k];
  }
  static polyClockwise2(pts){ return this.polyArea2(pts) < 0; }
  static pointInPoly2(pt, poly){
    // Ray casting
    let inside=false, n=poly.length, x=pt[0], y=pt[1];
    for (let i=0,j=n-1;i<n;j=i++){
      const xi=poly[i][0], yi=poly[i][1];
      const xj=poly[j][0], yj=poly[j][1];
      const intersect = ((yi>y)!=(yj>y)) && (x < (xj - xi)*(y - yi)/(yj - yi + 0.0) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // ====== Dikdörtgen yardımcıları (2D) ======
  static rectFromXYWH(x,y,w,h){ return { x, y, w, h }; }
  static rectContainsPoint(r, p){
    return p[0]>=r.x-this.EPS && p[0]<=r.x+r.w+this.EPS &&
           p[1]>=r.y-this.EPS && p[1]<=r.y+r.h+this.EPS;
  }
  static rectIntersects(a,b){
    return !(a.x+a.w < b.x-this.EPS || b.x+b.w < a.x-this.EPS ||
             a.y+a.h < b.y-this.EPS || b.y+b.h < a.y-this.EPS);
  }

  // ====== Mat2D (a,b,c,d,tx,ty) — Canvas/SVG tipi affine ======
  static mat2dIdentity(){ return { a:1, b:0, c:0, d:1, tx:0, ty:0 }; }
  static mat2d(a=1,b=0,c=0,d=1,tx=0,ty=0){ return { a,b,c,d,tx,ty }; }
  static mat2dMultiply(A,B){
    // A∘B (önce B uygulanır sonra A) — Canvas mantığı
    return {
      a: A.a*B.a + A.c*B.b,
      b: A.b*B.a + A.d*B.b,
      c: A.a*B.c + A.c*B.d,
      d: A.b*B.c + A.d*B.d,
      tx: A.a*B.tx + A.c*B.ty + A.tx,
      ty: A.b*B.tx + A.d*B.ty + A.ty
    };
  }
  static mat2dTranslate(tx,ty){ return { a:1,b:0,c:0,d:1,tx,ty }; }
  static mat2dScale(sx,sy){ return { a:sx,b:0,c:0,d:sy,tx:0,ty:0 }; }
  static mat2dRotate(rad){
    const c=Math.cos(rad), s=Math.sin(rad);
    return { a:c,b:s,c:-s,d:c,tx:0,ty:0 };
  }
  static mat2dInvert(M){
    const det = M.a*M.d - M.b*M.c;
    if (this.approxZero(det)) return null;
    const id = 1/det;
    return {
      a:  M.d*id,
      b: -M.b*id,
      c: -M.c*id,
      d:  M.a*id,
      tx: (M.c*M.ty - M.d*M.tx)*id,
      ty: (M.b*M.tx - M.a*M.ty)*id
    };
  }
  static mat2dApplyToPoint(M, p){
    return [ M.a*p[0] + M.c*p[1] + M.tx,  M.b*p[0] + M.d*p[1] + M.ty ];
  }
  static mat2dCompose({tx=0,ty=0,rot=0,scale:[sx,sy]=[1,1]}={}){
    const T = this.mat2dTranslate(tx,ty);
    const R = this.mat2dRotate(rot);
    const S = this.mat2dScale(sx,sy);
    return this.mat2dMultiply(T, this.mat2dMultiply(R,S));
  }

  // ====== Serializer (min form) ======
  // Statik namespace olduğundan yalnız EPS kaydediyoruz.
  static toMinJSON(){
    return { type:'Tgeo', args:[ this.EPS ] };
  }
  static fromMinJSON(o){
    if (o && Array.isArray(o.args)) this.setEps(o.args[0]);
    return this;
  }

});

export default Tgeo;

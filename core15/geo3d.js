'use strict';
// geo3d.js — Cem-spec unified (deep-clean)
// Tgeo3d.js — 3D geometry types & ops (Cem-spec)

import CLASS from './CLASS.js'

/* ================== Vec3 ================== */
export const Tvec3 = CLASS(class Tvec3 {
  constructor(x=0,y=0,z=0){ this.x=+x||0; this.y=+y||0; this.z=+z||0; }
  clone(){ return new Tvec3(this.x,this.y,this.z); }
  set(x,y,z){ this.x=+x||0; this.y=+y||0; this.z=+z||0; return this; }
  add(v){ this.x+=v.x; this.y+=v.y; this.z+=v.z; return this; }
  sub(v){ this.x-=v.x; this.y-=v.y; this.z-=v.z; return this; }
  mul(s){ this.x*=s; this.y*=s; this.z*=s; return this; }
  div(s){ this.x/=s; this.y/=s; this.z/=s; return this; }
  dot(v){ return this.x*v.x + this.y*v.y + this.z*v.z; }
  cross(v){ const x=this.y*v.z - this.z*v.y, y=this.z*v.x - this.x*v.z, z=this.x*v.y - this.y*v.x; this.x=x; this.y=y; this.z=z; return this; }
  crossed(v){ return new Tvec3(this.y*v.z - this.z*v.y, this.z*v.x - this.x*v.z, this.x*v.y - this.y*v.x); }
  len(){ return Math.hypot(this.x,this.y,this.z); }
  len2(){ return this.x*this.x + this.y*this.y + this.z*this.z; }
  norm(){ const l=this.len()||1; this.x/=l; this.y/=l; this.z/=l; return this; }
  distance(v){ return Math.hypot(this.x-v.x, this.y-v.y, this.z-v.z); }
  lerp(v,t){ this.x=this.x+(v.x-this.x)*t; this.y=this.y+(v.y-this.y)*t; this.z=this.z+(v.z-this.z)*t; return this; }
  equals(v,  eps=1e-6){ return Math.abs(this.x-v.x)<=eps && Math.abs(this.y-v.y)<=eps && Math.abs(this.z-v.z)<=eps; }
  toArray(){ return [this.x,this.y,this.z]; }
  toMinJSON(){ return { $:'v3', d:[this.x,this.y,this.z] }; }
  static from(a){ if (a instanceof Tvec3) return a.clone(); if (Array.isArray(a)) return new Tvec3(a[0],a[1],a[2]); if (a && 'x'in a) return new Tvec3(a.x,a.y,a.z||0); return new Tvec3(a||0,0,0); }
  static zero(){ return new Tvec3(0,0,0); }
});

/* ================== Quaternion ================== */
export const Tquat = CLASS(class Tquat {
  constructor(x=0,y=0,z=0,w=1){ this.x=x; this.y=y; this.z=z; this.w=w; }
  clone(){ return new Tquat(this.x,this.y,this.z,this.w); }
  set(x,y,z,w){ this.x=x; this.y=y; this.z=z; this.w=w; return this; }
  norm(){ const l=Math.hypot(this.x,this.y,this.z,this.w)||1; this.x/=l; this.y/=l; this.z/=l; this.w/=l; return this; }
  mul(q){ const ax=this.x, ay=this.y, az=this.z, aw=this.w;
           const bx=q.x, by=q.y, bz=q.z, bw=q.w;
           this.x = aw*bx + ax*bw + ay*bz - az*by;
           this.y = aw*by - ax*bz + ay*bw + az*bx;
           this.z = aw*bz + ax*by - ay*bx + az*bw;
           this.w = aw*bw - ax*bx - ay*by - az*bz;
           return this; }
  rotated(v){ const qv=new Tquat(v.x,v.y,v.z,0); const inv=this.clone(); inv.x*=-1; inv.y*=-1; inv.z*=-1; return this.clone().mul(qv).mul(inv); }
  toMat4(){ return Tmat4.fromQuat(this); }
  static fromAxisAngle(axis, rad){
    const a = Tvec3.from(axis).norm(); const s=Math.sin(rad/2);
    return new Tquat(a.x*s, a.y*s, a.z*s, Math.cos(rad/2));
  }
  toMinJSON(){ return { $:'q', d:[this.x,this.y,this.z,this.w] }; }
});

/* ================== Mat4 ================== */
export const Tmat4 = CLASS(class Tmat4 {
  constructor(m=null){ this.m = m ? Float32Array.from(m) : Tmat4.identity().m; }
  clone(){ return new Tmat4(this.m); }
  static identity(){ return new Tmat4([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  multiply(b){
    const a=this.m; b=b.m||b;
    const r=new Float32Array(16);
    for(let i=0;i<4;i++){
      for(let j=0;j<4;j++){
        r[i*4+j]=0;
        for(let k=0;k<4;k++) r[i*4+j]+=a[i*4+k]*b[k*4+j];
      }
    }
    this.m=r; return this;
  }
  static multiply(a,b){ return a.clone().multiply(b); }
  transformPoint(v){
    const m=this.m, x=v.x,y=v.y,z=v.z;
    const nx = m[0]*x + m[4]*y + m[8]*z + m[12];
    const ny = m[1]*x + m[5]*y + m[9]*z + m[13];
    const nz = m[2]*x + m[6]*y + m[10]*z + m[14];
    const w  = m[3]*x + m[7]*y + m[11]*z + m[15] || 1;
    return new Tvec3(nx/w, ny/w, nz/w);
  }
  static fromTranslation(x,y,z){ return new Tmat4([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]); }
  static fromScale(sx,sy,sz){ return new Tmat4([sx,0,0,0, 0,sy,0,0, 0,0,sz,0, 0,0,0,1]); }
  static fromQuat(q){
    const x=q.x,y=q.y,z=q.z,w=q.w;
    const x2=x+x, y2=y+y, z2=z+z;
    const xx=x*x2, xy=x*y2, xz=x*z2;
    const yy=y*y2, yz=y*z2, zz=z*z2;
    const wx=w*x2, wy=w*y2, wz=w*z2;
    return new Tmat4([
      1-(yy+zz), xy+wz, xz-wy, 0,
      xy-wz, 1-(xx+zz), yz+wx, 0,
      xz+wy, yz-wx, 1-(xx+yy), 0,
      0,0,0,1
    ]);
  }
  static fromTRS(t, r/*quat*/, s){
    const T = Tmat4.fromTranslation(t.x,t.y,t.z);
    const R = Tmat4.fromQuat(r);
    const S = Tmat4.fromScale(s.x,s.y,s.z);
    return Tmat4.multiply(T, Tmat4.multiply(R,S));
  }
  static lookAt(eye, target, up){
    const z = Tvec3.from(eye).sub(Tvec3.from(target)).norm();
    const x = Tvec3.from(up).crossed(z).norm();
    const y = z.crossed(x).norm();
    return new Tmat4([
      x.x, y.x, z.x, 0,
      x.y, y.y, z.y, 0,
      x.z, y.z, z.z, 0,
      -x.dot(eye), -y.dot(eye), -z.dot(eye), 1
    ]);
  }
  static perspective(fovY, aspect, near, far){
    const f=1/Math.tan(fovY/2); const nf=1/(near-far);
    return new Tmat4([
      f/aspect,0,0,0,
      0,f,0,0,
      0,0,(far+near)*nf,-1,
      0,0,(2*far*near)*nf,0
    ]);
  }
  static orthographic(l,r,b,t,n,f){
    return new Tmat4([
      2/(r-l),0,0,0,
      0,2/(t-b),0,0,
      0,0,-2/(f-n),0,
      -(r+l)/(r-l), -(t+b)/(t-b), -(f+n)/(f-n), 1
    ]);
  }
  toMinJSON(){ return { $:'m4', d:Array.from(this.m) }; }
});

/* ================== Primitives ================== */
export const Tray = CLASS(class Tray {
  constructor(o=Tvec3.zero(), d=new Tvec3(0,0,1)){ this.o=Tvec3.from(o); this.d=Tvec3.from(d).norm(); }
  at(t){ return this.o.clone().add(this.d.clone().mul(t)); }
  toMinJSON(){ return { $:'ray', d:[this.o.toArray(), this.d.toArray()] }; }
});

export const Tplane = CLASS(class Tplane {
  constructor(n=new Tvec3(0,1,0), w=0){ this.n=Tvec3.from(n).norm(); this.w=+w||0; }
  distance(p){ return this.n.x*p.x + this.n.y*p.y + this.n.z*p.z + this.w; }
  toMinJSON(){ return { $:'pl', d:[this.n.toArray(), this.w] }; }
});

export const Tsphere = CLASS(class Tsphere {
  constructor(c=Tvec3.zero(), r=1){ this.c=Tvec3.from(c); this.r=+r||0; }
  toMinJSON(){ return { $:'sp', d:[this.c.toArray(), this.r] }; }
});

export const Taabb = CLASS(class Taabb {
  constructor(min=Tvec3.zero(), max=Tvec3.zero()){ this.min=Tvec3.from(min); this.max=Tvec3.from(max); }
  contains(p){ return p.x>=this.min.x && p.y>=this.min.y && p.z>=this.min.z && p.x<=this.max.x && p.y<=this.max.y && p.z<=this.max.z; }
  expandByPoint(p){ this.min.x=Math.min(this.min.x,p.x); this.min.y=Math.min(this.min.y,p.y); this.min.z=Math.min(self.min.z,p.z);
                    this.max.x=Math.max(this.max.x,p.x); this.max.y=Math.max(this.max.y,p.y); this.max.z=Math.max(this.max.z,p.z); return this; }
  union(b){ return new Taabb(new Tvec3(Math.min(this.min.x,b.min.x), Math.min(this.min.y,b.min.y), Math.min(this.min.z,b.min.z)),
                            new Tvec3(Math.max(this.max.x,b.max.x), Math.max(this.max.y,b.max.y), Math.max(this.max.z,b.max.z))); }
  toMinJSON(){ return { $:'aabb', d:[this.min.toArray(), this.max.toArray()] }; }
});

/* ================== Intersections ================== */
export function rayPlane(ray, plane){
  const denom = plane.n.x*ray.d.x + plane.n.y*ray.d.y + plane.n.z*ray.d.z;
  if (Math.abs(denom) < Tgeo.EPS) return null;
  const t = -(plane.n.x*ray.o.x + plane.n.y*ray.o.y + plane.n.z*ray.o.z + plane.w) / denom;
  if (t < 0) return null;
  return ray.at(t);
}
export function raySphere(ray, sphere){
  const oc = ray.o.clone().sub(sphere.c);
  const b = oc.dot(ray.d);
  const c = oc.dot(oc) - sphere.r*sphere.r;
  const h = b*b - c;
  if (h < 0) return null;
  const t = -b - Math.sqrt(h);
  return t>=0 ? ray.at(t) : null;
}
export function rayTriangle(ray, a,b,c){
  // Möller–Trumbore
  const EPS=1e-8;
  const e1 = Tvec3.from(b).sub(a);
  const e2 = Tvec3.from(c).sub(a);
  const p = Tvec3.from(ray.d).crossed(e2);
  const det = e1.dot(p);
  if (Math.abs(det) < EPS) return null;
  const inv = 1/det;
  const tvec = Tvec3.from(ray.o).sub(a);
  const u = tvec.dot(p)*inv; if (u<0 || u>1) return null;
  const q = tvec.crossed(e1);
  const v = ray.d.dot(q)*inv; if (v<0 || u+v>1) return null;
  const t = e2.dot(q)*inv; if (t<0) return null;
  return ray.at(t);
}
export function aabbIntersects(a,b){
  return (a.min.x<=b.max.x && a.max.x>=b.min.x) &&
         (a.min.y<=b.max.y && a.max.y>=b.min.y) &&
         (a.min.z<=b.max.z && a.max.z>=b.min.z);
}
export function sphereSphere(a,b){ const r=a.r+b.r; return a.c.distance(b.c) <= r; }

export default { Tvec3, Tquat, Tmat4, Tray, Tplane, Tsphere, Taabb, rayPlane, raySphere, rayTriangle, aabbIntersects, sphereSphere };

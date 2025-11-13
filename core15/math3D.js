'use strict';
// math3D — Math benzeri 3D namespace (OBJE). CLASS kullanılmaz.

let EPS = 1e-6;
const PI  = Math.PI;
const TAU = Math.PI * 2;

export const math3D = Object.freeze({
  // ==== Sabitler / Ayarlar ====
  get EPS(){ return EPS; },
  PI, TAU,
  setEps(v){
    const nv = +v;
    if (Number.isFinite(nv) && nv > 0) EPS = Math.max(1e-12, nv);
    return EPS;
  },

  // ==== Vec3 ====
  v3(x=0,y=0,z=0){ return [x,y,z]; },
  add3(a,b){ return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; },
  sub3(a,b){ return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; },
  scale3(a,s){ return [a[0]*s, a[1]*s, a[2]*s]; },
  dot3(a,b){ return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; },
  cross3(a,b){
    return [
      a[1]*b[2]-a[2]*b[1],
      a[2]*b[0]-a[0]*b[2],
      a[0]*b[1]-a[1]*b[0]
    ];
  },
  len3(a){ return Math.hypot(a[0],a[1],a[2]); },
  norm3(a){ const L=this.len3(a); return L>0?[a[0]/L,a[1]/L,a[2]/L]:[0,0,0]; },
  dist3(a,b){ return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]); },

  // ==== Mat4 (Float32Array(16)) ====
  mat4Identity(){
    const M = new Float32Array(16);
    M[0]=1; M[5]=1; M[10]=1; M[15]=1;
    return M;
  },
  mat4Multiply(A,B){
    const M = new Float32Array(16);
    for (let r=0;r<4;r++){
      for (let c=0;c<4;c++){
        let s=0;
        for (let k=0;k<4;k++) s += A[r*4+k]*B[k*4+c];
        M[r*4+c]=s;
      }
    }
    return M;
  },
  mat4Translate(tx,ty,tz){
    const M = this.mat4Identity();
    M[12]=tx; M[13]=ty; M[14]=tz;
    return M;
  },
  mat4Scale(sx,sy,sz){
    const M = this.mat4Identity();
    M[0]=sx; M[5]=sy; M[10]=sz;
    return M;
  },
  mat4RotateX(rad){
    const c=Math.cos(rad), s=Math.sin(rad);
    const M = this.mat4Identity();
    M[5]=c; M[6]=s; M[9]=-s; M[10]=c;
    return M;
  },
  mat4RotateY(rad){
    const c=Math.cos(rad), s=Math.sin(rad);
    const M = this.mat4Identity();
    M[0]=c; M[2]=-s; M[8]=s; M[10]=c;
    return M;
  },
  mat4RotateZ(rad){
    const c=Math.cos(rad), s=Math.sin(rad);
    const M = this.mat4Identity();
    M[0]=c; M[1]=s; M[4]=-s; M[5]=c;
    return M;
  },
  mat4Perspective(fovyRad, aspect, near, far){
    const f = 1/Math.tan(fovyRad/2);
    const M = new Float32Array(16);
    M[0]=f/aspect; M[5]=f; M[11]=-1; M[15]=0;
    if (far!=null && Number.isFinite(far)){
      M[10]=(far+near)/(near-far);
      M[14]=(2*far*near)/(near-far);
    } else {
      M[10]=-1; M[14]=-2*near;
    }
    return M;
  },
  mat4LookAt(eye, center, up=[0,1,0]){
    const f = this.norm3(this.sub3(center, eye));
    const s = this.norm3(this.cross3(f, up));
    const u = this.cross3(s, f);

    const M = this.mat4Identity();
    M[0]=s[0]; M[1]=u[0]; M[2]=-f[0];
    M[4]=s[1]; M[5]=u[1]; M[6]=-f[1];
    M[8]=s[2]; M[9]=u[2]; M[10]=-f[2];
    const T = this.mat4Translate(-eye[0], -eye[1], -eye[2]);
    return this.mat4Multiply(M, T);
  },
  mat4ApplyToPoint(M, p3){
    const x=p3[0], y=p3[1], z=p3[2];
    const nx = M[0]*x + M[4]*y + M[8]*z + M[12];
    const ny = M[1]*x + M[5]*y + M[9]*z + M[13];
    const nz = M[2]*x + M[6]*y + M[10]*z + M[14];
    const nw = M[3]*x + M[7]*y + M[11]*z + M[15] || 1;
    return nw!==0 ? [nx/nw, ny/nw, nz/nw] : [nx,ny,nz];
  },
});

export const Math3D = math3D;
export default math3D;

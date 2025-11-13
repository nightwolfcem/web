/**
 * geo3d.d.ts
 * ---------------------------------------------------------------------------
 * 3D geometri / uzaysal matematik altyapısı.
 *
 * Bu modül:
 *  - Tvec3, Tquat, Tmat4 gibi temel 3B cebir yapılarını sağlar.
 *  - Ray, düzlem, küre, axis-aligned bounding box (AABB) gibi temel
 *    çarpışma primitiflerini tanımlar.
 *  - Işın kesişimleri (rayPlane, raySphere, rayTriangle), AABB ve küre
 *    çarpışma yardımcılarını sunar.
 *
 * geo2d.d.ts ile aynı ruhta yazılmıştır: instance metodları in-place
 * çalışır (this döndürür) ve toMinJSON() ile minified serializer sağlar.
 */

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/** Basit 3B nokta arayüzü. */
export interface TPoint3 {
  x: number;
  y: number;
  z: number;
  [key: string]: any;
}

/**
 * Raycast, kesişim vb. fonksiyonların ortak dönüş tipi.
 * hit=false ise p genelde null olur.
 */
export interface TRayHitResult {
  /** Işın nesneyle çarpıyorsa true. */
  hit: boolean;
  /** Işın parametresi (o + d * t). Geçerli değilse genelde NaN ya da -1. */
  t: number;
  /** Çarpışma noktası. */
  p: Tvec3 | null;
  /** Ek alanlar (normal, baryCoord vb.) algoritmaya göre eklenebilir. */
  [key: string]: any;
}

/* ==========================================================================
 *  Tvec3 : 3D vektör (x,y,z)
 * ========================================================================== */

export class Tvec3 {
  constructor(x?: number, y?: number, z?: number);

  /** X bileşeni. */
  x: number;
  /** Y bileşeni. */
  y: number;
  /** Z bileşeni. */
  z: number;

  /** Kopya üretir. */
  clone(): Tvec3;

  /** x,y,z değerlerini doğrudan yazar. */
  set(x: number, y: number, z: number): this;

  /** Bu vektöre v ekler. */
  add(v: TPoint3): this;
  /** Bu vektörden v çıkarır. */
  sub(v: TPoint3): this;

  /** Skaler çarpım. */
  mul(s: number): this;
  /** Skaler bölme. */
  div(s: number): this;

  /** Dot çarpımı. */
  dot(v: TPoint3): number;
  /** Cross çarpımı; sonucu this'e yazar. */
  cross(v: TPoint3): this;
  /** Cross çarpımı; sonucu yeni Tvec3 olarak döndürür. */
  crossed(v: TPoint3): Tvec3;

  /** Uzunluk. */
  len(): number;
  /** Uzunluğun karesi. */
  len2(): number;

  /** Normalize eder (in-place). */
  norm(): this;

  /** İki vektör arası Öklid mesafe. */
  distance(v: TPoint3): number;

  /** Doğrusal interpolate (in-place). */
  lerp(v: TPoint3, t: number): this;

  /** Bileşen bazında yaklaşık eşitlik testi. */
  equals(v: TPoint3, eps?: number): boolean;

  /** [x, y, z] dizisine çevirir. */
  toArray(): [number, number, number];

  /** Minified JSON temsili. */
  toMinJSON(): { $: 'v3'; d: [number, number, number] };

  /** Farklı tiplerden akıllı oluşturucu. */
  static from(a: any): Tvec3;

  /** (0,0,0) döndürür. */
  static zero(): Tvec3;
}

/* ==========================================================================
 *  Tquat : Unit quaternion (x,y,z,w)
 * ========================================================================== */

export class Tquat {
  constructor(x?: number, y?: number, z?: number, w?: number);

  x: number;
  y: number;
  z: number;
  w: number;

  /** Kopya üret. */
  clone(): Tquat;

  /** Bütün bileşenleri tek seferde ata. */
  set(x: number, y: number, z: number, w: number): this;

  /** (0,0,0,1) yap. */
  identity(): this;

  /** Normalize et (unit quaternion). */
  norm(): this;

  /** Bu quat'ı q ile çarpar (this = this * q). */
  mul(q: Tquat): this;

  /** Bir vektörü bu quat ile döndürür, yeni Tvec3 döndürür. */
  rotated(v: TPoint3): Tvec3;

  /** 4x4 dönüşüm matrisi olarak döndürür. */
  toMat4(): Tmat4;

  /** Minified JSON temsili. */
  toMinJSON(): { $: 'q'; d: [number, number, number, number] };

  /** Axis-angle → quaternion. */
  static fromAxisAngle(axis: TPoint3, rad: number): Tquat;

  /** Euler açıları → quaternion. order varsayılan "XYZ" benzeri olabilir. */
  static fromEuler(rx: number, ry: number, rz: number, order?: string): Tquat;

  /** Minified JSON'dan geri yükleme. */
  static fromMinJSON(o: any): Tquat | null;
}

/* ==========================================================================
 *  Tmat4 : 4x4 affine/transform matrisi
 * ========================================================================== */

export class Tmat4 {
  constructor(m?: number[] | Tmat4 | null);

  /** 16 uzunluklu dizi (row-major veya column-major; runtime ne kullanıyorsa). */
  m: number[];

  /** Kopya üret. */
  clone(): Tmat4;

  /** Tüm bileşenleri/başka matrisi kopyala. */
  set(m: number[] | Tmat4): this;

  /** Birim matrise döner. */
  identity(): this;

  /** Bu matrisi b ile çarpar (in-place). */
  multiply(b: Tmat4): this;

  /** a*b döner, orijinal a/b bozulmaz. */
  static multiply(a: Tmat4, b: Tmat4): Tmat4;

  /** Affine inverse (det yoksa identity). */
  invert(): this;

  /** vektörü (x,y,z) → (x',y',z') dönüştürür (w=1 varsayımıyla). */
  transformPoint(p: TPoint3): Tvec3;

  /** 16 elemanlı diziyi döndürür. */
  toArray(): [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];

  /** Minified JSON temsili. */
  toMinJSON(): { $: 'm4'; d: number[] };

  /** Yeni birim matris. */
  static identity(): Tmat4;

  /** Sadece translasyon matrisi. */
  static fromTranslation(x: number, y: number, z: number): Tmat4;

  /** Sadece scale matrisi. */
  static fromScale(sx: number, sy: number, sz: number): Tmat4;

  /** Quaternion'dan dönüşüm matrisi. */
  static fromQuaternion(q: Tquat): Tmat4;

  /** Pozisyon + rotasyon(+scale) kompozisyonu. */
  static compose(pos: TPoint3, rot: Tquat, scale?: TPoint3): Tmat4;
}

/* ==========================================================================
 *  Tray : Işın (origin + direction [+ t0,t1])
 * ========================================================================== */

export class Tray {
  constructor(origin?: TPoint3, dir?: TPoint3, t0?: number, t1?: number);

  /** Başlangıç noktası. */
  o: Tvec3;
  /** Yön (normalize edilmesi beklenir). */
  d: Tvec3;
  /** Opsiyonel parametre alt sınırı. */
  t0: number;
  /** Opsiyonel parametre üst sınırı. */
  t1: number;

  /** o + d * t hesabı ile yeni nokta döndürür. */
  at(t: number): Tvec3;

  /** Minified JSON temsili. */
  toMinJSON(): {
    $: 'ray';
    d: [ [number, number, number], [number, number, number], number, number ];
  };

  /** Minified JSON'dan geri yükleme. */
  static fromMinJSON(o: any): Tray | null;
}

/* ==========================================================================
 *  Tplane : Düzlem (n·p = w)
 * ========================================================================== */

export class Tplane {
  constructor(n?: TPoint3, w?: number);

  /** Düzlemin normali (normalize edilmiş). */
  n: Tvec3;
  /** Düzlem sabiti. n·p = w formundaki w. */
  w: number;

  /** Noktanın düzleme signed mesafesi. Pozitif/negatif normal yönüne göre. */
  distance(p: TPoint3): number;

  /** Bir noktayı düzleme projekte eder, yeni nokta döndürür. */
  projectPoint(p: TPoint3): Tvec3;

  /** Minified JSON temsili. */
  toMinJSON(): {
    $: 'pl';
    d: [ [number, number, number], number ];
  };

  /** Minified JSON'dan geri yükleme. */
  static fromMinJSON(o: any): Tplane | null;
}

/* ==========================================================================
 *  Tsphere : Küre (center + radius)
 * ========================================================================== */

export class Tsphere {
  constructor(center?: TPoint3, r?: number);

  /** Merkez. */
  c: Tvec3;
  /** Yarıçap. */
  r: number;

  /** Minified JSON temsili. */
  toMinJSON(): {
    $: 's3';
    d: [ [number, number, number], number ];
  };

  /** Minified JSON'dan geri yükleme. */
  static fromMinJSON(o: any): Tsphere | null;
}

/* ==========================================================================
 *  Taabb : Axis-Aligned Bounding Box (min,max)
 * ========================================================================== */

export class Taabb {
  constructor(min?: TPoint3, max?: TPoint3);

  /** En küçük köşe. */
  min: Tvec3;
  /** En büyük köşe. */
  max: Tvec3;

  /** p noktası kutu içinde mi? (sınırlar dahil). */
  contains(p: TPoint3): boolean;

  /** Kutuyu p noktasını da kapsayacak şekilde genişlet. */
  expandByPoint(p: TPoint3): this;

  /** Başka bir AABB ile birleşim hacmini al (this'i büyüt). */
  union(b: Taabb): this;

  /** Minified JSON temsili. */
  toMinJSON(): {
    $: 'aabb';
    d: [ [number, number, number], [number, number, number] ];
  };

  /** Minified JSON'dan geri yükleme. */
  static fromMinJSON(o: any): Taabb | null;
}

/* ==========================================================================
 *  KESİŞİM / ÇARPISMA YARDIMCILARI
 * ========================================================================== */

/** Işın - düzlem kesişimi. */
export function rayPlane(ray: Tray, plane: Tplane): TRayHitResult;

/** Işın - küre kesişimi. */
export function raySphere(ray: Tray, sphere: Tsphere): TRayHitResult;

/** Işın - üçgen kesişimi. a,b,c üçgen köşeleri. */
export function rayTriangle(ray: Tray, a: TPoint3, b: TPoint3, c: TPoint3): TRayHitResult;

/** AABB'ler çakışıyor mu? */
export function aabbIntersects(a: Taabb, b: Taabb): boolean;

/** Küreler çakışıyor mu? */
export function sphereSphere(a: Tsphere, b: Tsphere): boolean;

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

/**
 * Modülün varsayılan export'u sık kullanılan tipleri ve yardımcıları tek
 * obje halinde dışarı verir.
 */
declare const _default: {
  Tvec3: typeof Tvec3;
  Tquat: typeof Tquat;
  Tmat4: typeof Tmat4;
  Tray: typeof Tray;
  Tplane: typeof Tplane;
  Tsphere: typeof Tsphere;
  Taabb: typeof Taabb;
  rayPlane: typeof rayPlane;
  raySphere: typeof raySphere;
  rayTriangle: typeof rayTriangle;
  aabbIntersects: typeof aabbIntersects;
  sphereSphere: typeof sphereSphere;
};

export default _default;

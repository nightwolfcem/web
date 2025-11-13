/**
 * geo2d.d.ts
 * ---------------------------------------------------------------------------
 * 2D geometri + DOM hizalama altyapısı.
 *
 * Bu modül:
 *  - Tvec2 / Tmat3 / Trect / Tcircle / Tsegment gibi temel cebir/geometri
 *    sınıflarını sağlar.
 *  - Koordinat sistemleri (page / client / offset) arasında dikdörtgen
 *    dönüşümleri yapar ve DOM elementinden Trect türetebilir.
 *  - Hizalama çözümleyicisi (parseAlignSpec / TelementRect.alignTo) ile
 *    herhangi bir elementi başka bir hedefe göre (sol, sağ, orta, inner,
 *    outer vb.) konumlandırır ve style.left/top/width/height uygular.
 *  - TelementRect.bind() ile bir HTMLElement'e canlı (reaktif) rect proxy'si
 *    takar: el.rect.left = 100 dediğinde otomatik commit() olur.
 *  - 2D pose (Tpose2d) → CSS matrix(...) üretip el.style.transform'a uygular.
 *  - Ek olarak saf helper fonksiyonlar: convexHull, centroid, segmentIntersect,
 *    rotatedRectAABB, snapToGrid vb.
 *
 * Bu d.ts bütün dışa açık API'yi ve runtime davranış sözleşmesini tarif eder.
 */

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/** Basit 2D nokta arayüzü. */
export interface TPoint {
  x: number;
  y: number;
  [key: string]: any;
}

/** Basit genişlik/yükseklik dikdörtgen arayüzü (x,y,w,h). */
export interface TRectXYWH {
  x: number;
  y: number;
  w: number;
  h: number;
  [key: string]: any;
}

/** Sayfa uzayı dikdörtgen arayüzü (left,top,width,height). */
export interface TRectLTRB {
  left: number;
  top: number;
  width: number;
  height: number;
  [key: string]: any;
}

/**
 * Hizalama çözümlemesinin çıktısı. parseAlignSpec() ve computeAlignedXY()
 * buna denk bir yapı döndürür.
 */
export interface TAlignTokens {
  /** Yatay hizalama: 'left' | 'right' | 'center'. */
  hx: 'left' | 'right' | 'center';
  /** Dikey hizalama: 'top' | 'bottom' | 'middle'. */
  vy: 'top' | 'bottom' | 'middle';
  /** true → içe yerleş (inner) / false → dışa yerleş (outer). */
  inner: boolean;
  /** Hammadde flag seti ('left','bottom','outer',...). */
  flags: Set<string>;
  /** Serbest extra alan. */
  [key: string]: any;
}

/** Koordinat sistemi anahtarları. */
export type TCoordSpace = 'page' | 'client' | 'viewport' | 'offset';

/* ==========================================================================
 *  Tvec2 : 2D vektör (x,y)
 * ========================================================================== */

export class Tvec2 {
  constructor(x?: number, y?: number);

  /** X bileşeni. */
  x: number;
  /** Y bileşeni. */
  y: number;

  /** Kendi kopyasını döndürür. */
  clone(): Tvec2;

  /** x,y değerlerini doğrudan yazar. */
  set(x: number, y: number): this;

  /** Bu vektöre v ekler. */
  add(v: TPoint): this;
  /** Bu vektörden v çıkarır. */
  sub(v: TPoint): this;

  /** Skaler çarpım. */
  mul(s: number): this;
  /** Skaler bölme. */
  div(s: number): this;

  /** Dot çarpımı. */
  dot(v: TPoint): number;
  /** 2D cross (z bileşeni). */
  cross(v: TPoint): number;

  /** Uzunluk. */
  len(): number;
  /** Uzunluğun karesi. */
  len2(): number;

  /** Normalize eder (in-place). */
  norm(): this;

  /** İki vektör arası Öklid mesafe. */
  distance(v: TPoint): number;

  /** Radyan cinsinden global açı (atan2). */
  angle(): number;

  /** Belirtilen radyan kadar döndürür, opsiyonel origin etrafında. */
  rotate(rad: number, origin?: TPoint | null): this;

  /** Doğrusal interpolate (in-place). */
  lerp(v: TPoint, t: number): this;

  /** Bileşen bazında yaklaşık eşitlik testi. */
  equals(v: TPoint, eps?: number): boolean;

  /** [x, y] dizisine çevirir. */
  toArray(): [number, number];

  /** Minified JSON temsili. */
  toMinJSON(): { $: 'v2'; d: [number, number] };

  /** Farklı tiplerden akıllı oluşturucu. */
  static from(a: any): Tvec2;

  /** (0,0) döndürür. */
  static zero(): Tvec2;
}

/* ==========================================================================
 *  Tmat3 : 2D affine matris (2x3 / matrix(a,b,c,d,tx,ty))
 * ========================================================================== */

export class Tmat3 {
  constructor(
    a?: number,
    b?: number,
    c?: number,
    d?: number,
    tx?: number,
    ty?: number
  );

  /** a c tx / b d ty / 0 0 1 */
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;

  /** Kopya üret. */
  clone(): Tmat3;

  /** Tüm bileşenleri tek seferde ata. */
  set(a: number, b: number, c: number, d: number, tx: number, ty: number): this;

  /** Birim matrise döner. */
  identity(): this;

  /** Bu matrisi m ile sağdan çarpar (in-place). */
  multiply(m: Tmat3): this;

  /** a*b döner, orijinal a/b bozulmaz. */
  static multiply(a: Tmat3, b: Tmat3): Tmat3;

  /** Affine inverse (det yoksa identity). */
  invert(): this;

  /** vektörü (x,y) → (x',y') dönüştürür. */
  transformPoint(p: TPoint): Tvec2;

  /** [a,b,c,d,tx,ty] döndürür. */
  toArray(): [number, number, number, number, number, number];

  /** Minified JSON temsili. */
  toMinJSON(): { $: 'm3'; d: [number, number, number, number, number, number] };

  /** Yeni birim matris. */
  static identity(): Tmat3;

  /** Sadece translasyon matrisi. */
  static fromTranslation(x: number, y: number): Tmat3;

  /** Sadece scale matrisi. */
  static fromScale(sx: number, sy: number): Tmat3;

  /** Sadece rotasyon matrisi. */
  static fromRotation(rad: number): Tmat3;
}

/** Tmat3 alias'ı. */
export { Tmat3 as Tmat2d };

/* ==========================================================================
 *  Trect / Tcircle / Tsegment
 * ========================================================================== */

/**
 * left/top/width/height temelli dikdörtgen.
 * Özellikler hem getter/setter olarak hem de alias (x,y,w,h,right,bottom)
 * üstünden erişilebilir.
 */
export class Trect {
  constructor(left?: number, top?: number, width?: number, height?: number);

  /** Dahili değerler. Bunlar genelde doğrudan elle yazılmaz. */
  protected _left: number;
  protected _top: number;
  protected _width: number;
  protected _height: number;

  /** Sol kenar (px). */
  left: number;
  /** Üst kenar (px). */
  top: number;
  /** Genişlik (px). */
  width: number;
  /** Yükseklik (px). */
  height: number;

  /** left alias'ı. */
  x: number;
  /** top alias'ı. */
  y: number;
  /** width alias'ı. */
  w: number;
  /** height alias'ı. */
  h: number;

  /** left+width alias'ı. set edildiğinde left'i günceller. */
  right: number;
  /** top+height alias'ı. set edildiğinde top'u günceller. */
  bottom: number;

  /** Kopya üretir. */
  clone(): Trect;

  /** Rect'i (dx,dy) kadar taşır. */
  moveBy(dx?: number, dy?: number): this;

  /** Rect'in boyutunu (dw,dh) kadar değiştirir. Negatif durumda 0 altına düşmez. */
  sizeBy(dw?: number, dh?: number): this;

  /** Parçalı patch uygular fakat commit() çağırmaz. */
  set(patch: Partial<TrectLTRB & { x: number; y: number; w: number; h: number; right: number; bottom: number }>): this;

  /** set()+commit() kısayolu. */
  assign(patch: Partial<TrectLTRB & { x: number; y: number; w: number; h: number; right: number; bottom: number }>): this;

  /** Varsayılan olarak noop; TelementRect bunu override edip DOM'a yazar. */
  commit(): this;

  /**
   * Bir rect'i Proxy ile wrap eder. Proxy üzerinden left/top/... yazınca
   * otomatik commit() çağrılır ve onChange hook'u (varsa) tetiklenir.
   */
  static proxy(rect: Trect, onChange?: ((r: Trect) => void) | null): Trect;

  /** p noktası rect içinde mi? */
  containsPoint(p: TPoint): boolean;

  /** Merkez nokta. */
  center(): Tvec2;

  /** Dört tarafından (dx,dy) kadar genişlet. */
  inflate(dx: number, dy: number): this;

  /** Kesişim (A∩B). Ortak alan yoksa null. */
  intersect(r: Trect | TRectLTRB): Trect | null;

  /** Birleşim (A∪B). */
  union(r: Trect | TRectLTRB): Trect;

  /** [left,top,width,height] dizisi. */
  toArray(): [number, number, number, number];

  /** Minified JSON temsili. */
  toMinJSON(): { $: 'r'; d: [number, number, number, number] };

  /** Çeşitli girdilerden Trect üretir (HTMLElement, plain object, başka Trect...). */
  static from(v: any): Trect;
}

/** Basit daire. */
export class Tcircle {
  constructor(cx?: number, cy?: number, r?: number);

  cx: number;
  cy: number;
  r: number;

  clone(): Tcircle;

  /** Nokta dairenin içinde mi? */
  containsPoint(p: TPoint): boolean;

  /** Minified JSON temsili. */
  toMinJSON(): { $: 'c'; d: [number, number, number] };
}

/** İki nokta arasındaki doğru parçası. */
export class Tsegment {
  constructor(p0?: TPoint, p1?: TPoint);

  /** Başlangıç noktası. */
  p0: Tvec2;
  /** Bitiş noktası. */
  p1: Tvec2;

  /** Uzunluk. */
  length(): number;

  /** Verilen p noktasına en yakın noktayı döndürür. */
  closestPoint(p: TPoint): Tvec2;

  /** p noktasına olan mesafe. */
  distanceToPoint(p: TPoint): number;

  /** Başka bir segment ile kesişiyor mu? (kapalı aralık) */
  intersects(other: Tsegment): boolean;

  /** Minified JSON temsili. */
  toMinJSON(): { $: 's2'; d: [[number, number], [number, number]] };
}

/* ==========================================================================
 *  KOORDINAT SISTEMLERI ve RECT UTIL'leri
 * ========================================================================== */

/** Koordinat sistemi sabitleri. */
export const Ecs: Readonly<{
  page: 'page';
  client: 'client';
  viewport: 'client';
  offset: 'offset';
}>;

/** Bir HTMLElement'in sayfa uzayındaki rect'ini döndürür. */
export function rectOfEl(el: Element | any): Trect;

/**
 * Bir HTMLElement'in belirtilen koordinat sistemindeki rect'ini verir.
 * cs='page' → scroll offset eklenmiş global konum.
 * cs='client' → viewport konumu (getBoundingClientRect())
 * cs='offset' → offsetParent bazlı konum.
 */
export function rectInSpace(el: Element | any, cs?: TCoordSpace): Trect;

/**
 * Bir rect'i koordinat sistemleri arasında çevirir.
 * from → mevcut sistem, to → hedef sistem.
 * El verilirse offset hesaplarında referans alınır.
 */
export function convertRect(
  src: Trect | TRectLTRB | null | undefined,
  from?: TCoordSpace,
  to?: TCoordSpace,
  el?: HTMLElement | null
): Trect;

/* ==========================================================================
 *  HIZALAMA / KONUM LANDING
 * ========================================================================== */

/**
 * Kullanıcı hizalama ifadesini ('left top', 'bottom-right outer', Ealign mask
 * vb.) parse edip normalize eder. Çıktı TAlignTokens yapısına indirgenir.
 */
export function parseAlignSpec(spec: any): TAlignTokens;

/* ==========================================================================
 *  TelementRect : DOM-backed rect
 * ========================================================================== */

/**
 * TelementRect, Trect'i genişletir ve doğrudan gerçek DOM elementini sürer.
 *
 * - refresh() → elementten (getBoundingClientRect vs.) tekrar oku.
 * - commit()  → internal _left/_top/... değerlerini alıp element.style'a
 *               (left/top/width/height + position) uygular.
 * - alignTo() → başka bir hedefe göre hizala (iç/dış, sol/sağ/orta vb.) ve
 *               istenirse hemen commit() et.
 *
 * Ayrıca bind()/ensure() bir HTMLElement'e .rect getter'ı enjekte eder:
 *   const r = el.rect; r.left += 10;   // otomatik commit()
 */
export class TelementRect extends Trect {
  constructor(el: any, owner?: any);

  /** Bu rect'in asıl DOM elemanı. */
  protected _el: any;

  /** Sahibim (owner), fallback olarak _el. */
  protected _owner: any;

  /** owner getter/setter. */
  get owner(): any;
  set owner(v: any);

  /**
   * DOM'u tekrar oku ve kendi dahili _left/_top/_width/_height'ı güncelle.
   * cs='page' varsayılan.
   */
  refresh(cs?: TCoordSpace): this;

  /**
   * Dahili koordinatları DOM stiline uygula.
   * position:absolute / fixed kararını elementin computedStyle'ına göre verir.
   * cssSpace varsayılan olarak 'offset'tir (offsetParent göreli konum).
   */
  commit(cssSpace?: TCoordSpace): this;

  /**
   * Bu rect'i dst'ye göre hizala.
   * spec → 'left top', 'bottom right outer', owner.align vb.
   * ox/oy → konum ofsetleri (number veya {left,right,top,bottom}).
   * apply=true → hizalama sonrası commit() hemen çalışsın.
   */
  alignTo(
    dst: any,
    spec?: any,
    ox?: number | Record<string, number>,
    oy?: number | Record<string, number>,
    apply?: boolean
  ): this;

  /** alignTo alias'ı. */
  toAlign(
    dst: any,
    spec?: any,
    ox?: number | Record<string, number>,
    oy?: number | Record<string, number>,
    apply?: boolean
  ): this;

  /**
   * Statik hizalama hesaplayıcısı (DOM'a yazmaz).
   * Dönen değer page-space left/top/width/height içerir.
   */
  static alignTo(
    srcEl: any,
    dst: any,
    spec?: any,
    ox?: number | Record<string, number>,
    oy?: number | Record<string, number>
  ): { left: number; top: number; width: number; height: number };

  /** Bir rect patch'ini doğrudan sayfa koordinatlarında uygular. */
  static applyPageRect(el: any, r: { left: number; top: number; width: number; height: number }): void;

  /**
   * HTMLElement'e .rect getter/setter enjekte eder ve proxy döndürür.
   * proxy.left = ... dediğinde otomatik commit() olur.
   */
  static bind(
    el: any,
    opts?: { refresh?: boolean; owner?: any }
  ): Trect | null;

  /**
   * Varsa mevcut proxy'yi döndürür, yoksa bind() çağırır.
   */
  static ensure(el: any): Trect | null | undefined;

  /**
   * Daha önce bind() edilmiş rect proxy'sini bu elemandan söker.
   */
  static unbind(el: any): void;

  /** Trect.proxy kısayolu. */
  static proxy(rect: Trect): Trect;
}

/* ==========================================================================
 *  Tpose2d : (x,y,rot,sx,sy,ox,oy) → CSS transform matrix
 * ========================================================================== */

export class Tpose2d {
  constructor(
    x?: number,
    y?: number,
    rot?: number,
    sx?: number,
    sy?: number,
    ox?: number,
    oy?: number
  );

  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  ox: number;
  oy: number;

  /** Parçalı patch uygular (in-place). */
  set(p: Partial<Record<'x' | 'y' | 'rot' | 'sx' | 'sy' | 'ox' | 'oy', number>>): this;

  /** set()+commit() kısayolu. */
  assign(p: Partial<Record<'x' | 'y' | 'rot' | 'sx' | 'sy' | 'ox' | 'oy', number>>): this;

  /** Varsayılan commit: no-op. (Harici subclass'lar override edebilir.) */
  commit(): this;

  /** [a,b,c,d,e,f] affine matrisini döndürür. */
  toMatrix3(): [number, number, number, number, number, number];

  /** CSS matrix(a,b,c,d,e,f) string'i. */
  toCSSTransform(): string;

  /**
   * Verilen HTMLElement'in style.transform'ına bu pozu uygular.
   * (matrix(...))
   */
  applyTo(el?: HTMLElement | null): this;

  /** Minified JSON temsili. */
  toMinJSON(): {
    $: 'pose2';
    d: [number, number, number, number, number, number, number];
  };

  /** Minified JSON'dan geri yükleme. Uyumlu değilse null. */
  static fromMinJSON(o: any): Tpose2d | null;
}

/* ==========================================================================
 *  SAF GEOMETRI / YARDIMCI FONKSIYONLAR
 * ========================================================================== */

/** Çokgen alanı (shoelace). Pozitif saat yönü tersi. */
export function polygonArea(pts: TPoint[]): number;

/** Çokgen saat yönünde mi? */
export function isClockwise(pts: TPoint[]): boolean;

/** Noktaların kütle merkezini döndürür. */
export function centroid(pts: TPoint[]): Tvec2;

/** Noktaların dışbükey kovanını (convex hull) döndürür. */
export function convexHull(points: TPoint[]): Tvec2[];

/**
 * Bir elementi dst'ye göre hizalar ve (apply=true) ise style.left/top/... yazar.
 * Dönen değer page-space rect bilgisidir.
 */
export function alignElTo(
  el: any,
  dst: any,
  spec?: any,
  ox?: number | Record<string, number>,
  oy?: number | Record<string, number>,
  apply?: boolean
): { left: number; top: number; width: number; height: number };

/* ==========================================================================
 *  CEM-SPEC APPEND HELPER'LAR (nokta/rect hesapları, çarpışma vb.)
 * ========================================================================== */

/** v a..b arasında mı? */
export const within: (v: number, a: number, b: number) => boolean;

/** Basit nokta objesi. */
export function point(x?: number, y?: number): TPoint;

/** Verilen objeden {x,y} çıkar. */
export function pointOf(p: TPoint): TPoint;

/** İki nokta tam eşit mi? (katı karşılaştırma) */
export function pointEqual(a: TPoint | null | undefined, b: TPoint | null | undefined): boolean;

/** Basit rect objesi {x,y,w,h}. */
export function rect(x?: number, y?: number, w?: number, h?: number): TRectXYWH;

/** Var olan rect'ten kopya {x,y,w,h}. */
export function rectOf(r: TRectXYWH): TRectXYWH;

/** İki rect tam eşit mi? */
export function rectEqual(a: TRectXYWH | null | undefined, b: TRectXYWH | null | undefined): boolean;

/** Negatif w/h'yi normalize eder → sol/üst küçük olacak şekilde. */
export function rectNormalize(r: TRectXYWH): TRectXYWH;

/** Nokta r içinde mi? */
export function rectContainsPoint(r: TRectXYWH, p: TPoint): boolean;

/** AABB kesişiyor mu? */
export function rectIntersects(a: TRectXYWH, b: TRectXYWH): boolean;

/** A ∪ B (en küçük kapsayan dikdörtgen). */
export function rectUnion(a: TRectXYWH, b: TRectXYWH): TRectXYWH;

/** r'yi (dx,dy) kadar taşı. */
export function rectTranslate(r: TRectXYWH, dx?: number, dy?: number): TRectXYWH;

/** r'yi (sx,sy) çarpanı ile ölçekle, pivot (cx,cy). */
export function rectScale(
  r: TRectXYWH,
  sx?: number,
  sy?: number,
  cx?: number,
  cy?: number
): TRectXYWH;

/** r'yi her yönden g piksel büyüt. */
export function rectGrow(r: TRectXYWH, g?: number): TRectXYWH;

/** r'nin merkez noktası. */
export function rectCenter(r: TRectXYWH): TPoint;

/** r'nin sadece boyutu. */
export function rectSize(r: TRectXYWH): { w: number; h: number };

/** İki nokta arası mesafe. */
export function distance(a: TPoint, b: TPoint): number;

/** Adım değerine yuvarlama. */
export function snap(v: number, step?: number): number;

/** Noktayı grid'e snap et. */
export function snapToGrid(p: TPoint, step?: number): TPoint;

/**
 * Ray casting ile nokta poligon içinde mi?
 */
export function pointInPolygon(pt: TPoint, poly: TPoint[]): boolean;

/**
 * İki doğru parçasının kesişim bilgisi.
 * hit=false ise p=null döner.
 */
export function segmentIntersect(
  a1: TPoint,
  a2: TPoint,
  b1: TPoint,
  b2: TPoint
): {
  hit: boolean;
  t: number;
  u: number;
  p: TPoint | null;
};

/** Bir noktayı segmente projeksiyon. */
export function projectPointOnSegment(
  p: TPoint,
  a: TPoint,
  b: TPoint
): {
  p: TPoint;
  t: number;
  dist: number;
};

/** Döndürülmüş dikdörtgenin axis-aligned bbox'unu döndürür. */
export function rotatedRectAABB(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  cx?: number;
  cy?: number;
  rot?: number;
}): TRectXYWH;

/** Bir doğru parçası AABB ile kesişiyor mu? */
export function segmentIntersectsRect(
  a: TPoint,
  b: TPoint,
  r: TRectXYWH
): boolean;

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

/**
 * Modülün varsayılan export'u sık kullanılan tipleri ve yardımcıları tek
 * obje halinde dışarı verir.
 */
declare const _default: {
  Tvec2: typeof Tvec2;
  Tmat3: typeof Tmat3;
  Trect: typeof Trect;
  Tcircle: typeof Tcircle;
  Tsegment: typeof Tsegment;
  TelementRect: typeof TelementRect;
  Tpose2d: typeof Tpose2d;
  Ecs: typeof Ecs;
  rectOfEl: typeof rectOfEl;
  rectInSpace: typeof rectInSpace;
  convertRect: typeof convertRect;
  parseAlignSpec: typeof parseAlignSpec;
  alignElTo: typeof alignElTo;
  polygonArea: typeof polygonArea;
  isClockwise: typeof isClockwise;
  centroid: typeof centroid;
  convexHull: typeof convexHull;
};

export default _default;

/* ==========================================================================
 *  GLOBAL AUGMENTATION (HTMLElement.rect proxy)
 * ========================================================================== */

declare global {
  interface HTMLElement {
    /**
     * TelementRect.bind() sonrası otomatik eklenir.
     * Bu proxy, Trect arabirimine benzer: left/top/width/height yazınca
     * otomatik commit() çağrılır ve el.style.* güncellenir.
     */
    rect: Trect;

    /** İç işaretçiler (debug). */
    __tRect?: TelementRect;
    __tRectProxy?: Trect;

    /** Opsiyonel hizalama presetleri (align / eAlign), alignTo() bunları okur. */
    align?: any;
    eAlign?: any;
  }
}

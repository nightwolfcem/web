/**
 * Tsnap.d.ts
 * ---------------------------------------------------------------------------
 * Snap yöneticisi.
 *
 * İki ana kullanım alanı var: fileciteturn130file2
 *
 * 1. KUTU (rect) SNAP
 *    computeForRect({left,top,width,height},{preview,node}) çağrısı,
 *    verdiğin dikdörtgeni grid / kılavuz çizgileri / diğer öğelerin
 *    kenarlarına hizalar. Geriye hem düzeltilmiş rect hem de hangi hizaların
 *    tetiklendiğini döner.
 *
 *    İstersen preview:true vererek ekranda rehber çizgileri ve geçici
 *    "ghost box" gösterir. Bu overlay .tsnap-overlay diye absolute bir
 *    div olarak root içine eklenir ve show()/hide() ile yönetilir.
 *
 * 2. NOKTA (point) SNAP
 *    register(name,fn,prio) ile "sağlayıcı" (provider) ekleyebilirsin.
 *    compute({x,y},ctx) her provider'ı çağırır ve en iyi sonucu (en yüksek
 *    prio, sonra en kısa mesafe) döndürür:
 *
 *      const snap = snapper.compute({x:123,y:456},{ draggingNode:el });
 *      if (snap) { x = snap.x; y = snap.y; }
 *
 *    useGrid() varsayılan bir grid sağlayıcısı kurar.
 *
 *    applyToPointer(ptr) → ptr.setSnapProviders([...]) çağırarak
 *    TpointerController gibi bir pointer yöneticisine bu provider'ları
 *    aktarır; böylece drag sırasında otomatik snap olur. fileciteturn130file2
 *
 * Ayrıca statik yardımcılar var:
 *   Tsnap.snapPointToGuides()
 *   Tsnap.snapPointToGrid()
 *   Tsnap.snapDrag()  // guides + grid kombo
 */

/* -------------------------------------------------------------------------
 * Yardımcı tipler
 * ---------------------------------------------------------------------- */

/** Dikdörtgen (global koordinatlar, px). */
export interface TsnapRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * computeForRect() sonucundaki hizalama "hit" kaydı.
 * type   : 'v' (dikey çizgiye hizalandın, x ayarlandı)
 *        | 'h' (y ayarlandı)
 * at     : hizalanılan koordinat (px)
 * reason : 'grid' | 'guide' | 'element'
 */
export interface TsnapHit {
  type: 'v' | 'h';
  at: number;
  reason: 'grid' | 'guide' | 'element';
}

/** computeForRect() dönüş tipi. */
export interface TsnapComputeRectResult {
  rect: TsnapRect;
  hits: TsnapHit[];
}

/** Kılavuz (guide) yapılandırması. */
export interface TsnapGuides {
  enabled: boolean;
  /** Düşey hizalama çizgileri (global X koordinatları). */
  v: number[];
  /** Yatay hizalama çizgileri (global Y koordinatları). */
  h: number[];
}

/** Grid yapılandırması. */
export interface TsnapGrid {
  enabled: boolean;
  /** Izgara adımı (px). */
  size: number;
}

/** Diğer elementlere hizalama yapılandırması. */
export interface TsnapElementSnapOpts {
  enabled: boolean;
  /**
   * Hangi DOM node'ları referans alacağız?
   * Varsayılan: "[owner]"
   */
  selector: string;
  /**
   * true ise `.selected` class'lı node'lar kaynak olarak hariç tutulur,
   * böylece kendi seçimini kendine hizalamazsın.
   */
  excludeSelected: boolean;
}

/** Overlay çizim yapılandırması. */
export interface TsnapDrawOpts {
  enabled: boolean;
}

/**
 * Tsnap constructor opsiyonları.
 *
 * root       : overlay'nin ekleneceği kök element. Varsayılan: document.body
 * threshold  : kaç px yakınsa hizalama kabul edilsin (varsayılan ~6px)
 * grid       : ızgara ayarları
 * guides     : sabit rehber çizgileri
 * elements   : sahnedeki diğer element kenarlarına hizalama
 * draw       : hizalama rehberlerini görsel olarak çiz
 */
export interface TsnapOpts {
  threshold?: number;
  grid?: Partial<TsnapGrid>;
  guides?: Partial<Omit<TsnapGuides,'enabled'>> & { enabled?: boolean };
  elements?: Partial<TsnapElementSnapOpts>;
  draw?: Partial<TsnapDrawOpts>;
}

/**
 * Point-snap sağlayıcısının dönüş değeri.
 *
 * x,y   : snaplenmiş koordinat
 * prio  : sağlayıcının önceliği (büyük olan kazanır)
 * dist  : orijinal noktadan kaç px uzaklaştık (fallback karşılaştırma)
 * by    : hangi sağlayıcı kazandı (debug/info amaçlı)
 */
export interface TsnapPointResult {
  x: number;
  y: number;
  prio?: number;
  dist?: number;
  by?: string;
}

/**
 * Sağlayıcı fonksiyon tipi.
 * pt    : {x,y} mevcut koordinat
 * ctx   : drag sırasında ekstra bilgiler (örn. sürüklenen node)
 * Dönüş → {x,y,prio?,dist?,by?} ya da null/undefined (yok say).
 */
export type TsnapProviderFn = (
  pt: { x: number; y: number },
  ctx?: any
) => TsnapPointResult | null | undefined;

/* -------------------------------------------------------------------------
 * Tsnap
 * ---------------------------------------------------------------------- */

/**
 * Tsnap
 * -----
 * - computeForRect()   : dikdörtgeni grid/kılavuz/öğelere kilitle
 * - show()/hide()      : overlay rehber çizgilerini göster/gizle
 * - register()/compute(): nokta snap sağlayıcıları + en iyi sonucu seç
 * - useGrid()          : grid sağlayıcısı ekle
 * - applyToPointer()   : pointer controller'a sağlayıcı listesini tak
 *
 * Ayrıca toMinJSON()/toJSON() ile persist/debug snapshot alabilirsin. fileciteturn130file2
 */
export class Tsnap {
  /** Overlay'nin ekleneceği kök. Varsayılan body. */
  root: Element | null;

  /** Snap toleransı (px). */
  threshold: number;

  /** Grid yapılandırması. */
  grid: TsnapGrid;

  /** Guide çizgileri. */
  guides: TsnapGuides;

  /** Diğer elementlere hizalama opsiyonları. */
  elements: TsnapElementSnapOpts;

  /** Overlay çizim opsiyonları. */
  draw: TsnapDrawOpts;

  /** Overlay kök div (".tsnap-overlay"). */
  overlay: HTMLElement | null;

  /** Aktif çizilmiş rehber/preview elemanları. */
  protected _active: HTMLElement[];

  /** Sağlayıcı listesi (name -> {fn, prio}). */
  protected _providers: Map<string, { fn: TsnapProviderFn; prio: number }>;

  constructor(root: Element, opts?: TsnapOpts);

  /* ----- guide API ---------------------------------------------------- */

  /** Tüm guide çizgilerini temizle. chainable. */
  clearGuides(): this;

  /** guide setini topluca değiştir. chainable. */
  setGuides(g: { v?: number[]; h?: number[] }): this;

  /** Yeni düşey guide ekle. chainable. */
  addV(x: number): this;

  /** Yeni yatay guide ekle. chainable. */
  addH(y: number): this;

  /* ----- rect snap ---------------------------------------------------- */

  /**
   * Dikdörtgeni hizala.
   *
   * @param rect {left,top,width,height} global px koordinatları
   * @param options.preview rehber çizgilerini canlı gösterilsin mi
   * @param options.node   sürüklenen gerçek DOM node'u (kendi kendine hizalama hariç tutulabilir)
   *
   * @returns { rect:{left,top,width,height}, hits:[...] }
   */
  computeForRect(
    rect: TsnapRect,
    options?: { preview?: boolean; node?: Element | null }
  ): TsnapComputeRectResult;

  /**
   * Rehber çizgilerini ve varsa geçici kutuyu overlay içinde çizer.
   * (Genelde computeForRect(...,{preview:true}) otomatik çağırır.)
   */
  show(hits: TsnapHit[], rect?: TsnapRect | null): void;

  /** Overlay'i temizle (çizilmiş tüm çizgileri kaldır). */
  hide(): void;

  /* ----- provider-based point snap ----------------------------------- */

  /**
   * Sağlayıcı kaydet.
   * name  : debug adı
   * fn    : TsnapProviderFn
   * prio  : öncelik (yüksekse daha baskın)
   * chainable.
   */
  register(name: string, fn: TsnapProviderFn, prio?: number): this;

  /** Sağlayıcı kaldır. chainable. */
  unregister(name: string): this;

  /** Tüm sağlayıcıları temizle. chainable. */
  clearProviders(): this;

  /** Sağlayıcı listesini debug için döndür (name/prio). */
  list(): Array<{ name: string; prio: number }>;

  /**
   * Sağlayıcıları çalıştırıp en iyi hizalama noktasını döndür.
   * En iyi = en yüksek prio, eşitse en kısa mesafe.
   * null → snap yok.
   */
  compute(
    pt: { x: number; y: number },
    ctx?: any
  ): (TsnapPointResult & { prio: number; dist: number; by: string }) | null;

  /**
   * Basit grid sağlayıcısı ekle.
   *
   * opts.stepX / stepY    : grid adımı
   * opts.offsetX / offsetY: grid offset'i
   *
   * meta.name  : provider adı ('grid')
   * meta.prio  : öncelik
   * chainable.
   */
  useGrid(
    opts?: { stepX?: number; stepY?: number; offsetX?: number; offsetY?: number },
    meta?: { name?: string; prio?: number }
  ): this;

  /**
   * Kayıtlı sağlayıcı fonksiyonlarını düz dizi olarak döndür.
   * (Pointer controller'a verilecek ham fn[] listesi.)
   */
  asProviders(): TsnapProviderFn[];

  /**
   * Bir pointer controller'a snap provider'larını aktar.
   * Pointer controller'ın setSnapProviders(fnArray) metodunu çağırır.
   * chainable.
   */
  applyToPointer(ptr: { setSnapProviders?: (p: TsnapProviderFn[]) => any }): this;

  /* ----- serialize ---------------------------------------------------- */

  /**
   * Küçük snapshot (persist için):
   * { type:'Tsnap', args:[{ threshold, grid, guides:{v,h}, elements:{...}, draw } ] }
   */
  toMinJSON(): any;

  /**
   * Debug snapshot:
   * { type:'ns:Tsnap', threshold, grid, guides, elements, draw }
   */
  toJSON(): any;

  /* ----- statics ------------------------------------------------------ */

  /** Varsayılan tolerans (px). */
  static get DEFAULT_TOL(): number;

  /** Varsayılan grid ayarları. */
  static get DEFAULT_GRID(): { stepX: number; stepY: number; offsetX: number; offsetY: number };

  /**
   * Sadece guides'a göre (v/h listeleri) {x,y} noktasını hizalar.
   * Eğer en yakın çizgi tol px içindeyse o ekseni snap'ler.
   */
  static snapPointToGuides(
    pos: { x: number; y: number },
    guides: { v?: number[]; h?: number[] },
    tol?: number
  ): { x: number; y: number };

  /**
   * Basit grid'e hizalanmış {x,y} döndürür.
   */
  static snapPointToGrid(
    pos: { x: number; y: number },
    grid?: { stepX?: number; stepY?: number; offsetX?: number; offsetY?: number }
  ): { x: number; y: number };

  /**
   * Hem guides hem grid'i dener ve hangisi "daha yakın" ise onu seçer.
   * (drag sırasında pratik kısayol)
   */
  static snapDrag(
    pos: { x: number; y: number },
    guides: { v?: number[]; h?: number[] },
    opts?: { tol?: number; grid?: { stepX?: number; stepY?: number; offsetX?: number; offsetY?: number } }
  ): { x: number; y: number };
}

/**
 * Varsayılan export runtime'da `{ Tsnap }` şeklindedir. fileciteturn130file2
 */
declare const _default: {
  Tsnap: typeof Tsnap;
};
export default _default;

/**
 * Telement.d.ts
 * ---------------------------------------------------------------------------
 * Görsel/etkileşimli bir UI elemanının temel sınıfı.
 *
 * Bu sınıf DOM üstünde tek bir kök HTMLElement (`this.el`) sahip olur,
 * hareket ettirilebilir / yeniden boyutlandırılabilir / seçilebilir hale
 * getirilebilir ve hem runtime durumunu (status, rect, children, vs.)
 * hem de serialize edilebilir bir temsilini (toMinJSON / toJSON) tutar.
 *
 * Runtime tarafında Telement, Tevents'ten extend edilir; yani
 *   - .on(type, fn)
 *   - .off(type, fn)
 *   - .emit(type, payload)
 * gibi event bus davranışına sahiptir.
 *
 * ÖNEMLİ ALANLAR
 *   - this.el               : gerçek DOM düğümü
 *   - this.status           : EelementStatus.bind(...) ile enjekte edilen,
 *                             hem bitmask hem de convenience boolean alanlar
 *                             (visible, movable, resizable, ...)
 *   - this.rect             : TelementRect.bind(...) ile sağlanan geometry proxy
 *   - this.history          : ThistoryManager benzeri undo/redo yöneticisi
 *   - this.snap             : snap helper (drag/resize hizalama ızgarası vb.)
 *   - this.children[]       : hiyerarşik alt Telement listesi
 *
 * Etkileşimsel Özellikler
 *   - sürükleme (move)
 *   - boyutlandırma (resize, kenarlardan)
 *   - göster/gizle
 *   - ön/arka plana getir (z-order stack by DOM order)
 *   - seçim mantığı (selectOptions)
 *
 * Serialize
 *   - toMinJSON() → { type:'Telement', args:[ tag, {id, attrs, style, status} ] }
 *   - toJSON()    → daha açıklayıcı debug çıktısı
 *
 * Bu .d.ts dosyası Telement.js içeriğine dayanır. fileciteturn9file0
 */

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/**
 * Telement'in hareket / resize state'i için ordinal enum.
 * createOrd('TelementState', 'idle,moving,resizing') çıktısına karşılık gelir.
 *
 *  - 'idle'     : hiçbir aktif drag/resize yok
 *  - 'moving'   : kullanıcı elemanı taşıyor
 *  - 'resizing' : kullanıcı elemanı yeniden boyutlandırıyor
 */
export type TTelementState = 'idle' | 'moving' | 'resizing';

/**
 * Ordinal interface'i. createOrd(...) çıktısı bu shape'tedir:
 *   OelementState.idle === 'idle' vs.
 *   OelementState.list  → ['idle','moving','resizing']
 *   OelementState.indexOf('moving') → sıra index'i
 *   OelementState.at(0) → 'idle'
 */
export interface OelementStateType {
  idle: TTelementState;
  moving: TTelementState;
  resizing: TTelementState;

  /** Tanımlı değerlerin sıralı listesi. */
  readonly list: readonly TTelementState[];

  /** Verilen değerin ordinal index'ini döndürür. Bulunamazsa -1 olabilir. */
  indexOf(v: TTelementState): number;

  /** Verilen index'teki değeri döndürür, yoksa undefined olabilir. */
  at(i: number): TTelementState | undefined;

  [key: string]: any;
}

/**
 * Telement.status alanı için enum/flag yapısı.
 * Bu aslında const.enums.js içindeki EelementStatus.bind(...) sonucudur.
 *
 * status bir bitmask + helper olarak çalışır:
 *   this.status.visible   = true/false;
 *   this.status.movable   = true/false;
 *   this.status.resizable = true/false;
 *   ...
 * Ve sayıya cast edildiğinde kombine flag mask'ını verir.
 *
 * Burada birebir numeric flag değerlerini bilmediğimiz için alanlar `boolean`
 * ile belgelenmiştir. Sayısal temsil (Number(this.status)) runtime'da üretilir.
 */
export interface TTelementStatusBound {
  /** Eleman görünür mü. */            visible: boolean;
  /** Eleman taşınabilir mi. */        movable: boolean;
  /** Eleman yeniden boyutlandırılabilir mi. */ resizable: boolean;
  /** Eleman dock hedefi olabilir mi. */        dockable: boolean;
  /** Eleman drag source olabilir mi. */        draggable: boolean;
  /** Seçilebilir mi. */                        selectable: boolean;

  /** Bitmask numeric temsilini verir (Number(status)). */
  valueOf(): number;
  /** String olarak okunabilir durum döndürür. */ toString(): string;

  [key: string]: any;
}

/**
 * Geometry proxy'si. TelementRect.bind(...) ile this.rect getter'ı üzerinden
 * dönen nesnedir. Konum/boyut bilgisini taşır ve assign() ile geri yazılabilir.
 *
 * Bu proxy normalde owner, refresh gibi metadata da içerir, ama burada sadece
 * en çok kullanılan alanları tipliyoruz.
 */
export interface TTelementRect {
  left: number;
  top: number;
  width: number;
  height: number;

  /** Rect değerlerini topluca güncelle. */
  assign?(v: Partial<TTelementRect>): void;
}

/**
 * Seçim davranışı konfigürasyonu.
 * multiKey(e) → çoklu seçim modunu aktif eden tuş kombinasyonunu belirler.
 * selectClass → seçiliyken elemana eklenecek CSS sınıfı.
 * silent      → seçim değişiminde event yayma / yaymama gibi sessizlik bayrağı.
 */
export interface TTelementSelectOptions {
  multiKey?: (e: any) => boolean;
  selectClass?: string;
  silent?: boolean;
  [key: string]: any;
}

/**
 * Drag davranışı konfigürasyonu.
 * handle    → sadece bu handle üzerinden drag başlasın (null = direkt el).
 * dragClass → drag sırasında elemana eklenecek CSS class.
 */
export interface TTelementDragOptions {
  handle?: any;
  dragClass?: string;
  [key: string]: any;
}

/**
 * Move davranışı konfigürasyonu.
 * bound  → sınırlar içinde mi kalsın.
 * xable  → x ekseninde hareket izni.
 * yable  → y ekseninde hareket izni.
 */
export interface TTelementMoveOptions {
  handle?: any;
  bound?: boolean;
  xable?: boolean;
  yable?: boolean;
  [key: string]: any;
}

/**
 * Resize davranışı konfigürasyonu.
 * pad        → kenardan kaç px içinde click resize olarak sayılacak.
 * minW/minH  → minimum boyut.
 * maxW/maxH  → maksimum boyut.
 * useHelper  → helper handle kullanılsın mı.
 */
export interface TTelementResizeOptions {
  pad?: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  useHelper?: boolean;
  [key: string]: any;
}

/**
 * Drop/hedef davranışı konfigürasyonu.
 * hoverClass → üstüne sürüklenirken eklenecek sınıf.
 * accept     → neyi kabul eder? (custom filter fn / type check vb.)
 */
export interface TTelementDropOptions {
  hoverClass?: string;
  accept?: any;
  [key: string]: any;
}

/**
 * Telement constructor opsiyonları.
 *
 * Not: `...extra` ile gövde içinde toplanan alanlar burada yakalanmıyor;
 * bunlar runtime'da sadece emit('init', { extra }) ile dışarı veriliyor.
 */
export interface TTelementInitOpts {
  /** element id'si → this.el.id */
  id?: string | number | null;

  /** Başlangıçta eklenecek className(ler). string veya string[]. */
  className?: string | string[] | null;

  /** Inline style patch'i (Object.assign(this.el.style, style)). */
  style?: Record<string, any> | null;

  /** this.el.setAttribute(key,val) için attribute sözlüğü. */
  attrs?: Record<string, any> | null;

  /**
   * Declarative dom event map'i:
   * { click: fn, pointerdown: fn, ... }
   * Her fn otomatik olarak this ile bind edilir (fn.call(this,...)).
   */
  events?: Record<string, (...args: any[]) => any> | null;

  /**
   * Başlangıç parent.
   *  - HTMLElement
   *  - {el:HTMLElement} veya { owner:Telement }
   *  - Telement örneği
   * Eğer verilirse constructor sonunda otomatik append yapılır.
   */
  parent?: any;

  /**
   * İlk çocuk listesi. Her eleman
   *  - Telement
   *  - HTMLElement
   *  - {el:HTMLElement}
   * olabilir.
   * Hepsi appendChild ile eklenir.
   */
  children?: any[] | null;

  /** Seçilebilir mi? (status.selectable) */
  selectable?: boolean | null;

  /** Taşınabilir mi? (status.movable) */
  movable?: boolean;

  /** Yeniden boyutlandırılabilir mi? (status.resizable) */
  resizable?: boolean;

  /** Dock hedefi olarak işaretlensin mi? (status.dockable) */
  dockable?: boolean;

  /** Drag source olarak işaretlensin mi? (status.draggable) */
  draggable?: boolean;

  /**
   * Snap helper objesi.
   * Beklenen arayüz genelde { computeForRect(rect,{preview}) → {rect}, hide() }.
   * move/resize sırasında hizalamayı kilitlemek için kullanılır.
   */
  snap?: any;

  /**
   * Özel render fonksiyonu. Dış world bu elemana custom içerik çizmek için
   * bunu sağlayabilir.
   */
  render?: any;

  /**
   * History yöneticisi.
   * ThistoryManager benzeri; en azından .begin(label) / .end(label) gibi
   * batch API'leri kullanılır.
   */
  history?: any;

  /**
   * true → pointer eventlerini harici controller yönetecek,
   * false → Telement kendi pointer handler'larını bağlar (_bindPointer).
   */
  delegatePointer?: boolean;

  /** Seçim ayarları. */
  selectOptions?: TTelementSelectOptions | null;

  /** Drag ayarları. */
  dragOptions?: TTelementDragOptions | null;

  /** Move ayarları. */
  moveOptions?: TTelementMoveOptions | null;

  /** Resize ayarları. */
  resizeOptions?: TTelementResizeOptions | null;

  /** Drop/accept ayarları. */
  dropOptions?: TTelementDropOptions | null;

  [key: string]: any;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

export class Telement /* extends Tevents */ {
  /** Asıl DOM elemanı. */
  el: any;

  /** this.el ile aynı referans (uyumluluk). */
  htmlObject: any;

  /** Parent Telement (varsa). */
  parent: Telement | null | undefined;

  /** Çocuk Telement listesi. appendChild/removeChild ile güncellenir. */
  children: Telement[];

  /**
   * Hizalama bilgisi. Ealign.bind(this,'align',...) ile kurulabilir.
   * (const.enums içindeki Ealign kullanır.)
   */
  align?: any;

  /**
   * Geometri proxy'si. TelementRect.bind(...) sonucudur.
   * get/set ile erişilir:
   *   el.rect.left, el.rect.top, el.rect.width, el.rect.height ...
   * set({left,top,...}) ile toplu yazılabilir.
   */
  rect: TTelementRect;

  /**
   * Etkileşim yeteneklerini (visible/movable/resizable/...) tutan,
   * EelementStatus.bind(...) ile elde edilen bitmask+helper nesnesi.
   */
  status: TTelementStatusBound;

  /**
   * Hangi kenarlardan resize edilebilir?
   * Bu numeric mask Eborder.* bitlerini kullanır
   * (Eborder.left | Eborder.right | ...).
   */
  resizeEdges: number;

  /** Snap davranışı / hizalama grid'i. */
  snap: any;

  /** Opsiyonel özel render fonksiyonu. */
  render: any;

  /** History yöneticisi (ThistoryManager benzeri). */
  history: any;

  /**
   * Seçim davranışı konfigürasyonu.
   * {
   *   multiKey(e){...},
   *   selectClass:'selected',
   *   silent:false
   * }
   */
  selectOptions: TTelementSelectOptions;

  /** Drag davranışı konfigürasyonu. */
  dragOptions: TTelementDragOptions;

  /** Move davranışı konfigürasyonu. */
  moveOptions: TTelementMoveOptions;

  /** Resize davranışı konfigürasyonu. */
  resizeOptions: TTelementResizeOptions;

  /** Drop davranışı konfigürasyonu. */
  dropOptions: TTelementDropOptions;

  /** Pointer kontrolünü dışarıya mı delege ediyoruz? */
  protected _delegatePointer: boolean;

  constructor(tagOrEl?: any, opts?: TTelementInitOpts);

  /* ------------------------------------------------------------------------
   * Z-ORDER / STACKING (DOM SIRASI)
   * --------------------------------------------------------------------- */

  /**
   * Elemanı parent'ın en son child'ı yap ("en öne getir").
   * Başarılıysa true döner.
   */
  bringToFront(): boolean;

  /**
   * Elemanı parent'ın ilk child'ı yap ("en arkaya gönder").
   * Başarılıysa true döner.
   */
  sendToBack(): boolean;

  /**
   * Elemanı verilen kardeşin hemen ÖNCESİNE taşır.
   * Başarılıysa true döner.
   */
  moveBefore(sibling: any): boolean;

  /**
   * Elemanı verilen kardeşin hemen SONRASINA taşır.
   * Başarılıysa true döner.
   */
  moveAfter(sibling: any): boolean;

  /* ------------------------------------------------------------------------
   * POINTER / MOVE / RESIZE ETKİLEŞİMİ
   * --------------------------------------------------------------------- */

  /**
   * Dahili pointer handler'larını kurar.
   *
   * - pointerdown ile move/resize başlatır
   * - pointermove ile konum/boyut günceller
   * - pointerup ile history.begin('element:move') / end(...) gibi batch'ler açar
   *
   * Bu metot normalde constructor içinde otomatik çağrılır
   * (delegatePointer === false ise).
   */
  protected _bindPointer(): void;

  /* ------------------------------------------------------------------------
   * HİYERARŞİ (ÇOCUK / PARENT)
   * --------------------------------------------------------------------- */

  /**
   * Çocuğu bu elemana ekler.
   * - child bir Telement ise DOM'u ve parent ilişkisini günceller
   * - child bir HTMLElement ise doğrudan appendChild yapılır
   *
   * Sonrasında 'child:change' eventi yayılır.
   */
  appendChild(child: any): void;

  /**
   * Çocuğu bu elemandan kaldırır.
   * - child Telement ise children[] ve parent linki güncellenir
   * - child HTMLElement ise DOM'dan removeChild yapılır
   *
   * Sonrasında 'child:change' eventi yayılır.
   */
  removeChild(child: any): void;

  /** Çocuk sayısı değiştiğinde emit edilen yardımcı tetikleyici. */
  protected _afterChildChange(): void;

  /* ------------------------------------------------------------------------
   * YARDIMCI / DURUM API'leri
   * --------------------------------------------------------------------- */

  /** DOM olarak gerçekten sahnede/rendered mı? */
  isRendered(): boolean;

  /** left/top positional style alanlarını px olarak yazar. chainable. */
  setPosition(x: number, y: number): this;

  /** width/height style alanlarını px olarak yazar. chainable. */
  setSize(w: number, h: number): this;

  /** status.visible = true + class sync + 'show' event. chainable. */
  show(): this;

  /** status.visible = false + class sync + 'hide' event. chainable. */
  hide(): this;

  /**
   * DOM event binding helper.
   * handler çağrılırken this = Telement instance olur
   * ve extra args otomatik olarak iletilir.
   *
   * Dönüş değeri remove için saklanabilecek wrapped fn'dir.
   */
  bind(
    type: string,
    handler: (...args: any[]) => any,
    ...extraArgs: any[]
  ): (...args: any[]) => any;

  /** bind() ile alınan wrapped listener'ı kaldırır. */
  unbind(type: string, wrapped: any): void;

  /**
   * Elemanı hedef parent içine mount eder.
   * target:
   *   - Telement
   *   - HTMLElement
   *   - CSS selector string
   *   - null/undefined → document.body
   *
   * opts.before ile referans node verilirse insertBefore yapılır.
   * Aksi halde appendChild yapılır.
   *
   * chainable döner.
   */
  mount(
    target: any,
    opts?: { before?: any | null }
  ): this;

  /** DOM'dan kendini söker. chainable. */
  unmount(): this;

  /** Kısayol: body(parent?) = mount(parent || document.body). */
  body(parent?: any): this;

  /**
   * İçeriği değiştirir.
   *  - string          → innerHTML
   *  - Node            → replaceChildren(node)
   *  - Node[] / mixed  → replaceChildren(...nodes)
   *  - function(el)    → callback'e el verilir, dönüş değeri this değilse o döner
   *
   * content verilmezse this döner (no-op).
   */
  html(content: any): this | any;

  /**
   * status.* booleanlarına göre ilgili CSS class'larını (visible,movable, ...)
   * günceller.
   */
  protected _applyStatusClasses(): void;

  /* ------------------------------------------------------------------------
   * SERIALIZATION
   * --------------------------------------------------------------------- */

  /**
   * Minimal temsil.
   *
   * Dönüş kabaca şudur:
   * {
   *   type: 'Telement' (veya sınıf adı),
   *   args: [
   *     tagNameLower,
   *     {
   *       id,
   *       attrs: { ...attributesExceptIdClassStyle },
   *       style: {
   *         left:  this.el.style.left,
   *         top:   this.el.style.top,
   *         width: this.el.style.width,
   *         height:this.el.style.height
   *       },
   *       status: Number(this.status)
   *     }
   *   ]
   * }
   */
  toMinJSON(): {
    type: string;
    args: [
      string,
      {
        id: any;
        attrs: Record<string, any>;
        style: {
          left: string;
          top: string;
          width: string;
          height: string;
        };
        status: number;
      }
    ];
  };

  /**
   * Daha geniş, debug amaçlı JSON.
   * {
   *   type:        'Telement' veya namespace'li sınıf adı,
   *   id:          this.el.id,
   *   tag:         this.el.tagName,
   *   class:       this.el.className,
   *   status:      Number(this.status),
   *   statusText:  String(this.status),
   *   pos:  { left:this.el.style.left, top:this.el.style.top },
   *   size: { width:this.el.style.width, height:this.el.style.height }
   * }
   */
  toJSON(): {
    type: string;
    id: any;
    tag: any;
    class: string;
    status: number;
    statusText: string;
    pos: {
      left: string;
      top: string;
    };
    size: {
      width: string;
      height: string;
    };
  };

  /**
   * Basit point-in-rect testi.
   * px/py koordinatı bu elemanın rect'i içinde mi?
   * rect bilgisi varsa this.rect'ten (TelementRect proxy'si),
   * yoksa DOM getBoundingClientRect() + offsetParent farkıyla hesaplanır.
   */
  hitTest(px: number, py: number): boolean;
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

/**
 * Runtime dosyasında
 *   export default { Telement, EelementStatus, OelementState }
 * şeklinde export edildiği için default export burada aynı şekle çekildi.
 *
 * Not: EelementStatus enum'u const.enums.js içinde tanımlı (bitmask flag).
 * Burada tekrar tipini açmıyoruz; dışarıya forward edildiğini sadece
 * deklarasyonla belirtiyoruz.
 */
declare const _default: {
  Telement: typeof Telement;
  EelementStatus: any;
  OelementState: OelementStateType;
};

export const OelementState: OelementStateType;
export default _default;

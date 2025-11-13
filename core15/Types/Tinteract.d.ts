/**
 * Tinteract.d.ts
 * ---------------------------------------------------------------------------
 * Seçim + sürükle + yeniden boyutlandır + transfer drag + marquee (rect/circle)
 * kontrolcüsü. Tek merkezden pointer etkileşimini yönetir. fileciteturn13file1
 *
 * Bu sınıf sahnedeki öğeleri seçebilir, taşıyabilir, yeniden boyutlandırabilir,
 * başka konteynıra sürükleyip bırakabilir ve marquee (dikdörtgen veya daire)
 * ile çoklu seçim yapabilir. Seçimi görsel olarak vurgulamak için overlay
 * kutuları, ghost preview, groupBox gibi yardımcı overlay DOM elementleri
 * oluşturur/yeniden kullanır. fileciteturn13file1
 *
 * ThistoryManager ile entegrasyon:
 *  - move/resize/transfer başında history.begin('interact:...')
 *  - bitişte history.end('interact:...')
 * Böylece tek bir drag işlemi tek bir undo kaydı olur. ThistoryManager,
 * `bindInteract(interact)` beklentisinde şunları dinler:
 *   'move:start','move:end','resize:start','resize:end'
 * vb. Tinteract bu event'leri emit eder, dolayısıyla doğrudan uyumludur. fileciteturn13file1
 *
 * Seçim yönetimi:
 *  - this.selection (Tselection)
 *    .list() / .items() ile aktif seçim verilir
 *    .toggle(owner,{multi,range}) ve .set([...]) ile güncellenir
 *    'change' event'i dinlenir; DOM'da 'selected' class'ı güncellenir
 *    groupBox overlay'i buna göre yeniden çizilir. fileciteturn13file1
 */

import type { Tevents } from './Tevents.js';

/* ==========================================================================
 *  YARDIMCI / OPSİYON TİPLERİ
 * ========================================================================== */

/**
 * Çoklu seçim / range seçim / dairesel marquee gibi tuş kombinasyonlarını
 * tarif eder. Varsayılan implementasyon:
 *   multi (Ctrl/Meta)
 *   range (Shift)
 *   circle (Alt)
 *   drag  (Alt veya Ctrl)  → transfer drag başlat
 * Bu fonksiyonlar PointerEvent/MousEvent alır ve boolean döner. fileciteturn13file1
 */
export interface TinteractKeys {
  multi?: (e: any) => boolean;
  range?: (e: any) => boolean;
  circle?: (e: any) => boolean;
  drag?: (e: any) => boolean;
  [key: string]: any;
}

/**
 * Move ayarları.
 * bound   : hareket sınırlandırılsın mı?
 * xable/yable : hangi eksenlerde hareket serbest?
 */
export interface TinteractMoveOpts {
  bound?: boolean;
  xable?: boolean;
  yable?: boolean;
  [key: string]: any;
}

/**
 * Resize ayarları.
 *
 * pad        : kenardan kaç px içinde tıklarsan "resize handle" kabul edilir
 * minW/minH  : minimum boyut
 * maxW/maxH  : maksimum boyut
 * handleMask : hangi kenar/köşelerden resize edilebileceğini bitmask olarak
 *              tarif eder (Eborder.left|Eborder.top ...). fileciteturn13file1
 */
export interface TinteractResizeOpts {
  pad?: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  handleMask?: number;
  [key: string]: any;
}

/**
 * Transfer drag & drop ayarları.
 *
 * mode:
 *   'auto'            → önce move dener, dışarı çıkınca transfer'a geçebilir
 *   'move-only'       → sadece kendi parent içinde hareket
 *   'transfer-only'   → her zaman dış hedefe bırakma
 *
 * handleSelector:
 *   Sadece belirli handle'lardan drag başlatılabilsin ('.drag-handle', ...).
 *
 * outsideToTransfer:
 *   move sırasında parent kutusunun dışına çıkarsan otomatik 'transfer'
 *   moduna geç.
 *
 * targetSelector:
 *   Drop hedefi kabul eden elementleri belirleyen CSS selector
 *   (örn. "[data-drop],.droppable,[dropzone]").
 *
 * accept(group,target,ev):
 *   Bu hedef bu grubu kabul ediyor mu?
 *
 * onDrop(group,target,ev,ctx):
 *   Bırakıldığında gerçek işi yap.
 *
 * activeClass / overClass :
 *   Drag sırasında sürüklenen öğeye ve hedef üzerinde hover'a görsel class
 *   eklemek için kullanılır. fileciteturn13file1
 */
export interface TinteractDragOpts {
  mode?: 'auto' | 'move-only' | 'transfer-only';
  handleSelector?: string;
  outsideToTransfer?: boolean;
  activeClass?: string;
  overClass?: string;
  targetSelector?: string;
  onHover?: (
    group: any[],
    target: HTMLElement | null,
    info: any
  ) => void;
  accept?: (
    group: any[],
    target: HTMLElement | null,
    ev: any
  ) => boolean;
  onDrop?: (
    group: any[],
    target: HTMLElement | null,
    ev: any,
    ctx: { data: any }
  ) => boolean | void;
  getLayer?: (target: HTMLElement | null) => any;
  data?: (group: any[]) => any;
  [key: string]: any;
}

/**
 * Snap/izgara desteği.
 * Eğer verilirse drag/resize sırasında hedef rect'i
 *   snap.computeForRect({left,top,width,height},{preview:true})
 * ile düzeltebilir. Bırakıldığında final pozisyon da bu snap sonucuna göre
 * uygulanır. Ayrıca snap.hide() drag bittiğinde çağrılabilir. fileciteturn13file1
 */
export interface TinteractSnap {
  computeForRect?: (
    rect: { left: number; top: number; width: number; height: number },
    opts?: { preview?: boolean; node?: any }
  ) => { rect: { left: number; top: number; width: number; height: number } };
  hide?: () => void;
  [key: string]: any;
}

/**
 * Kurucu opsiyonları.
 *
 * root :
 *   Etkileşimin gerçekleştiği ana kök DOM node'u.
 *   Verilmezse `.tapp-root` veya `document.body` denenir. fileciteturn13file1
 *
 * overlayMode :
 *   'root'     → overlay root'un local koordinatlarına göre hesaplanır.
 *   'viewport' → overlay viewport koordinatları ile (global page coords).
 *
 * selection :
 *   Tselection. .set(), .toggle(), .list(), .on('change',...) beklenir.
 *   Yoksa yeni bir Tselection({className:'selected'}) yaratılır. fileciteturn13file1
 *
 * keys/move/resize/drag/snap :
 *   Davranış ayarları (yukarıdaki interface'ler).
 *
 * history :
 *   ThistoryManager. Drag başında history.begin('interact:move') gibi,
 *   sonunda history.end('interact:move') çağrılır. Böylece tüm drag tek undo
 *   kaydı olur. fileciteturn13file1
 */
export interface TinteractInitOpts {
  root?: any;
  overlayMode?: 'root' | 'viewport';
  selection?: any;
  keys?: TinteractKeys;
  move?: TinteractMoveOpts;
  resize?: TinteractResizeOpts;
  drag?: TinteractDragOpts;
  snap?: TinteractSnap | null;
  history?: any;
  [key: string]: any;
}

/**
 * İç durum (_S). Aktif drag / marquee bilgisini tutar.
 *
 * mode :
 *   'idle'      → etkileşim yok
 *   'drag'      → aktif sürükleme / marquee var
 *
 * kind :
 *   'move'      → seçimi taşıyoruz
 *   'resize'    → boyutlandırıyoruz
 *   'transfer'  → başka konteynıra bırakılacak drag
 *   'rect'      → dikdörtgen marquee seçimi
 *   'circle'    → dairesel marquee seçimi
 *
 * group :
 *   Aktif işlemde etkilenen öğeler listesi. Her giriş {node,base:{L,T,W,H}}
 *   şeklindedir. base eski konum/boyutu saklar ki undo/ghost çizilebilsin. fileciteturn13file1
 */
export interface TinteractState {
  mode: 'idle' | 'drag';
  kind: null | 'move' | 'resize' | 'transfer' | 'rect' | 'circle';
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  dx: number;
  dy: number;
  edgeMask: number;
  group: Array<{
    node: any;
    base: { L: number; T: number; W: number; H: number };
  }> | null;
  dropT: HTMLElement | null;
  dragData: any;
  [key: string]: any;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

export class Tinteract extends Tevents {
  /** Kök etkileşim alanı (canvas / sahne / editor root). */
  root: HTMLElement | null;

  /** 'root' veya 'viewport'. Overlay koordinat sistemi. */
  overlayMode: 'root' | 'viewport';

  /** Çoklu seçim yöneticisi (Tselection). */
  selection: any;

  /** Tuş kombinasyonu davranışlarını belirleyen fonksiyonlar. */
  keys: TinteractKeys;

  /** Move davranış konfig'i. */
  move: TinteractMoveOpts;

  /** Resize davranış konfig'i. */
  resize: TinteractResizeOpts;

  /** Transfer drag/drop konfig'i. */
  drag: TinteractDragOpts;

  /** Snap/izgara desteği (opsiyonel). */
  snap: TinteractSnap | null;

  /** History yöneticisi (ThistoryManager gibi). */
  history: any;

  /**
   * Overlay container:
   *   - Seçim kutusu (groupBox)
   *   - marquee rect/circle
   *   - drag 'ghost' preview kutusu
   * Bu elemanlar pointerEvents:'none' olacak şekilde tek bir overlay
   * altında tutulur. Eğer root altında zaten bir .tinteract-overlay varsa
   * tekrar kullanılmaya çalışılır, yoksa oluşturulur. Aynı root altında
   * yalnızca bir tane kalacak şekilde dedupe yapılır. fileciteturn13file1
   */
  overlay: HTMLElement | null;

  /** Sürükleme sırasında gösterilen hayalet kutu. */
  ghostEl: HTMLElement | null;

  /** Çoklu seçim bounding box kutusu (resize handle gösterebilir). */
  groupBox: HTMLElement | null;

  /**
   * İç etkileşim state'i.
   * Drag/marquee sırasında koordinatlar, seçilen grup, hover drop target,
   * snap önizleme hedefi vs. burada tutulur. fileciteturn13file1
   */
  protected _S: TinteractState;

  /**
   * Alttaki düşük seviye pointer yöneticisi.
   * Pointer down / drag / move eventlerini normalize eder ve
   * 'tpointer:*' custom event'leri yayar:
   *   'tpointer:tap'
   *   'tpointer:dragstart'
   *   'tpointer:drag'
   *   'tpointer:dragend'
   *   'tpointer:move'
   * Tinteract bunları _onTap/_onDragStart/_onDrag/_onDragEnd/_onMove ile dinler. fileciteturn13file1
   */
  ctrl: any;

  /**
   * Global keydown dinleyicisi (Escape ile iptal).
   * constructor içinde atanır:
   *   this._onKeyDown = (ev)=>{ if(ev.key==='Escape') this._cancelAll('esc') }
   * ve document.addEventListener('keydown',...).
   */
  _onKeyDown?: (ev: KeyboardEvent) => void;

  /** Drag sonunda ghost hedefi için saklanan snap'li pozisyon. */
  protected _moveTarget?: { L: number; T: number; W?: number; H?: number } | null;

  constructor(root?: any, opts?: TinteractInitOpts);

  /** Kaynakları bırak. ctrl.destroy() vs. */
  destroy(): void;

  /* ----------------------------------------------------------------------
   * Etkinlik bağlama / pointer eventleri
   * ------------------------------------------------------------------- */

  /**
   * Dahili: ctrl üstüne 'tpointer:*' listener'ları kurar.
   * public API değil ama tipliyoruz.
   */
  protected _wire(): void;

  /** Dahili: pointer tap → seçim toggle. */
  protected _onTap(ev: any): void;

  /**
   * Dahili: pointer dragstart → hangi mod?
   * - move (taşıma)
   * - resize
   * - transfer (drag&drop)
   * - marquee rect/circle
   *
   * Hit test:
   *   - handle üzerinden başlama
   *   - kenardan başlama (resize edge)
   *   - boş zeminde başlama (marquee)
   *
   * Selection mantığı:
   *    this.selection.toggle(owner,{multi,range}) vb. fileciteturn13file1
   */
  protected _onDragStart(ev: any): void;

  /** Dahili: aktif state'e göre drag hareketi (move/resize/transfer/marquee). */
  protected _onDrag(ev: any): void;

  /**
   * Dahili: drag bitişi.
   * - move: final pozisyonu uygular (gerekirse kopya oluşturur)
   * - resize: yeni width/height/left/top kalıcı olur
   * - transfer: kabul eden hedefe bırak veya geri koy
   * - marquee: çoklu seçim finalize edilir
   *
   * İlgili '...:end' event'leri emit edilir ve history.end(...) çağrılır. fileciteturn13file1
   */
  protected _onDragEnd(ev: any): void;

  /** Dahili: pointer move (future: cursor hints). */
  protected _onMove(ev: any): void;

  /* ----------------------------------------------------------------------
   * Seçim / marquee / overlay yardımcıları
   * ------------------------------------------------------------------- */

  /** Seçimdeki öğeleri döndürür (selection.items() / selection.list()). */
  protected _getSelItems(): any[];

  /**
   * Dahili: marquee başlatır ('rect' veya 'circle').
   * history.begin() çağrılmaz, bu sadece seçim alanı çizimidir.
   * 'select:start' event'i emit edilir.
   */
  protected _beginMarquee(detail: any, kind: 'rect' | 'circle'): void;

  /**
   * Dahili: marquee kutusunu overlay içinde görünür yapar.
   * (hem dikdörtgen hem daire için ayrı .marquee-* elementleri yönetilir)
   */
  protected _showMarquee(
    kind: 'rect' | 'circle',
    sx: number,
    sy: number,
    ex: number,
    ey: number
  ): void;

  /** Dahili: marquee overlay'i gizler. */
  protected _hideMarquee(): void;

  /**
   * Dahili: marquee alanına giren elementleri hesaplar.
   * .selectable / [data-id] / [owner] gibi selector'larla eşleşen node'ları
   * toplar, statüsü selectable/disabled/locked değilse hariç tutar ve
   * Tselection.set([...]) ile günceller. 'select:preview' emit edilir. fileciteturn13file1
   */
  protected _computeMarqueeSelect(
    kind: 'rect' | 'circle',
    sx: number,
    sy: number,
    ex: number,
    ey: number
  ): any[];

  /**
   * Dahili: move başlangıcı.
   * - Seçili grubu kilitler
   * - Her elemanı absolute konuma çeker (left/top/width/height belirler)
   * - Ghost kutusunu gösterir
   * - history.begin('interact:move')
   * - 'move:start' emit edilir
   */
  protected _beginMove(detail: any, primary: any): void;

  /**
   * Dahili: resize başlangıcı.
   * - edgeMask ile hangi kenar/köşe tutuluyor belirlenir (Eborder mask)
   * - history.begin('interact:resize')
   * - 'resize:start' emit edilir
   */
  protected _beginResize(detail: any, primary: any, edgeMask: number): void;

  /**
   * Dahili: transfer drag başlangıcı.
   * - group + ghost oluşturulur
   * - history.begin('interact:transfer')
   * - 'transfer:start' emit edilir
   */
  protected _beginTransfer(detail: any, primary: any): void;

  /**
   * Dahili: move veya transfer sırasında sürüklenen öğelerin birleşik
   * bounding box'unu hesaplar (ghost kutuyu çizmek için). {left,top,width,height}
   */
  protected _ghostBounds(
    group: Array<{ node: any; base: { L: number; T: number; W: number; H: number } }>
  ): { left: number; top: number; width: number; height: number };

  /**
   * Dahili: aktif operasyonu tamamen iptal eder (ESC).
   * - ghost, marquee, hover class temizlenir
   * - state resetlenir
   * - 'cancel' event'i emit edilir
   */
  protected _cancelAll(reason?: string): void;

  /**
   * Dahili: transfer drag sırasında altındaki potansiyel drop hedefini
   * bulur, accept() ile sorar, uygun ise hover class ekler ve
   * 'transfer:enter'/'transfer:leave' event'lerini yayar. fileciteturn13file1
   */
  protected _updateTransferHover(
    x: number,
    y: number,
    ev: any
  ): void;

  /**
   * Dahili: move modundayken parent sınırının dışına çıktıysan otomatik
   * transfer moduna geç (outsideToTransfer). fileciteturn13file1
   */
  protected _maybeMoveToTransfer(e: any): void;

  /**
   * Dahili: selection içindeki öğeleri baz alıp overlay'deki groupBox
   * (kutu çerçevesi) konumunu günceller. groupBox sadece resizable
   * statüsü olan selection varsa görünür. fileciteturn13file1
   */
  protected _updateGroupBox(): void;

  /* ----------------------------------------------------------------------
   * Dış API
   * ------------------------------------------------------------------- */

  /** Dışarıdan yeni bir Tselection enjekte et. chainable. */
  setSelection(sel: any): this;

  /** Seçimi tamamen temizle. chainable. */
  clearSelection(): this;

  /**
   * Bir veya daha fazla öğeyi seçime ekle ve 'change' event'i ateşle.
   * chainable.
   */
  select(...items: any[]): this;

  /**
   * Minimal JSON (serileştirilebilir config). Örn. snapshot için.
   * Dönüş {type:'Tinteract', args:[{ move:{...}, resize:{...}, drag:{...} }]}.
   */
  toMinJSON(): {
    type: string;
    args: any[];
  };

  /**
   * Daha detaylı JSON state'i (debug/inspect amaçlı).
   * { type:'ns:Tinteract', state:{mode,kind}, options:{...} }
   */
  toJSON(): {
    type: string;
    state: { mode: string | null; kind: string | null };
    options: any;
  };
}

/* ==========================================================================
 *  DEFAULT EXPORT (module style)
 * ========================================================================== */

declare const _default: {
  Tinteract: typeof Tinteract;
};

export default _default;

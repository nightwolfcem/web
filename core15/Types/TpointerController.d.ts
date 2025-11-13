/**
 * TpointerController.d.ts
 * ---------------------------------------------------------------------------
 * Düşük seviyeli pointer (mouse / pen / touch) event orkestratörü.
 *
 * Bu controller tek bir root element üzerinde pointerdown/move/up,
 * hover-intent, wheel, ESC ile iptal, çift tık, uzun basma (long-press),
 * sürükle & bırak (dragstart/drag/dragend), snap-to-grid / snap-to-guides,
 * ve window-level pointer takibini (pointer capture) yönetir. fileciteturn127file0
 *
 * Yaydığı yüksek seviyeli event'ler:
 *
 *  - 'tpointer:tap'        : kısa dokunuş / click benzeri
 *    { x,y,xL,yL, originalEvent }
 *
 *  - 'tpointer:dbltap'     : aynı noktaya hızlı çift tap
 *    { x,y, originalEvent }
 *
 *  - 'tpointer:press'      : uzun basma (pressDelay ms)
 *    { x,y, originalEvent }
 *
 *  - 'tpointer:click'      : tarayıcı click sonu benzeri bildirim
 *    { x,y,xL,yL,button,buttons,originalEvent }
 *
 *  - 'tpointer:dragstart'  : dragThreshold piksel eşiğini geçtiğin ilk an
 *    { x0,y0,x,y,rawX?,rawY?,snap?, originalEvent }
 *
 *  - 'tpointer:drag'       : sürükleme devam ederken her hareket
 *    { x0,y0,x,y,rawX?,rawY?,snap?, originalEvent }
 *
 *  - 'tpointer:dragend'    : sürükleme bittiğinde
 *    { x0,y0,x,y,rawX?,rawY?,snap?, originalEvent }
 *
 *  - 'tpointer:cancel'     : ESC ile ya da browser cancel ile kesilince
 *    { x0,y0,x,y, originalEvent }
 *
 *  - 'tpointer:hover'      : hoverIntent ms sonra sabitlenmiş hedef üzerinde
 *    { target,x,y,originalEvent }
 *
 *  - 'tpointer:move'       : pasif hareket (drag başlamadan önce veya hiç drag yoksa)
 *    { x,y, originalEvent }
 *
 *  - 'tpointer:enter' / 'tpointer:leave'
 *    { target,x,y,originalEvent }
 *
 *  - 'tpointer:wheel'      : wheel delta bilgisi
 *    { dx,dy,mode,ctrlKey,altKey,shiftKey,originalEvent }
 *
 * Not:
 *  - local koordinatlar (xL,yL) origin üzerinden hesaplanır (scroll ve
 *    border offset'lerini hesaba katar).
 *  - Snap sistemi aktifse drag payload'ında hem ham konum (rawX/rawY)
 *    hem snap edilmiş konum (x,y) birlikte gelir.
 */

import type { Tevents } from './Tevents.js';

/**
 * Snap sağlayıcısının tekil çıktısı.
 *
 * Snap provider fonksiyonları current pointer noktasını alır
 * ({x,y}) ve "şuraya çek" önerisi döndürebilir:
 *
 *   { x:12, y:100, dist:5, prio:10, by:'grid' }
 *
 * dist  : Bu snap önerisinin ne kadar yakın olduğu (opsiyonel).
 * prio  : Daha yüksek prio daha baskın kabul edilir.
 * by    : 'grid' | 'guides' | 'provider' vb. debugging / UI için etiket.
 */
export interface TpointerSnapProviderResult {
  x: number;
  y: number;
  dist?: number;
  prio?: number;
  by?: string;
}

/**
 * Bir snap provider callback'i.
 *
 * @param p    Pointer konumu (viewport coords): {x,y}
 * @param ctx  { controller } -> aktif TpointerController
 * @returns    null/undefined (snap yok) ya da bir öneri
 */
export type TpointerSnapProvider =
  (p: { x: number; y: number },
   ctx: { controller: TpointerController }) =>
   (TpointerSnapProviderResult | null | undefined);

/**
 * Snap konfigürasyonu.
 *
 * - enabled    : true ise snap denemeleri yapılır
 * - providers  : özel hizalama / guideline çözümleri
 * - grid       : { stepX,stepY,offsetX,offsetY } klasik grid snap
 * - guides     : { v:number[], h:number[] } düşey/yatay referans çizgileri
 * - tol        : guides için tolerans (px)
 *
 * drag sırasında her movement'ta bu kaynaklar sırayla denenir ve
 * en iyi aday seçilir. Payload içindeki {snap:{...}} ile birlikte gelir. fileciteturn127file0
 */
export interface TpointerSnapConfig {
  enabled?: boolean;
  providers?: TpointerSnapProvider[];
  grid?: {
    stepX?: number;
    stepY?: number;
    offsetX?: number;
    offsetY?: number;
  } | null;
  guides?: {
    v?: number[];
    h?: number[];
  } | null;
  tol?: number;
}

/**
 * TpointerController kurucu opsiyonları.
 *
 * dragThreshold          : sürükleme sayılmak için gereken min piksel mesafesi
 * pressDelay             : uzun basma (tpointer:press) tetiklenme süresi (ms)
 * dblTapDelay            : çift tıkın ikinci vuruşu için max süre (ms)
 * tapMaxDelay            : tap kabulü için down→up max süre (ms)
 * tapMaxDistance         : tap kabulü için down konumundan max uzaklık (px)
 * pointerCapture         : pointer capture kullanılsın mı
 * preventDefaultOnMove   : hareket sırasında preventDefault yap
 * preventDefaultOnDrag   : drag sırasında preventDefault yap
 * hoverIntent            : hover event'i yayınlamak için bekleme süresi (ms)
 * hoverLeaveDelay        : leave event'ini geciktirme süresi (ms)
 * allowRightClickDrag    : sağ tıkla sürüklemeye izin ver
 * windowMove             : true ise move/up dinleyicileri window'a bind edilir
 * origin                 : local koordinat referansı (xL,yL hesapları)
 * snap                   : snap konfigürasyonu (bkz. TpointerSnapConfig)
 */
export interface TpointerControllerOpts {
  dragThreshold?: number;
  pressDelay?: number;
  dblTapDelay?: number;
  tapMaxDelay?: number;
  tapMaxDistance?: number;
  pointerCapture?: boolean;
  preventDefaultOnMove?: boolean;
  preventDefaultOnDrag?: boolean;
  hoverIntent?: number;
  hoverLeaveDelay?: number;
  allowRightClickDrag?: boolean;
  windowMove?: boolean;
  origin?: Element | null;
  snap?: TpointerSnapConfig | null;
}

/**
 * tpointer:* event payload şablonları.
 * Bunlar union halinde tutulmaz ama referans olarak faydalı.
 */
export interface TpointerTapPayload {
  x: number;
  y: number;
  /** origin'e göre lokal X */
  xL: number;
  /** origin'e göre lokal Y */
  yL: number;
  originalEvent: PointerEvent;
}
export interface TpointerDblTapPayload {
  x: number;
  y: number;
  originalEvent: PointerEvent;
}
export interface TpointerPressPayload {
  x: number;
  y: number;
  originalEvent: PointerEvent;
}
export interface TpointerClickPayload {
  x: number;
  y: number;
  xL: number;
  yL: number;
  /** MouseEvent.button eşleniği */
  button: number;
  /** MouseEvent.buttons eşleniği */
  buttons: number;
  originalEvent: PointerEvent;
}
export interface TpointerDragPayload {
  /** drag başlangıç noktası (viewport coords) */
  x0: number;
  y0: number;
  /** aktif snap edilmiş konum */
  x: number;
  y: number;
  /** snap öncesi ham konum (varsa) */
  rawX?: number;
  rawY?: number;
  /** snap tavsiyesi (grid/guides/provider) */
  snap?: TpointerSnapProviderResult;
  originalEvent: PointerEvent;
}
export interface TpointerCancelPayload {
  x0: number;
  y0: number;
  x: number;
  y: number;
  /** ESC iptalinde KeyboardEvent olabilir */
  originalEvent: Event;
}
export interface TpointerMovePayload {
  x: number;
  y: number;
  originalEvent: PointerEvent;
}
export interface TpointerHoverPayload {
  target: EventTarget | null;
  x: number;
  y: number;
  originalEvent: PointerEvent;
}
export interface TpointerEnterLeavePayload {
  target: EventTarget | null;
  x: number;
  y: number;
  originalEvent: PointerEvent;
}
export interface TpointerWheelPayload {
  dx: number;
  dy: number;
  mode: number;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  originalEvent: WheelEvent;
}

/**
 * TpointerController
 * ------------------
 * Tek root üzerinden tüm pointer lifecycle'ını yönetir.
 *
 * Kullanım:
 *   const pc = new TpointerController(canvasEl, {
 *     dragThreshold: 4,
 *     pressDelay: 450,
 *     hoverIntent: 120,
 *     snap: {
 *       enabled: true,
 *       providers: [
 *         (p,{controller}) => ({ x:Math.round(p.x/10)*10, y:Math.round(p.y/10)*10, by:'grid', prio:0 })
 *       ],
 *       grid: { stepX:10, stepY:10 },
 *       tol: 6
 *     }
 *   });
 *
 *   pc.on('tpointer:drag', ({x0,y0,x,y,snap}) => {
 *     // objeyi (x0,y0) -> (x,y) kadar taşı
 *   });
 *
 *   pc.on('tpointer:dbltap', ({x,y}) => {
 *     // zoom in vb.
 *   });
 *
 * Event iptali:
 *  - ESC'e basınca tüm aktif drag'ler 'tpointer:cancel' ile bitirilir.
 *  - allowRightClickDrag=false ise sağ click drag başlatmaz.
 */
export class TpointerController extends (Tevents as { new(...args:any[]): any }) {
  /** Dinlediği kök element. */
  root: Element | Document | null;

  /** Lokal koordinat için baz alınan element (scroll offset vs. için). */
  origin: Element | null;

  /** Çalışma ayarları (constructor'dan gelenler normalize edilmiş). */
  opts: Required<Omit<TpointerControllerOpts, 'origin'|'snap'>>;

  /**
   * Snap konfigürasyonu (constructor'da normalize edilmiş hali).
   * { enabled:boolean, providers:Function[], grid?, guides?, tol:number }
   */
  snap: {
    enabled: boolean;
    providers: TpointerSnapProvider[];
    grid?: TpointerSnapConfig['grid'];
    guides?: TpointerSnapConfig['guides'];
    tol: number;
  };

  /** Controller aktif mi (enable/disable)? */
  protected _enabled: boolean;

  constructor(root: Element | { el?: Element } | null | undefined, opts?: TpointerControllerOpts);

  /* ----------------------------------------------------------------------
   * Lifecycle
   * ------------------------------------------------------------------- */

  /**
   * Root'a pointer/wheel/hover/keydown listener'larını bağlar.
   * Normalde constructor bunu otomatik çağırır.
   * @returns this (chainable)
   */
  attach(): this;

  /**
   * Root'tan tüm listener'ları kaldırır ve window-level dinleyicileri
   * (_bindWindow ile eklenen pointermove/up/cancel) de kapatır.
   * @returns this (chainable)
   */
  detach(): this;

  /**
   * detach() + dahili state temizliği (_active.clear()).
   * Tekrar kullanmayacaksan çağır.
   */
  destroy(): void;

  /* ----------------------------------------------------------------------
   * Enable / Disable
   * ------------------------------------------------------------------- */

  /**
   * Controller'ı etkin hale getir. (pointer event'leri işler)
   * @returns this (chainable)
   */
  enable(): this;

  /**
   * Controller'ı pasifleştir. (pointer event'lerini yok sayar)
   * @returns this (chainable)
   */
  disable(): this;

  /** Şu an etkin mi? */
  get enabled(): boolean;

  /* ----------------------------------------------------------------------
   * Compat / helpers
   * ------------------------------------------------------------------- */

  /**
   * addEventListener(type, fn)
   * removeEventListener(type, fn)
   *
   * DOM benzeri API. İçeride this.on / this.off çağırır,
   * böylece legacy kod `pc.addEventListener('tpointer:tap', handler)`
   * şeklinde çalışmaya devam edebilir.
   */
  addEventListener(type: string, fn: (ev: any) => any): (ev: any) => any;
  removeEventListener(type: string, fn: (ev: any) => any): void;

  /**
   * Snap provider listesini tamamen değiştirir ve snap.enabled=true yapar.
   * @param list   yeni provider[]
   * @returns this (chainable)
   *
   * Tipik kullanım:
   *   pc.setSnapProviders([ gridSnapProvider, guideSnapProvider ])
   *
   * Drag sırasında her move'da bu provider'lar çağrılır.
   */
  setSnapProviders(list: TpointerSnapProvider[]): this;

  /* ----------------------------------------------------------------------
   * Query
   * ------------------------------------------------------------------- */

  /**
   * Şu anda aktif en az bir pointer drag halinde mi?
   * @returns true → en az bir pointer drag başlatmış durumda.
   */
  isDragging(): boolean;

  /**
   * Kaç pointer aktif olarak down durumda?
   * @returns aktif pointer sayısı
   */
  activeCount(): number;

  /**
   * İlk aktif pointer'ın son bilinen konumu.
   * @returns {x,y} veya null
   */
  lastPosition(): { x: number; y: number } | null;

  /* ----------------------------------------------------------------------
   * Serialize / Debug
   * ------------------------------------------------------------------- */

  /**
   * Küçük bir makine-durumu çıktısı. (debug / persist)
   * { type:'TpointerController', args:[ null,{...opts,snap:{enabled}} ] }
   */
  toMinJSON(): any;

  /**
   * Daha okunabilir durum çıktısı.
   * { type:'ns:TpointerController', opts:{...}, snap:{enabled,...} }
   */
  toJSON(): any;
}

/**
 * Varsayılan export runtime modüldeki
 *   export default { TpointerController }
 * yapısına denk gelecek şekilde tutulur. fileciteturn127file0
 */
declare const _default: {
  TpointerController: typeof TpointerController;
};

export default _default;

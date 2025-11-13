/**
 * TeventBinder.d.ts
 * ---------------------------------------------------------------------------
 * Hafif/yerel event bağlayıcı.
 *
 * Kullanım alanı:
 *   - Renderer node'larının { on:{click:'save'}, events:[{type:'input',handler:fn}] }
 *     şeklindeki tanımlarını gerçek DOM'a bağlar.
 *   - Inline HTML attribute üzerinden otomatik parse/bind:
 *       <button on="click:save|once|prevent; input:validate|debounce:200"></button>
 *   - Debounce / throttle / preventDefault / stopPropagation kontrolü.
 *   - addEventListener passive/once/capture varsayılanlarını policy.passiveByType
 *     üzerinden belirler.
 *   - Bağlanan listener'ları WeakMap ile takip eder ve unbind() ile
 *     garantili şekilde kaldırır.
 *
 * Runtime davranışı TeventBinder.js içeriğine göre yazılmıştır. fileciteturn10file1
 *
 * Binder, TeventBridge'in snapshot/restore tarafında da fallback olarak
 * kullanılabilir (TeventBridge.restore, global TeventBinder varsa onu çağırıyor).
 */

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/**
 * Tek bir inline event tanımının parse edilmiş hali.
 * Örnek: "click:save|once|prevent" →
 *   { type:'click', handler:'save', options:{ once:true, prevent:true } }
 */
export interface TbinderParsedDef {
  type: string;
  handler: any;
  options?: Record<string, any>;
}

/**
 * Renderer node spec'i.
 *
 * Bu obje iki ana alan kullanabilir:
 *   on: { click:'save', input:fn, ... }
 *   events: [ { type:'input', handler:fn, options:{ once:true } }, ... ]
 *
 * Ayrıca TeventBinder.bind() inline attribute'u da okur:
 *   const attrName = opts.selectorAttr || 'on'
 *   <div on="click:save|once|prevent">
 */
export interface TbinderNodeSpec {
  on?: Record<string, any>;
  events?: Array<{
    type: string;
    handler: any;
    options?: Record<string, any>;
  }>;
  [key: string]: any;
}

/**
 * TeventBinder.defaults yapısı ve constructor opsiyonları.
 *
 * selectorAttr : Inline attribute adı ('on' varsayılan)
 * delegate     : İleri kullanım için delegation modu bayrağı (şu an mostly noop)
 * parse        : Custom parser override (attrValue, el) => TbinderParsedDef[]
 * policy       : passiveByType haritası (örn wheel:true,touchstart:true ...)
 * map          : handler name → function lookup tablosu
 */
export interface TbinderInitOpts {
  selectorAttr?: string;
  delegate?: boolean;
  parse?: (attrValue: string, el: Element) => TbinderParsedDef[];
  policy?: {
    passiveByType?: Record<string, boolean>;
    [key: string]: any;
  };
  map?: Record<string, Function>;
  [key: string]: any;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

export class TeventBinder {
  /** Varsayılan config kümesi (class-level). */
  static defaults: TbinderInitOpts & {
    selectorAttr: string;
    delegate: boolean;
    policy: {
      passiveByType: Record<string, boolean>;
    };
    map: Record<string, Function>;
  };

  /** Aktif opsiyonlar (constructor'da defaults ile merge edilir). */
  opts: TbinderInitOpts;

  /** İsteğe bağlı function registry. funcs.get(name) → fn dönebilir. */
  funcs: {
    get?(name: string): Function | undefined;
    [key: string]: any;
  } | null;

  /** Element -> listener kayıtları dizisi tutulur. */
  protected _elMap: WeakMap<any, Array<{
    type: string;
    fn: Function;
    opts: any;
  }>>;

  constructor(opts?: TbinderInitOpts);

  /* ------------------------------------------------------------------------
   * Context / Policy setter'ları
   * --------------------------------------------------------------------- */

  /** Harici function registry ver. { get(name){...} } bekler. */
  setFuncs(funcs: any): void;

  /** Delegation konteyneri (ileride kullanılacak). */
  setContainer(el: any): void;

  /** Passive/capture/once policy'sini güncelle. */
  setPolicy(p: any): void;

  /** Delegation mod bayrağını ayarla. */
  setDelegation(o: any): void;

  /* ------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------- */

  /**
   * Bir elementi verilen spec'e göre (veya inline attribute'a göre)
   * addEventListener ile donatır.
   *
   * - Eğer spec.on varsa: {click:'save', input:fn}
   * - Eğer spec.events varsa: [{type:'input',handler:fn,options:{once:true}}]
   * - Sonra element üstündeki inline attribute (opts.selectorAttr veya 'on')
   *   parse edilir ve aynı şekilde bağlanır.
   *
   * ctx, handler wrap fonksiyonuna { el, node, id, target:'@self' } olarak gider.
   */
  bind(el: any, spec: TbinderNodeSpec | any, ctx?: any): void;

  /** unbind() + bind() */
  rebind(el: any, spec: TbinderNodeSpec | any, ctx?: any): void;

  /**
   * Bu elemente daha önce bind() ile eklenen tüm listener'ları
   * removeEventListener ile söker.
   */
  unbind(el: any): void;

  /** Eski API'de node id bazlı unbind için placeholder. */
  unbindNode(id: any): void;

  /** Tüm elementleri topluca sökmek için placeholder (opsiyonel). */
  unbindAll(): void;

  /* ------------------------------------------------------------------------
   * Korumalı/dahili yardımcılar
   * --------------------------------------------------------------------- */

  /** Dahili kayıt tutar. */
  protected _remember(el: any, rec: { type: string; fn: Function; opts: any }): void;

  /**
   * Handler referansını çözer:
   *   - Eğer already Function ise direkt döndür
   *   - Eğer string ise funcs.get(name) → fn
   *   - Eğer orada yoksa this.opts.map[name] → fn
   *   - Eğer globalThis[name] bir fn ise onu döndür
   *   - Yoksa noop fn döndür
   */
  protected _resolveHandler(ref: any): Function;

  /**
   * Debounce/throttle/stop/stopImmediate/prevent logic'ini saran wrapper'ı
   * yaratır (event listener olarak kullanılacak gerçek fn budur).
   */
  protected _wrap(
    handler: Function,
    el: any,
    ctx: any,
    options: Record<string, any> | null
  ): (ev: any) => any;

  /** passive/once/capture seçeneklerini hesaplar. */
  protected _applyOptions(
    type: string,
    options: Record<string, any> | null
  ): {
    capture: boolean;
    once: boolean;
    passive: boolean;
  };

  /** Tek tek addEventListener yapar ve _elMap'e kaydeder. */
  protected _attach(
    el: any,
    type: string,
    handlerRef: any,
    options: Record<string, any> | null,
    ctx: any
  ): void;

  /**
   * Inline attribute parser.
   * Varsayılan parser şu formatı destekler:
   *   "click:save|once|prevent; input:validate|debounce:200"
   *
   * Çıktı:
   *   [
   *     { type:'click', handler:'save', options:{ once:true, prevent:true } },
   *     { type:'input', handler:'validate', options:{ debounce:200 } }
   *   ]
   */
  protected _parseAttr(val: string, el: any): TbinderParsedDef[];
}

/* ==========================================================================
 *  PLUGIN YARDIMCI API
 * ========================================================================== */

/**
 * CLASS ekosistemine 'events' plugin API'si olarak TeventBinder'i takar.
 *
 * Dönüş nesnesi:
 *   {
 *     setFuncs(f),
 *     setContainer(el),
 *     setPolicy(p),
 *     setDelegation(o),
 *     bind(el,node,ctx),
 *     rebind(el,node,ctx),
 *     unbind(el),
 *     unbindNode(id),
 *     unbindAll(),
 *     instance: binder
 *   }
 */
export function installTo(
  CLASS: any
): {
  setFuncs: (f: any) => void;
  setContainer: (el: any) => void;
  setPolicy: (p: any) => void;
  setDelegation: (o: any) => void;
  bind: (el: any, node: TbinderNodeSpec | any, ctx?: any) => void;
  rebind: (el: any, node: TbinderNodeSpec | any, ctx?: any) => void;
  unbind: (el: any) => void;
  unbindNode: (id: any) => void;
  unbindAll: () => void;
  instance: TeventBinder;
};

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

declare const _default: typeof TeventBinder;
export { TeventBinder, installTo };
export default _default;

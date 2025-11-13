/**
 * Tevents.d.ts
 * ---------------------------------------------------------------------------
 * Hafif ama güçlü bir event bus / emitter sınıfı. fileciteturn11file2
 *
 * Özellikler
 * ----------
 * - on()/once()/off()      : normal event listener yönetimi
 * - wildcards ("ui.*")     : joker eşleşmeli dinleyiciler
 * - namespacing ("ready.ui.panel") : dinleyicileri gruplayıp toplu off() yapma
 * - priority (prio)        : aynı event tipinde çağrı sırası
 * - middleware chain       : emit() öncesi hook
 * - suspend()/resume()     : geçici olarak event yaymayı durdurup kuyruğa almak
 * - bubbleTo               : başka bir Tevents'e bubble edebilme
 * - DOM bridge             : onDOM(), delegate(), bindDOM()
 * - snapshot/restore       : elementteki DOM event listener'larını yakala/geri yükle
 *   (TfunctionRegistry ve opsiyonel global TeventBinder ile entegre) fileciteturn11file2
 *
 * Runtime dosyası Tevents.js bu davranışı uygular. fileciteturn11file2
 */

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/**
 * Tevents constructor opsiyonları.
 *
 * maxListeners     : izin verilen toplam dinleyici sınırı (Infinity default)
 * bubbleTo         : bubble hedefi (başka bir Tevents örneği)
 * rememberEvents   : ['ready', ...] gibi; bu event son argümanlarını
 *                    kaydeder ve daha sonra on(...,{replay:true}) ile
 *                    abone olanlara hemen yeniden oynatır
 * queueOnSuspend   : suspend() edilmiş eventler emit edilirse kuyruğa al mı
 */
export interface TeventsInitOpts {
  maxListeners?: number;
  bubbleTo?: any;
  rememberEvents?: string[];
  queueOnSuspend?: boolean;
  [key: string]: any;
}

/**
 * Dinleyici kaydı sırasında geçen opsiyonlar.
 *
 * once    : true ise ilk çağrıdan sonra otomatik off()
 * prio    : büyük prio önce çağrılır
 * ctx     : handler.call(ctx, e) bağlamı
 * signal  : AbortSignal verilirse otomatik off() için dinlenir
 * replay  : true ise rememberEvents listesinde olan event'in son değeri
 *           hemen handler'a gönderilir
 */
export interface TeventsOnOpts {
  once?: boolean;
  prio?: number;
  ctx?: any;
  signal?: any;
  replay?: boolean;
  [key: string]: any;
}

/**
 * emit() ile handler'lara gönderilen event objesi kabaca şudur:
 *
 * {
 *   type, target, timeStamp,
 *   detail, meta,
 *   defaultPrevented, propagationStopped, immediateStopped,
 *   preventDefault(), stopPropagation(), stopImmediatePropagation()
 * }
 */
export interface TeventPayload {
  type: string;
  target: any;
  timeStamp: number;
  detail: any;
  meta: any;
  defaultPrevented: boolean;
  propagationStopped: boolean;
  immediateStopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
  [key: string]: any;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

export class Tevents {
  /** Ayar nesnesi (constructor'da verilen opts merge edilir). */
  opts: {
    maxListeners: number;
    bubbleTo: any;
    rememberEvents: string[];
    queueOnSuspend: boolean;
    [key: string]: any;
  };

  /**
   * Dahili depolar (hidden):
   * _exact   : Map<eventName, Array<listenerRec>>
   * _wild    : Array<listenerRec> (joker eşleşmeler)
   * _any     : Array<listenerRec> (tüm eventler '*')
   * _remember: Map<eventName, lastArgs[]>
   * _suspended: Set<eventName>
   * _queue   : Map<eventName, Array<[detail,meta]>> (suspend kuyruğu)
   * _middleware: Set<fn>
   * _dom     : Set<DOMListenerRec>
   *
   * Bunlar burada sadece tip amaçlı; dışarı doğrudan dokunmamalısın.
   */
  protected _exact: Map<string, any[]>;
  protected _wild: any[];
  protected _any: any[];
  protected _remember: Map<string, any[]>;
  protected _suspended: Set<string>;
  protected _queue: Map<string, any[]>;
  protected _middleware: Set<Function>;
  protected _dom: Set<any>;

  constructor(opts?: TeventsInitOpts);

  /* ------------------------------------------------------------------------
   *  MIDDLEWARE
   * --------------------------------------------------------------------- */

  /**
   * Her emit() öncesi çağrılan middleware zincirine fn ekler.
   * fn(e) false dönerse emit iptal edilir.
   * Dönüş: kaldırıcı (unsubscribe).
   */
  use(fn: (e: TeventPayload) => any): () => void;

  /* ------------------------------------------------------------------------
   *  SUBSCRIBE API
   * --------------------------------------------------------------------- */

  /**
   * Bir veya daha fazla event'e abone ol.
   * keys şunları kabul eder:
   *   'ready'
   *   'ready.ui.panel'      → namespace'li
   *   'ui.*'                → wildcard
   *   ['ready','click.ui']  → çoklu
   *
   * handler bir Function veya {key:'ns:name'} şeklinde registry referansı
   * olabilir. (TfunctionRegistry.resolve ile çözülür). fileciteturn11file2
   *
   * Dönüş: () => off(keys, handler)
   */
  on(
    keys: string | string[],
    handler: any,
    opts?: TeventsOnOpts
  ): () => void;

  /** once(...) = on(...,{once:true}) */
  once(
    keys: string | string[],
    handler: any,
    opts?: TeventsOnOpts
  ): () => void;

  /**
   * Listener'ı kaldırır.
   * keys:
   *   '*'          → her şeyi temizle
   *   'ready.*'    → bu wildcard pattern'e uyanları temizle
   *   'ready'      → tam eşleşen event
   *
   * handler verilmişse sadece o handler'ı kaldırır.
   * opts.ns bir namespace listesi (string ya da ['ui','panel']) olabilir.
   * chainable döner.
   */
  off(
    keys?: string,
    handler?: any,
    opts?: { ns?: string | string[] }
  ): this;

  /** Toplam kayıtlı dinleyici sayısı. */
  totalListenerCount(): number;

  /* ------------------------------------------------------------------------
   *  EMIT
   * --------------------------------------------------------------------- */

  /**
   * Event yayar.
   * - middleware zinciri çalışır
   * - rememberEvents listesinde ise son argüman kaydedilir
   * - bubbleTo varsa oraya da forward eder (emit('type', detail, meta))
   *
   * Dönüş: çağrılan handler sayısı.
   */
  emit(type: string, detail?: any, meta?: any): number;

  /**
   * emitCancelable, emit(...) çağırır ve en az bir dinleyici çağrıldıysa
   * true döner. Not: defaultPrevented bilgisi otomatik dışarı taşınmaz.
   */
  emitCancelable(type: string, detail?: any, meta?: any): boolean;

  /** emit()'i microtask queue'ya atar, Promise<number> döner. */
  emitAsync(type: string, detail?: any, meta?: any): Promise<number>;

  /* ------------------------------------------------------------------------
   *  WAIT / FLOW
   * --------------------------------------------------------------------- */

  /**
   * Belirli bir event için bir kez bekler.
   * pred(e) true dönerse resolve olur, yoksa dinlemeye devam eder.
   * timeout ms verilirse o sürede event gelmezse reject eder.
   */
  waitOnce(
    type: string,
    pred?: (e: TeventPayload) => boolean,
    opts?: { timeout?: number | null }
  ): Promise<TeventPayload>;

  /* ------------------------------------------------------------------------
   *  SUSPEND / QUEUE
   * --------------------------------------------------------------------- */

  /**
   * Bu event'i askıya alır. emit() edildiğinde kuyruğa alınır.
   * queue=false verilirse kuyruğa alma kapatılır.
   */
  suspend(type: string, opts?: { queue?: boolean }): this;

  /**
   * Askıyı kaldırır. Kuyruktaki event'ler emit() edilir.
   */
  resume(type: string): this;

  /** Belirli bir event'in kuyruğunu veya tüm kuyrukları temizler. */
  clearQueue(type?: string | null): this;

  /* ------------------------------------------------------------------------
   *  PIPE / RELAY
   * --------------------------------------------------------------------- */

  /**
   * Bu emitter'daki tüm event'leri başka bir emitter'a yönlendirir.
   * map callback'i ile isim dönüştürülebilir.
   * Dönüş: unsubscribe fonksiyonu.
   */
  pipe(
    toEmitter: any,
    map?: (
      name: string,
      e: TeventPayload
    ) => { name?: string; event: TeventPayload } | Record<string, any> | null
  ): () => void;

  /**
   * Başka bir kaynaktaki belli event'leri dinleyip birebir forward eder.
   * Dönüş: unsubscribe fonksiyonu.
   */
  relayFrom(source: any, events: string | string[]): () => void;

  /* ------------------------------------------------------------------------
   *  DOM BRIDGE
   * --------------------------------------------------------------------- */

  /**
   * Doğrudan DOM event'i dinle ve handler(ev, el) çağır.
   * Dönüş: offDOM() çağıracak remover.
   */
  onDOM(
    el: any,
    type: string,
    handler: (ev: any, el: any) => any,
    opts?: any
  ): () => void;

  /**
   * onDOM ile bağlananları kaldırır. recOrEl tek kayıt veya element olabilir.
   */
  offDOM(recOrEl: any, type?: string | null): this;

  /**
   * Spec = { click:'myEvent', input:fn, ... }
   * Eğer value string ise emit(value,{originalEvent:true,ev},...).
   * Dönüş: kaldırıcı unsubscribe fonksiyonu.
   */
  bindDOM(
    el: any,
    spec?: Record<string, any>,
    opts?: any
  ): () => void;

  /**
   * Delegated event listener:
   * rootEl.addEventListener(types, ...) + closest(selector).
   * Dönüş: remover fonksiyonu.
   */
  delegate(
    el: any,
    selector: string,
    types: string | string[],
    handler: (ev: any) => any,
    opts?: any
  ): () => void;

  /* ------------------------------------------------------------------------
   *  SERIALIZATION / SNAPSHOT
   * --------------------------------------------------------------------- */

  /**
   * Minimal temsil.
   * { $type:'Tevents', id:this.id, opts:{ bubbleTo:!!..., rememberEvents:[...] } }
   */
  toMinJSON(): {
    $type: 'Tevents';
    id: any;
    opts: {
      bubbleTo: boolean;
      rememberEvents: string[];
      [key: string]: any;
    };
  };

  /**
   * Internal helper: instance'dan ctor argümanlarını çıkarmak için kullanılır.
   * Genelde serializer tarafında çağrılır.
   */
  static __ctorArgsOf(inst: any): any[];

  /**
   * Bir DOM elementinin üzerindeki event listener'larını snapshot'lar.
   * Global TeventBinder varsa onu kullanır; yoksa kendi fallback mekanizmasını
   * kullanır. Listener'ların fn referansları TfunctionRegistry.register()
   * aracılığıyla global id'lere dönüştürülür. fileciteturn11file2
   *
   * includeOptions=true ise addEventListener options (capture/once/passive)
   * snapshot'a dahil edilir.
   *
   * Dönüş:
   *   {
   *     click: [ {id:'fn:app:save:12', o:{once:true,passive:false}}, ... ],
   *     input: [ {id:'fn:app:validate:13', o:{...}} ]
   *   }
   * veya null.
   */
  static eventSnapshot(
    el: any,
    opts?: { includeOptions?: boolean }
  ): Record<string, Array<{ id: string; o?: any }>> | null;

  /**
   * eventSnapshot() çıktısını tekrar DOM elementine uygular.
   * Global TeventBinder varsa TeventBinder.bind() kullanabilir; yoksa
   * doğrudan el.addEventListener() yapar. fileciteturn11file2
   */
  static eventRestore(
    el: any,
    snapshot: Record<string, Array<{ id: string; o?: any }>> | null
  ): void;

  /**
   * DOM addEventListener yaparken aynı zamanda global TfunctionRegistry'ye
   * register() edip id döner.
   *
   * Dönüş: { id, off }  → off() listener'ı kaldırır.
   */
  static bindWithId(
    el: any,
    type: string,
    ns: any,
    name: any,
    fn: Function,
    options?: any
  ): { id: string; off: () => void };
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

declare const _default: typeof Tevents;
export default _default;
export { Tevents };

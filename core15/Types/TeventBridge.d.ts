/**
 * TeventBridge.d.ts
 * ---------------------------------------------------------------------------
 * Merkezi event köprüsü (bridge).
 *
 * GÖREVİ
 * ------
 * - UI node'larının / bileşenlerinin tanımladığı event spec'lerini
 *   gerçek DOM'a bağlamak (addEventListener seviyesinde).
 * - Delegation ("delegate:.row"), target çözümleme ("@self", "window",
 *   "closest:.panel" ...), throttle / debounce / preventDefault / stopPropagation
 *   gibi davranışları tek noktadan yönetmek.
 * - Güncelleme (update) ile diff bazlı yeniden bağlama yaparak eski
 *   listener'ları söküp yenilerini takmak.
 * - snapshot()/restore() hattında handler fonksiyonlarını kararlı ID'lerle
 *   kaydedip geri yükleyebilecek biçime getirmek (TfunctionRegistry +
 *   TeventBinder entegrasyonu).
 *
 * ANA KAVRAMLAR
 *  • "spec":
 *      {
 *        type: 'click',
 *        handler: fn | 'app:save' | {id:'app:save'},
 *        target: '@self' | 'window' | 'delegate:.item' | {in:'root',mode:'closest',query:'.foo'},
 *        when: (ctx,ev,node,el)=>boolean | string,
 *        throttle: 100,
 *        debounce: 200,
 *        preventDefault: true,
 *        stopPropagation: true,
 *        stopImmediate: true,
 *        options: { capture:true, once:false, passive:false },
 *        map(ev,ctx,node,el){ return [ev, ctx, node, el]; }
 *      }
 *
 *  • context provider:
 *      Bridge her event tetiklendiğinde handler'ı şöyle çağırır:
 *         handler(ev, ctx, node, el)
 *      Buradaki `ctx`, bind() çağrısındaki opts.ctx veya global context
 *      provider'dan (setContextProvider) gelir. Bu sayede handler fonksiyonun
 *      dış scope'a kapanmadan (closuresız) app / history / selection gibi
 *      servislere erişmesi sağlanır. Bu mekanizma snapshot/restore ile
 *      serialize edilebilir event haritaları için kritik öneme sahiptir. fileciteturn10file0
 *
 *  • passivePolicy:
 *      event tipine göre addEventListener opsiyonları (passive/capture/once)
 *      otomatik belirlenir. preventDefault=true ise passive:false zorlanabilir.
 *
 * Bu .d.ts dosyası TeventBridge.js'nin public yüzeyini ayrıntılı ve
 * açıklamalı şekilde tanımlar. Dahili private yardımcılar protected olarak
 * imza seviyesinde gösterilir.
 */

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/**
 * Event'in hangi DOM hedef(ler)ine bağlanacağını tanımlar.
 *
 * String form örnekleri:
 *   '@self'            → node.el
 *   '@root'            → bridge.root (veya document)
 *   'window'           → global window
 *   'document'         → global document
 *   'closest:.row'     → node.el.closest('.row')
 *   'delegate:.item'   → delegation; ana hedefe tek listener bağlanır,
 *                         event.target'tan yukarı closest('.item') aranır
 *
 * Nesne formu (daha düşük seviyeli):
 *   {
 *     in: 'self' | 'root' | 'window' | 'document' | <cssSelector veya başka alias>,
 *     mode: 'one' | 'all' | 'closest',
 *     query: '.btn'
 *   }
 * - mode:'closest'  → closest(query) çözümü
 * - mode:'all'      → addEventListener üstüne tek listener konur ve
 *                      runtime'da uygun target aranır
 */
export interface TbridgeTargetSpec {
  in?: 'self' | 'root' | string;
  mode?: 'one' | 'all' | 'closest';
  query?: string;
  [key: string]: any;
}

/**
 * Tek bir event spec tanımı.
 *
 * type            : 'click', 'pointerdown', 'wheel', ...
 * handler         : Function veya resolve edilebilir bir id/string.
 *                   - string/veri ise bridge.resolveFn veya global registry
 *                     üzerinden gerçek fonksiyona çevrilir.
 * target          : Yukarıdaki target spec (string ya da TbridgeTargetSpec).
 * when            : Koşul. (ctx, ev, node, el) → boolean döner veya string
 *                   ifade olabilir (evalFilters=true ise eval edilir).
 * throttle        : ms cinsinden "en fazla şu sıklıkta çalıştır".
 * debounce        : ms cinsinden "son tetiklenmeden şu kadar süre sonra çalıştır".
 * preventDefault  : true ise ev.preventDefault() yapılır.
 * stopPropagation : true ise ev.stopPropagation() yapılır.
 * stopImmediate   : true ise ev.stopImmediatePropagation() yapılır.
 * options         : addEventListener opsiyonları override'ı
 *                   ({capture,once,passive} gibi).
 * map             : (ev,ctx,node,el) => argArray;
 *                   Eğer verilirse handler(...argArray) şeklinde çağrılır.
 *
 * NOT:
 *   - passive varsayılanı event tipine göre passivePolicy'den türetilir.
 *   - preventDefault=true ise passive:false zorlanabilir.
 *   - target verilmezse defaultTarget kullanılır ('@self' varsayılan).
 */
export interface TbridgeSpec {
  type: string;
  handler: any;
  target?: string | TbridgeTargetSpec;
  when?: any;
  throttle?: number;
  debounce?: number;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  stopImmediate?: boolean;
  options?: Record<string, any>;
  map?: (ev: any, ctx: any, node: any, el: any) => any[];
  [key: string]: any;
}

/**
 * TeventBridge kurucu opsiyonları.
 *
 * resolveFn(id):
 *   handler:'app:save' gibi string referansları gerçek fonksiyona async
 *   çevirmek için kullanılır. Bu yoksa bridge kendi cache/pending mekanizmasını
 *   ve/veya global TfunctionRegistry'yi dener.
 *
 * defaultTarget:
 *   target belirtilmemiş spec'lerde kullanılacak varsayılan hedef
 *   ('@self' tipik olarak).
 *
 * passivePolicy:
 *   { [eventType]: { passive?:boolean, capture?:boolean, once?:boolean } }
 *   Harita. Her event tipi için varsayılan addEventListener opsiyonlarını
 *   belirler. Örnek: wheel genelde passive:true ister.
 *
 * allowEvents / blockEvents:
 *   Beyaz liste / kara liste. Eğer allowEvents set edildiyse sadece
 *   oradaki tipler bağlanır. blockEvents verilirse o tipler engellenir.
 *
 * evalFilters:
 *   true ise spec.when string olarak gelirse Function(...) ile derlenebilir.
 *   Güvenlik açısından kapalı başlar.
 *
 * root:
 *   '@root' target alias'ı için referans kabul edilecek element/document.
 *
 * log(...args):
 *   Debug log fonksiyonu.
 *
 * ctxProvider():
 *   Global context provider. setContextProvider ile de ayarlanabilir,
 *   burada ilk değer olarak da gelebilir.
 */
export interface TbridgeInitOpts {
  resolveFn?: (id: string) => Promise<Function>;
  defaultTarget?: string;
  passivePolicy?: Record<string, Partial<AddEventListenerOptions> | any>;
  allowEvents?: Set<string> | string[];
  blockEvents?: Set<string> | string[];
  evalFilters?: boolean;
  root?: Element | Document | null;
  log?: (...a: any[]) => void;
  ctxProvider?: () => any;
  [key: string]: any;
}

/**
 * installTo(...) için opsiyonlar.
 *
 * Bu metot TeventBridge'i CLASS ekosistemine "events" plugin'i olarak takar;
 * dönen obje CLASS.instances[i].events gibi kullanılabilir.
 *
 * ctxProvider  : context sağlayıcısını override etmek için kısayol.
 * Diğer alanlar doğrudan TeventBridge ctor'una forward edilir.
 */
export interface TbridgeInstallOpts extends TbridgeInitOpts {
  [key: string]: any;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

export class TeventBridge {
  /**
   * resolveFn, defaultTarget, passivePolicy, allowEvents, blockEvents,
   * evalFilters, root, log, ctxProvider vb. ayarları kabul eder. fileciteturn10file0
   */
  constructor(opts?: TbridgeInitOpts);

  /**
   * Handler ID -> Function çözmek için harici provider set eder.
   * Bu provider, string/id referanslarını gerçek fonksiyonlara çevirir.
   * chainable.
   *
   * Örnek:
   *   bridge.setFunctionProvider({
   *     get(id){ return MyMap[id]; }
   *   });
   */
  setFunctionProvider(provider: any): this;

  /**
   * Global context sağlayıcısını ayarlar. chainable.
   *
   * Bu fonksiyon her DOM event tetiklenmeden hemen önce çağrılır ve
   * dönen obje handler'a 2. argüman olarak `ctx` adıyla verilir.
   *
   * Handler çağrısı şekli runtime'da şuna benzer:
   *
   *   wrapped(ev) {
   *     const ctx = (opts.ctx ?? _ctxProvider?.() ?? {});
   *     handler(ev, ctx, node, el);
   *   }
   *
   * Böylece handler fonksiyonun closure'a (dış scope'a) kilitlenmesine
   * gerek kalmaz. Sen app-level servislerini (history, selection, globals,
   * activeTool, vs.) context içine koyarsın, handler her tetiklenişte bunları
   * taze alır.
   *
   * Bu model snapshot()/restore() ile kaydedilebilen event haritalarına
   * çok uygundur çünkü handler fonksiyonları artık dış state'e gömülü
   * kapalı değişkenler taşımaz; state context provider üzerinden enjekte edilir.
   *
   * Öncelik sırası:
   *   - bind(..., { ctx }) ile spesifik bind sırasında verilen ctx varsa
   *     o kullanılır
   *   - yoksa bu contextProvider çağrılır
   *   - hiçbiri yoksa {} kullanılır
   */
  setContextProvider(fn: (() => any) | null): this;

  /**
   * Event tipine göre passive/capture/once varsayılanlarını günceller.
   * chainable.
   *
   * Not: preventDefault=true ise passive:false zorlanabilir; bu nedenle
   * burada verdiğin policy runtime'da biraz daha ayarlanabilir.
   */
  setPassivePolicy(map: Record<string, any> | null): this;

  /**
   * Yalnızca bu event tiplerine izin ver. chainable.
   * allowEvents bir Set<string> olarak saklanır.
   */
  setAllow(list: Iterable<string> | null): this;

  /**
   * Bu event tiplerini engelle. chainable.
   * blockEvents bir Set<string> olarak saklanır.
   */
  setBlock(list: Iterable<string> | null): this;

  /**
   * '@root' alias'ının bakacağı kök element/document'i değiştirir.
   * chainable.
   */
  setRoot(root: Element | Document | null): this;

  /**
   * Bir node (genelde {el:HTMLElement} veya Telement) için bir veya
   * birden fazla event spec bağla.
   *
   * specs tek obje veya dizi olabilir.
   *
   * opts.root :
   *   local override kök. '@root' bu elemana göre çözülebilir.
   *
   * opts.ctx :
   *   Bu bind için özel context. Eğer verilirse handler çağrılırken
   *   setContextProvider() ile tanımlanan global ctx yerine bu ctx kullanılır.
   *
   * Dönüş:
   *   çağırıldığında bu node için eklenen TÜM listener'ları kaldıran
   *   bir unbind() fonksiyonu.
   */
  bind(
    node: any,
    specs: TbridgeSpec | TbridgeSpec[],
    opts?: { root?: Element | Document | null; ctx?: any }
  ): () => void;

  /**
   * Bu node için önceki tüm listener'ları tamamen kaldırır,
   * sonra verilen specs ile tekrar bind() yapar.
   * Dönüş yine unbind fonksiyonudur.
   */
  rebind(
    node: any,
    specs: TbridgeSpec | TbridgeSpec[],
    opts?: { root?: Element | Document | null; ctx?: any }
  ): () => void;

  /**
   * Var olan binding setini nextSpecs ile senkronize eder.
   *  - artık olmayanları removeEventListener ile söker
   *  - yeni olanları ekler
   *
   * Bu işlem async'tir çünkü handler string/id referansları resolveFn
   * üzerinden async çözülebilir ve bridge bunları cache'ler. fileciteturn10file0
   */
  update(
    node: any,
    nextSpecs: TbridgeSpec | TbridgeSpec[],
    opts?: { root?: Element | Document | null; ctx?: any }
  ): Promise<void>;

  /**
   * Daha önce bind()/rebind()/update() ile kaydedilmiş olan listener'lardan
   * bu node'a ait olanları kaldırır.
   *
   * filter vermezsen hepsini söker.
   * filter bir prefix string ise sadece o prefix ile eşleşen kayıtlar
   * (ör: 'click|') kaldırılır.
   */
  unbind(node: any, filter?: string | null): void;

  /**
   * Bir ağaç yapısını (node.children vb.) gezip her node.events'i bind eder.
   * Genelde renderer/virtual tree çıktısını tek geçişte aktive etmek için.
   *
   * nodes tek node veya dizi olabilir.
   * ctx bu bind çağrılarında opts.ctx olarak forward edilir.
   */
  bindTree(nodes: any | any[], ctx?: any): Promise<void>;

  /**
   * Şu anda kayıtlı tüm node/spec eşleşmelerini (bridge.bindings içindeki)
   * yeniden uygular: önce removeEventListener ile söker sonra yeniden takar.
   * Genelde kök DOM değiştikten sonra / root güncellendiyse kullanılır.
   */
  rebindAll(): Promise<void>;

  /**
   * Delegation helper.
   *
   * rootEl.addEventListener(type, wrapped, options) kurar.
   * wrapped içinde event.target'tan yukarı doğru selector eşleşmesi bakılır.
   *
   * Dönüş:
   *   kaldırıcı remover fonksiyon ya da null.
   */
  delegate(
    rootEl: Element | Document | null,
    type: string,
    selector: string,
    handler: any,
    options?: Record<string, any>,
    ctx?: any
  ): Promise<(() => void) | null>;

  /**
   * Bu TeventBridge örneğini global instance setinden siler.
   * (snapshot/getEventMap hala diğer örnekler üzerinden çalışabilir.)
   */
  destroy(): void;

  /* ------------------------------------------------------------------------
   * DAHİLİ / PROTECTED ALANLAR
   * (Bunlar public API değil ama tip olarak varlar.)
   * --------------------------------------------------------------------- */

  /** Event tipine göre passive/capture/once defaultları. */
  passivePolicy: Record<string, any>;

  /** allowEvents => sadece bu tipler dinlenir (yoksa null). */
  allowEvents: Set<string> | null;

  /** blockEvents => bu tipler dinlenmez (yoksa null). */
  blockEvents: Set<string> | null;

  /** Varsayılan hedef alias'ı ('@self' tipik olarak). */
  defaultTarget: string;

  /** '@root' alias'ı için referans. */
  root: Element | Document | null;

  /** Debug log fonksiyonu veya null. */
  log: ((...a: any[]) => void) | null;

  /** Global context provider. setContextProvider ile yönetilir. */
  protected _ctxProvider: (() => any) | null;

  /**
   * Ana kayıt yapısı:
   *   Map(
   *     node -> Map(
   *       key -> {
   *         el,          // EventTarget
   *         type,        // 'click'
   *         wrapped,     // gerçek addEventListener handler (throttle/debounce/ctx dahil)
   *         original,    // orijinal handler (fn veya string id)
   *         options,     // addEventListener options
   *         spec         // orijinal spec
   *       }
   *     )
   *   )
   *
   * key genelde `${type}|${targetDesc}|${handlerId}|${optsJSON}` gibi unique string.
   */
  bindings: Map<any, Map<string, {
    el: EventTarget;
    type: string;
    wrapped: Function;
    original: any;
    options: any;
    spec: TbridgeSpec;
  }>>;

  /** handler id -> Function cache'i. */
  protected _fnCache: Map<string, Function>;

  /** id -> Promise<fn> (henüz çözülmekte olan async handler). */
  protected _pending: Map<string, Promise<Function>>;

  /** Harici function provider (setFunctionProvider ile atanır). */
  protected _fnProvider: any;

  /** resolveFn(id) → Promise<fn> ctor opsiyonundan gelebilir. */
  resolveFn?: (id: string) => Promise<Function>;

  /** true ise spec.when string ifadeleri eval edilebilir. */
  evalFilters: boolean;

  /* ------------------------------------------------------------------------
   * STATİK API
   * --------------------------------------------------------------------- */

  /**
   * Verilen fonksiyonu global/stabil bir string id ile kaydeder ve id döner.
   * Bu id snapshot/restore sırasında kullanılabilir.
   *
   * İkinci parametre ns (namespace), üçüncü parametre name gibi çalışır;
   * "ns:name" formuna getirilip TfunctionRegistry benzeri global depoya
   * yazılabilir. Eğer global registry yoksa dahili fallback kullanılır.
   */
  static toId(fn: Function, ns?: string, name?: string): string | null;

  /**
   * Daha önce toId() ile ID atanmış bir handler'ı geri çözer.
   * ID → orijinal Function.
   */
  static fromId(id: string): any;

  /**
   * Bir element için şu anda bağlı olan event listener'larını çıkarır.
   *
   * Dönüş Map<type, Array<{id,o,fn}>> yapısıdır:
   *   key   : 'click'
   *   value : [ { id:'events:save#12', o:{once:true,...}, fn:originalHandler } ]
   *
   * Bu yapı snapshot() / restore() iş akışında kullanılır.
   */
  static getEventMap(el: Element | EventTarget): Map<string, Array<{
    id: string | null;
    o: any;
    fn: any;
  }>>;

  /**
   * Bir elementteki tüm listener'ları snapshot'lar.
   * Handler fonksiyonlarının ID'leri kaydedilir (toId kullanılarak).
   *
   * includeOptions=true ise addEventListener options (capture/once/passive)
   * da snapshot'a gömülür.
   *
   * Dönüş kabaca:
   *   {
   *     click: [ {id:'events:save#12', o:{once:true,passive:false}}, ... ],
   *     input: [ {id:'events:validate#13', o:{...}} ]
   *   }
   * veya hiçbir şey yoksa null.
   */
  static snapshot(
    el: Element | EventTarget,
    opts?: { includeOptions?: boolean }
  ): Record<string, Array<{ id: string; o?: any }>> | null;

  /**
   * snapshot() ile alınan yapıyı kullanarak bir elementin event listener'larını
   * geri bağlar. Eğer global TeventBinder varsa onu kullanır; yoksa doğrudan
   * addEventListener ile bağlar.
   */
  static restore(
    el: Element | EventTarget,
    snap: Record<string, Array<{ id: string; o?: any }>> | null | undefined
  ): void;

  /**
   * Hemen bağla ve handler'a global id ata. Dönüş { id } döner.
   * Bu id snapshot/restore tarafında kullanılabilir.
   */
  static bindWithId(
    el: Element | EventTarget,
    type: string,
    ns: string,
    name: string,
    fn: Function,
    options?: any
  ): { id: string | null };

  /**
   * Bu class'ın aktif instance'ları. snapshot/getEventMap global taramalar
   * yaparken burayı da dolaşabilir.
   */
  static __instances: Set<TeventBridge>;
}

/* ==========================================================================
 *  PLUGIN YARDIMCI API
 * ========================================================================== */

/**
 * CLASS ekosistemine 'events' plugin API'si olarak TeventBridge'i takar.
 *
 * Dönüş objesi genelde CLASS instance'ının .events alanına enjekte edilir ve
 * şu yüzeyi sağlar:
 *
 *   {
 *     bind(node,specs,ctx?),
 *     bindOne(node,spec,ctx?),
 *     update(node,specs,ctx?),
 *     rebind(node,specs,ctx?),
 *     unbind(node,filter?),
 *     bindTree(nodes,ctx?),
 *     rebindAll(),
 *     delegate(rootEl,type,selector,handler,options?,ctx?),
 *     setFunctionProvider(p),
 *     setContextProvider(p),
 *     setPassivePolicy(m),
 *     setAllow(list),
 *     setBlock(list),
 *     setRoot(el),
 *     instance // TeventBridge örneği
 *   }
 */
export function installTo(
  CLASS: any,
  opts?: TbridgeInstallOpts
): {
  bind: (node: any, specs: TbridgeSpec | TbridgeSpec[], ctx?: any) => () => void;
  bindOne: (node: any, spec: TbridgeSpec, ctx?: any) => () => void;
  update: (node: any, specs: TbridgeSpec | TbridgeSpec[], ctx?: any) => Promise<void>;
  rebind: (node: any, specs: TbridgeSpec | TbridgeSpec[], ctx?: any) => () => void;
  unbind: (node: any, filter?: string | null) => void;
  bindTree: (nodes: any | any[], ctx?: any) => Promise<void>;
  rebindAll: () => Promise<void>;
  delegate: (
    rootEl: Element | Document | null,
    type: string,
    selector: string,
    handler: any,
    options?: Record<string, any>,
    ctx?: any
  ) => Promise<(() => void) | null>;
  setFunctionProvider: (p: any) => void;
  setContextProvider: (p: any) => void;
  setPassivePolicy: (m: any) => void;
  setAllow: (l: Iterable<string> | null) => void;
  setBlock: (l: Iterable<string> | null) => void;
  setRoot: (el: Element | Document | null) => void;
  instance: TeventBridge;
};

/**
 * Kısayol helper: TeventBridge.getEventMap(el)
 * Aktif event map'ini döndürür.
 */
export function getEventMap(
  el: Element | EventTarget
): Map<string, Array<{ id: string | null; o: any; fn: any }>>;

/**
 * Düşük seviyeli kaldırma helper'ı.
 * bindWithId ile eşleşen şekilde removeEventListener yapar.
 */
export function unbindWithId(
  el: Element | EventTarget,
  type: string,
  ns: string,
  name: string,
  fn: Function,
  opts?: any
): boolean;

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

declare const _default: {
  TeventBridge: typeof TeventBridge;
  installTo: typeof installTo;
  getEventMap: typeof getEventMap;
};

export default _default;

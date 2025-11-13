/**
 * eventHandling.d.ts
 * ---------------------------------------------------------------------------
 * Bu modul (eventHandling.js) editor'un tekil, unify edilmis event
 * altyapisidir. Amaç:
 *
 * 1. Her event listener fonksiyonuna stabil bir ID vermek
 *    - Bu ID serileştirilebilir (JSON'a yazılır)
 *    - Sonra geri yüklenip aynı fonksiyon tekrar bağlanabilir
 *    - Bu ID hem numeric (lokal havuz) hem string (TfunctionRegistry) olabilir
 *      ve ikisi de desteklenir. fileciteturn3file0
 *
 * 2. addEventListener / removeEventListener çağrılarını izlemek
 *    - EventTarget.prototype patch'lenir (sadece bir kez)
 *    - Her hedef için (HTMLElement, document, window...) dahili bir WeakMap
 *      altında şu yapı tutulur: Map<eventType, Array<ListenerRecord>>
 *    - Bu kayıtlar listener fonksiyonu, options ve ID bilgisini içerir
 *      (id: numeric veya registry rid). fileciteturn3file0
 *
 * 3. Snapshot / Restore
 *    - globalThis.eventSnapshot(el)   → { click:[{id:'x',o:{...}}], ... }
 *    - globalThis.eventRestore(el,s)  → snapshot'i kullanarak tekrar bağlar
 *    - ID çözümü öncelikle globalThis.TfunctionRegistry üzerinden string rid
 *      ile yapılır; olmazsa lokal numeric havuza düşer. fileciteturn3file0
 *
 * 4. Helper API
 *    - bindEvent(): handler'i güvenli şekilde sarar, `this` context'ini sabitler,
 *      false dönerse default/propagation iptal eder, `_meta` ekler, DOM'a bağlar
 *    - unbindEvent(): handler'i (veya onun wrap'ini) çözer
 *    - patchEventTargetPrototypes(): EventTarget.prototype'i tek seferlik
 *      patch'ler ve tracking'i aktive eder. Ayrıca HTMLElement.prototype,
 *      Document.prototype ve Window.prototype üzerine readonly `eventList`
 *      getter'ı eklenir (debug amaçlı). fileciteturn3file0
 *
 * 5. Function.prototype genişletmeleri
 *    - Function.prototype.bindToEvent(elem,type,ctx?,...args)
 *      → handler'i bağlar, `_meta` set eder, tracking listesine kaydeder
 *    - Function.prototype.toEventFunc(ctx?,...args)
 *      → context'e bound bir wrapper döner; false dönerse event'i iptal eder
 *
 * Bu d.ts dosyası public yüzü ve runtime davranışını belgeler.
 * createEnum / createOrd gibi düşük seviye fabrika fonksiyonlarından farklı
 * olarak burada DOM ile doğrudan çalışan taraf var. Serileştirme mantığı
 * (snapshot/restore) ThistoryManager, Telement.serialize, Tdom.restoreEvents
 * gibi yerlerin üstüne oturur. fileciteturn3file0
 */

/* ==========================================================================
 *  INTERNAL POOL / ID ÇÖZÜMLEME
 * ========================================================================== */

/**
 * getFnById(id):
 * ---------------------------------------------------------------------------
 * Lokal havuzdaki fonksiyonu getirir.
 *
 * - eventHandling.js modul kapsamındaki FN_POOL dizisine dayanır.
 * - `id` numeric ise doğrudan FN_POOL[id] döner.
 * - Global wrapper ayrıca globalThis.getFnById olarak da atanır; orada
 *   string id durumunda globalThis.TfunctionRegistry.getById(id) yolunu da
 *   dener, sonra numeric fallback yapar. Bu sayede hem yerel numeric ID'ler
 *   hem de registry tabanlı string ID'ler geri çözülebilir. fileciteturn3file0
 *
 * @param id   Numeric ID (veya numeric'e parse edilebilir string).
 * @returns    Orijinal handler fonksiyonu ya da undefined.
 */
export function getFnById(
  id: number | string
): ((...args: any[]) => any) | undefined;

/* ==========================================================================
 *  EVENT MAP & TRACKING
 * ========================================================================== */

/** Listener kaydı; EventTarget üstünde tutulan metadata. */
export interface TListenerRecord {
  /** Orijinal listener fonksiyonu (addEventListener'a verilen). */
  listener?: EventListenerOrEventListenerObject | any;
  /** Wrapper fonksiyon (bindEvent / bindToEvent vb. tarafından üretilmiş). */
  wrapper?: EventListenerOrEventListenerObject | any;
  /** Numeric veya registry-tabanlı ID. */
  id?: number | string;
  /** Registry ID (rid) string olarak atanabilir; global registry'de isimle tutulur. */
  rid?: number | string;
  /** addEventListener opsiyonları (capture, passive, once ...). */
  options?: any;
  /** Ek alanlar genişletilebilir. */
  [key: string]: any;
}

/**
 * getEventMap(el):
 * ---------------------------------------------------------------------------
 * Verilen EventTarget (HTMLElement/document/window dahil) için o ana kadar
 * kaydedilmiş event dinleyicilerinin haritasını döndürür.
 *
 * - WeakMap tabanlıdır, dışarı sızmayan internal yapı tutar.
 * - Her key bir event türüdür ("click", "pointermove" vb.)
 * - Value, TListenerRecord[] listesidir.
 * - Yoksa yeni bir Map yaratıp WeakMap'e kaydeder ve onu döndürür.
 *
 * Bu harita patchEventTargetPrototypes() sonrasında otomatik güncellenir:
 * addEventListener/removeEventListener override edilir ve listener eklenince
 * buradaki kayıtlar da tutulur / silinir. fileciteturn3file0
 *
 * @param el    DOM hedefi (HTMLElement, Document, Window, vs.).
 * @returns     Map<eventType, TListenerRecord[]> (her zaman aynı referans).
 */
export function getEventMap(
  el: EventTarget
): Map<string, TListenerRecord[]>;

/* ==========================================================================
 *  BIND / UNBIND API'SI
 * ========================================================================== */

/**
 * EventListenerWrapper:
 * bindEvent(), Function.prototype.bindToEvent() veya .toEventFunc() gibi
 * yardımcıların döndürdüğü sarmalayıcı dinleyici fonksiyonudur.
 *
 * wrapper(event, ...runtimeArgs)
 *   - orijinal handler'i belirlenen context ile çağırır
 *   - boundArgs (önceden sabitlenmiş argümanlar) ve runtimeArgs birleşir
 *   - handler false dönerse event.preventDefault() / stopPropagation() yapılır
 *
 * wrapper._meta = {
 *   original: handler,   // orijinal fonksiyon
 *   args: any[],         // önceden sabitlenmiş argümanlar
 *   objId: number        // context.id varsa onun id'si, yoksa -1
 * }
 * Bu metadata snapshot/restore tarafında debug ve yeniden bağlama için kullanılır. fileciteturn3file0
 */
export interface EventListenerWrapper {
  (ev: Event, ...runtimeArgs: any[]): any;
  _meta?: {
    original: Function;
    args: any[];
    objId: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * bindEvent(handler, element, eventType, context, ...boundArgs)
 * ---------------------------------------------------------------------------
 * Güvenli bir şekilde handler'i bağlar:
 *  - `this` bağlamını `context` olarak zorlar (call(context,...))
 *  - handler false dönerse default/propagation iptal eder
 *  - son argüman eğer object ise addEventListener options olarak kullanılır
 *  - wrapper._meta içine orijinal handler vs. kaydedilir
 *  - element.addEventListener(eventType, wrapper, options) yapılır
 *
 * Ayrıca `context` varsa ensureId(context) çağırmayı dener; bu, objenin
 * serialize/snapshot aşamasında referansla geri bulunabilmesi içindir.
 * (ensureId bu modulde tanımlı değil; global bir helper bekleniyor.) fileciteturn3file0
 *
 * @param handler     Orijinal fonksiyon.
 * @param element     Hedef HTMLElement (veya genel EventTarget).
 * @param eventType   'click', 'pointerdown', ... gibi event adı.
 * @param context     handler icin this olacak obje.
 * @param boundArgs   handler'a önceden sabitlenecek argümanlar.
 *                    Son argüman bir object ise addEventListener options
 *                    olarak yorumlanır.
 * @returns           Oluşturulan wrapper fonksiyonu.
 */
export function bindEvent(
  handler: (...args: any[]) => any,
  element: HTMLElement | EventTarget,
  eventType: string,
  context: any,
  ...boundArgs: any[]
): EventListenerWrapper;

/**
 * unbindEvent(handler, element, eventType?)
 * ---------------------------------------------------------------------------
 * Daha önce bindEvent() ile (veya patch mekanizması sonrası native add'le)
 * bağlanmış bir dinleyiciyi çözer.
 *
 * - `eventType` verilirse sadece o türde kaldırmayı dener
 * - verilmezse element üzerindeki tüm türlerde eşleşen handler/handler._meta
 *   kayıtlarını arar
 * - removeEventListener ile çözer ve tracking listesinden siler
 *
 * @param handler     Kaldırmak istediğin orijinal handler veya wrapper.
 * @param element     Hedef element.
 * @param eventType   Opsiyonel spesifik event türü.
 */
export function unbindEvent(
  handler: Function | EventListenerWrapper,
  element: HTMLElement | EventTarget,
  eventType?: string
): void;

/* ==========================================================================
 *  PROTOTYPE PATCH / DEBUG YÜZÜ
 * ========================================================================== */

/**
 * patchEventTargetPrototypes()
 * ---------------------------------------------------------------------------
 * Bu fonksiyon sadece bir kez çağrılır (idempotent). Çağrılınca:
 *
 * 1. EventTarget.prototype.addEventListener override edilir:
 *    - Orijinal addEventListener yine çağrılır
 *    - Sonra getEventMap(this) ile bu hedef için kayıt listesi alınır
 *    - Aynı listener daha önce eklenmediyse { listener, id, options }
 *      şeklinde listeye push edilir. id numeric olarak getOrAddId() ile
 *      atanır. (getOrAddId dahili olup her fonksiyona stabil local ID
 *      verir.) fileciteturn3file0
 *
 * 2. EventTarget.prototype.removeEventListener override edilir:
 *    - Orijinal removeEventListener çağrılır
 *    - Ardından ilgili kayıt listesinde aynı listener bulunup silinir;
 *      liste boşsa event türü map'ten temizlenir. fileciteturn3file0
 *
 * 3. HTMLElement.prototype, Document.prototype ve Window.prototype üstüne
 *    read-only getter `eventList` eklenir:
 *      - getEventMap(this) çağrılır
 *      - Geriye yeni bir Map kopyası döner (shallow copy), böylece dış dünya
 *        dahili listeyi doğrudan mutasyona uğratamaz.
 *
 * Bu patch debug için kritik: DevTools'tan element.eventList diyerek hangi
 * eventlerin kayıtlı olduğunu görebilirsin. Ayrıca snapshot/restore mekanizması
 * için event kayıtlarının tek yerde toplanmasını sağlar. fileciteturn3file0
 */
export function patchEventTargetPrototypes(): void;

/* ==========================================================================
 *  FUNCTION.PROTOTYPE GENIŞLETMELERİ
 * ========================================================================== */

/**
 * Function.prototype.bindToEvent(elem, type, ctx?, ...args)
 * ---------------------------------------------------------------------------
 * Bu helper herhangi bir fonksiyonun prototype'ına eklenir.
 * Kullanım:
 *
 *   someFn.bindToEvent(div, 'click', this, 123)
 *
 * - "this" bağlamı olarak ctx (veya elem) kullanılır
 * - Dönen wrapper false dönerse event.preventDefault/stopPropagation yapılır
 * - wrapper._meta = { original, args, objId } atanır
 * - wrapper, elem.addEventListener(type, wrapper, false) ile bağlanır
 * - Kayıt getEventMap(elem) altına push edilir (listenerInfo.wrapper, options)
 *
 * Bu sayede hem handler hem de wrapper izlenebilir/silinebilir hale gelir.
 *
 * NOT: patchEventTargetPrototypes() çağrılmışsa addEventListener zaten
 * tracking yapıyor. bindToEvent() kendi tracking kaydını ekstra olarak
 * kendisi de elle push ediyor; böylece snapshot'ta görülebilir. fileciteturn3file0
 */
export interface Function {
  bindToEvent(
    elem: HTMLElement | EventTarget,
    type: string,
    ctx?: any | null,
    ...args: any[]
  ): EventListenerWrapper;

  /**
   * Function.prototype.toEventFunc(ctx?, ...boundArgs)
   * -----------------------------------------------------------------
   * Bir handler'ı sarmalar ama henüz DOM'a bağlamaz.
   *
   * - Dönen wrapper(event, ...runtimeArgs) false dönerse event iptal edilir
   * - wrapper._meta = { original, args, objId } atanır
   * - Bu wrapper'ı sonra manuel olarak element.addEventListener ile
   *   kullanabilirsin; snapshot/restore yine onu tanıyabilir çünkü _meta
   *   içindeki original/objId saklıdır. fileciteturn3file0
   *
   * @param ctx         this bağlamı olarak kullanılacak obje (yoksa window)
   * @param boundArgs   handler'a önceden sabitlenecek argümanlar
   * @returns           EventListenerWrapper
   */
  toEventFunc(
    ctx?: any | null,
    ...boundArgs: any[]
  ): EventListenerWrapper;
}

/* ==========================================================================
 *  GLOBAL SNAPSHOT / RESTORE API'SI
 * ========================================================================== */

/**
 * globalThis.eventSnapshot(el, { includeOptions = true }):
 * ---------------------------------------------------------------------------
 * Verilen element üzerindeki tüm event kayıtlarını okunabilir bir formda
 * döndürür. Şu formattadır:
 *
 * {
 *    click: [ { id: 'events:123', o: { capture:false } }, ... ],
 *    pointerdown: [ { id: 7 }, ... ]
 * }
 *
 * - `id` string ise bu bir registry id'dir (TfunctionRegistry.register(...))
 * - `id` number ise bu lokal numeric havuz kimliğidir
 * - `o` (opsiyonel) addEventListener options bilgisidir
 * - Eğer hiçbir kayıt yoksa null döner
 *
 * İçeride ensureRegistryIds(el) çalışır:
 *  - Her listener kaydına .rid yoksa ve globalThis.TfunctionRegistry mevcutsa
 *    FR.register('events', name, rec.listener) çağrılır ve rec.rid atanır.
 *  - Daha sonra snapshot dizisine o rid/id yazılır. fileciteturn3file0
 */
export interface TEventSnapshot {
  [eventType: string]: Array<{
    /** registry id (string) veya local numeric id */
    id: string | number;
    /** addEventListener options (capture/passive/once vb.), varsa */
    o?: any;
    [key: string]: any;
  }>;
}

/** Global alana enjekte edilen snapshot fonksiyonu. */
export interface EventSnapshotFn {
  (
    el: EventTarget,
    opts?: { includeOptions?: boolean }
  ): TEventSnapshot | null;
}

/**
 * globalThis.eventRestore(el, snap):
 * ---------------------------------------------------------------------------
 * Snapshot'tan geri yükler.
 *
 * - Her eventType için listelenen her kaydı dolaşır
 * - `id` önce globalThis.getFnById(id) ile çözümlenir:
 *   - Eğer id string ve globalThis.TfunctionRegistry varsa oradan fonksiyon
 *     alınır
 *   - Aksi halde numeric olarak lokal havuzdan çekilir
 * - Fonksiyon bulunursa el.addEventListener(type, fn, rec.o) ile tekrar bağlanır
 *
 * Bu mekanizma Tdom.restoreEvents gibi üst seviye API'lerle entegre olur.
 * Tüm event handler fonksiyonlarını tamamen JSON üzerinden gidip geri geri
 * takabilmeyi sağlar. fileciteturn3file0
 */
export interface EventRestoreFn {
  (
    el: EventTarget,
    snap: TEventSnapshot | null | undefined
  ): void;
}

/**
 * global genişletmeleri burada bildiriyoruz.
 * Not: bazı ortamlarda `window` = `globalThis`.
 */
declare global {
  /**
   * Patch sonrası debug amaçlı otomatik eklenen getter.
   * HTMLElement.prototype.eventList,
   * Document.prototype.eventList,
   * Window.prototype.eventList
   *
   * Bu getter bir Map döndürür (eventType → kopya kayıt listesi).
   * Dış dünya bu Map'i mutate ederse gerçek kaydı bozmaz çünkü shallow copy.
   */
  interface HTMLElement {
    readonly eventList: Map<string, TListenerRecord[]>;
  }
  interface Document {
    readonly eventList: Map<string, TListenerRecord[]>;
  }
  interface Window {
    readonly eventList: Map<string, TListenerRecord[]>;
  }

  /**
   * globalThis.getFnById(id): string veya number ID'den fonksiyon çözer.
   * - Önce TfunctionRegistry.getById(id) (eğer varsa)
   * - Sonra lokal numeric havuz (FN_POOL)
   */
  var getFnById: (id: string | number) => ((...args: any[]) => any) | undefined;

  /**
   * globalThis.eventSnapshot(el): Event kayıtlarını serileştirilebilir
   * formda döndürür.
   */
  var eventSnapshot: EventSnapshotFn;

  /**
   * globalThis.eventRestore(el, snap): Snapshot'taki ID'leri fonksiyonlara
   * çözüp yeniden addEventListener ile bağlar.
   */
  var eventRestore: EventRestoreFn;

  /**
   * Opsiyonel: TfunctionRegistry
   * Bu registry, string bazlı kalıcı id üretir.
   * eventHandling.js snapshot/restore sırasında buna bakar.
   * register(ns,name,fn)   → string id
   * getById(id)            → Function | undefined
   */
  interface TfunctionRegistryType {
    register(ns: string, name: string, fn: Function): string;
    getById(id: string): Function | undefined;
  }
  var TfunctionRegistry: TfunctionRegistryType | undefined;
}

/* ==========================================================================
 *  MODULE DEFAULT EXPORT
 * ========================================================================== */

/** Bu modul default export vermez; sadece named export'lar kullanılır. */
declare const _noDefault: undefined;
export default _noDefault;

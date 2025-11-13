/**
 * utils.d.ts
 * ---------------------------------------------------------------------------
 * Genel yardımcı fonksiyonlar, derin klonlama (deepCopy), akıllı deepMerge,
 * DOM ölçüm/yerleştirme yardımcıları, event snapshot/restore köprüsü ve
 * timing util'leri. Tüm tipler bu dosyada toplu olarak belgelenmiştir. fileciteturn131file0
 *
 * Bu modül şunları sağlar:
 *
 * 1. Tür testleri (isArr, isFn, isObj, ...)
 * 2. Math/string yardımcıları (clamp, lerp, pad, uid, ...)
 * 3. Nesne yardımcıları (pick, omit, mapObj, forEachObj, groupBy, ...)
 * 4. Eşitlik ve merge (equalShallow, equalDeep, mergeDeep, deepMerge)
 * 5. DOM kutu ölçümü ve hizalama (getRect, withinRect, _px, _num)
 * 6. Event snapshot / restore (snapshotEvents, restoreEvents) →
 *    DOM üzerindeki listener'ları saklayıp geri yükleyebilme. (eventHandling.js
 *    ile entegre: getEventMap / getFnById) fileciteturn131file0
 * 7. deepCopy() → (sahip/owner nesneleri yeniden yarat, DOM klonla,
 *    Enum / Ord proxy'lerini yeniden bağla, event handler'ları taşı)
 *    Bu; editor içindeki canlı elementleri "yeni bir instance" olarak
 *    çoğaltmak için ana mekanizmadır. fileciteturn131file0
 * 8. deepMerge() → ileri seviye merge stratejileri (array:'by','unique'...)
 * 9. debounce / throttle / defer / sleep gibi async yardımcılar
 *
 * Not: Bu d.ts runtime davranışını açıklamak için güçlü JSDoc içerir;
 * TS tarafında autocomplete / dokümantasyon olarak görünmesi amaçlanır.
 */

/* -------------------------------------------------------------------------
 * Basit yardımcı tipler
 * ---------------------------------------------------------------------- */

/**
 * Genel DOM rect yapısı (getBoundingClientRect benzeri) piksel cinsinden.
 */
export interface TRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/**
 * "defer()" çıktısı: Promise + dışarı açık resolve/reject.
 * Bu pattern async bekleyen iş akışlarını manuel tetiklemeye yarar.
 */
export interface TDefer<T = any> extends Promise<T> {
  /** Defer'i başarıyla sonlandır. */
  resolve(value: T): void;
  /** Defer'i hata ile sonlandır. */
  reject(reason?: any): void;
}

/* -------------------------------------------------------------------------
 * Tür test yardımcıları
 * ---------------------------------------------------------------------- */

/**
 * Array.isArray kısayolu. Type guard döner.
 */
export function isArr(v: any): v is any[];

/** typeof v === 'function' */
export function isFn(v: any): v is (...args: any[]) => any;

/** typeof v === 'string' */
export function isStr(v: any): v is string;

/**
 * Sonlu sayısal değer mi?
 * Number.isFinite ile kontrol edilir.
 */
export function isNum(v: any): v is number;

/** true/false mu tam olarak? */
export function isBool(v: any): v is boolean;

/**
 * v !== null && typeof v === 'object'
 * (array, function hariç değildir; salt "obj" kontrolü) */
export function isObj(v: any): v is Record<string, any>;

/**
 * Düz literal obje mi?
 * Object.getPrototypeOf(o) === Object.prototype (veya null) kontrolü yapılır. fileciteturn131file0
 */
export function isPlainObj(v: any): v is Record<string, any>;

/** Node instanceof check. */
export function isDomNode(v: any): v is Node;

/** Element instanceof check. */
export function isElement(v: any): v is Element;

/** Event instanceof check. */
export function isEventLike(v: any): v is Event;

/* -------------------------------------------------------------------------
 * Math & string yardımcıları
 * ---------------------------------------------------------------------- */

/** clamp(v, lo, hi) → lo <= v <= hi aralığına sıkıştırır. */
export function clamp(v: number, lo: number, hi: number): number;

/** Doğrusal enterpolasyon. a + (b-a)*t */
export function lerp(a: number, b: number, t: number): number;

/**
 * Yuvarlama yardımcıları.
 * p>0 ise belirli ondalık hassasiyetine yuvarlar.
 */
export function round(v: number, p?: number): number;
export function ceil(v: number, p?: number): number;
export function floor(v: number, p?: number): number;

/**
 * pad("5", 3) → "005"
 * pad(7, 4, ' ') → "   7"
 */
export function pad(str: string | number, len: number, ch?: string): string;

/**
 * Artan sıra id üretici.
 * ns verilirse "ns_1", yoksa "id_1" gibi döner. */
export function uid(ns?: string): string;

/** nextId("n") → "n_2" vs. uid alias'ı gibi davranır. */
export function nextId(ns?: string): string;

/* -------------------------------------------------------------------------
 * Nesne yardımcıları / koleksiyon traversal
 * ---------------------------------------------------------------------- */

/**
 * Objeye enumerable:false olarak property tanımlar.
 * (serialize edilmesin / for..in'de çıkmasın diye.) */
export function defineHidden<T extends object, K extends PropertyKey, V>(
  obj: T,
  key: K,
  val: V
): T & { [P in K]: V };

/**
 * Değerin nesne olduğundan emin ol.
 * Değilse TypeError fırlatır. Geriye aynı objeyi döner.
 */
export function ensureObj<T extends Record<string, any>>(v: any, name?: string): T;

/**
 * Tek değeri diziye sar.
 * null/undefined → [],
 * zaten array → shallow copy,
 * değilse → [v]. */
export function ensureArr<T = any>(v: T | T[] | null | undefined): T[];

/** pick({a:1,b:2,c:3},['a','c']) → {a:1,c:3} */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  ks: readonly K[]
): Pick<T, K>;

/** omit({a:1,b:2,c:3},['b']) → {a:1,c:3} */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  ks: readonly K[]
): Omit<T, K>;

export function entries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]>;
export function values<T extends object>(obj: T): Array<T[keyof T]>;
export function keys<T extends object>(obj: T): Array<keyof T & string>;

/**
 * mapObj({a:1,b:2}, (v,k)=>v*10) → {a:10,b:20}
 */
export function mapObj<T extends object, R = any>(
  obj: T,
  fn: (v: T[keyof T], k: keyof T & string) => R
): Record<string, R>;

/**
 * Evrensel forEach:
 * - Array → fn(v,i,arr)
 * - Map   → fn(v,key,map)
 * - Set   → fn(v,v,set)
 * - Object→ fn(v,key,obj)
 * fn false dönerse döngü erken kırılır. */
export function forEachObj<T>(
  obj: any,
  fn: (this: T, v: any, k: any, container: any) => boolean | void,
  thisArg?: T
): void;

/**
 * Sadece objenin own property'lerini (symbol dahil enumerable olanları)
 * gezer. false dönerse kırar. */
export function forEachOwn<T>(
  obj: any,
  fn: (this: T, v: any, k: any, container: any) => boolean | void,
  thisArg?: T
): void;

/**
 * forEachObj ama callback'e (key,value) olarak sırayla verir. */
export function forEachKV<T>(
  obj: any,
  fn: (this: T, k: any, v: any, container: any) => boolean | void,
  thisArg?: T
): void;

/**
 * groupBy(array, x=>x.type)
 * → Map<key, item[]>
 */
export function groupBy<T, K>(
  arr: T[],
  keyFn: (item: T) => K
): Map<K, T[]>;

/**
 * keyBy(array, x=>x.id)
 * → Map<key, item>
 */
export function keyBy<T, K>(
  arr: T[],
  keyFn: (item: T) => K
): Map<K, T>;

/* -------------------------------------------------------------------------
 * Eşitlik / kopyalama / merge
 * ---------------------------------------------------------------------- */

/**
 * equalShallow(a,b)
 * - sadece kendi enumerable anahtarlarını ve === karşılaştırmasını kullanır
 * - aynı anahtar seti ve aynı referans/değer varsa true döner. fileciteturn131file0
 */
export function equalShallow(a: any, b: any): boolean;

/**
 * equalDeep(a,b)
 * - Döngüsel referansları zayıf harita (WeakMap) ile ele alır
 * - Array / Object iç içe karşılaştırması yapar
 * - Object.is ile NaN eşitliğini de destekleyen kıyaslama kullanır. fileciteturn131file0
 */
export function equalDeep(a: any, b: any, seen?: WeakMap<any, any>): boolean;

/**
 * mergeDeep(target, ...sources)
 * - Plain object'ler için recursive merge
 * - Array'leri kopyalayarak atar
 * - Map/Set/Date/RegExp/TypedArray gibi tipleri klonlar
 * NOT: Bu, utils içi eski / basit derin merge implementasyonudur. deepMerge()
 * ise daha zengin stratejilere sahip modern versiyondur. fileciteturn131file0
 */
export function mergeDeep<T extends object>(target: T, ...sources: any[]): T;

/** mergeDeep alias'ı. */
export const merge: typeof mergeDeep;

/**
 * assignIfDefined(target,obj)
 * obj içindeki undefined olmayan alanları target'a kopyalar. */
export function assignIfDefined<T extends object, S extends object>(
  target: T,
  obj: S
): T & S;

/* -------------------------------------------------------------------------
 * DOM helpers
 * ---------------------------------------------------------------------- */

/**
 * _num(v)
 *   null/undefined → 0
 *   "12px" → 12
 *   "5.5"  → 5.5
 *   number → number
 *
 * Inline style değerlerini güvenli sayıya çevirme amaçlıdır. */
export const _num: (v: any) => number;

/**
 * _px(v)
 *   12   → "12px"
 *   12.4 → "12px" (Math.round)
 *   null → "0px"
 *
 * Pozisyonlama / boyutlandırma setter'larında kullanılır. */
export const _px: (v: any) => string;

/**
 * getRect(el)
 * el.getBoundingClientRect() sonucunu
 * {left,top,width,height,right,bottom} olarak döner.
 * Eğer el geçersizse 0'lı kutu döner. */
export function getRect(el: Element | null | undefined): TRect;

/**
 * withinRect(x,y,rect)
 * x,y belirtilen dikdörtgen içinde mi?
 */
export function withinRect(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number }
): boolean;

/* -------------------------------------------------------------------------
 * deepCopy (canlı owner klonlama, DOM adopt etme, event taşıma)
 * ---------------------------------------------------------------------- */

/**
 * deepCopy / deepClone davranışını ayarlayan "ownerPolicy".
 *
 * mode:
 *  - 'auto'     : mantıklı yolu otomatik seç (clone(), ctor(...), toMinJSON/...
 *                 veya copy()).
 *  - 'clone'    : varsa obj.clone({...}) kullan.
 *  - 'ctor'     : ctor argümanlarını tahmin edip new obj.constructor(...).
 *  - 'minjson'  : obj.toMinJSON() + fromMinJSON(...) roundtrip.
 *  - 'copy'     : obj.copy({...}) kullan.
 *
 * sanitizeId:
 *   true ise toMinJSON()'dan gelen id sahası silinir ki klon benzersiz olsun.
 *
 * parent:
 *   'auto' ise yeni klonun DOM'u source.el.parentElement altına yerleştirilir.
 *   ya da belirli bir Element verilebilir.
 */
export interface DeepCopyOwnerPolicy {
  mode?: 'auto' | 'clone' | 'ctor' | 'minjson' | 'copy';
  sanitizeId?: boolean;
  parent?: 'auto' | Element | null;
}

/**
 * Event bridge entegrasyonu.
 * eventHandling.getEventMap(el) → Map<type,[{rid,id,listener,...}]>
 * eventHandling.getFnById(id)  → orijinal handler fonksiyonunu döndürür.
 *
 * deepCopy bunları kullanarak eski DOM node'un event listener'larını
 * yeni DOM node'una yeniden eklemeye çalışır. fileciteturn131file0
 */
export interface DeepCopyEventHandling {
  getEventMap?: (el: Element | EventTarget) => Map<string, any[]> | null | undefined;
  getFnById?: (id: any) => ((...args: any[]) => any) | undefined;
  classRegistry?: any;
}

/**
 * deepCopy opsiyonları.
 *
 * skipKeys:
 *   Kopyalanırken asla taşınmaması gereken property isimleri.
 *   (owner,parent,el,style,... gibi canlı runtime pointer alanları.) fileciteturn131file0
 *
 * proxyPolicy:
 *   - 'serialize': Proxy benzeri karmaşık nesneleri toMinJSON/minJSON roundtrip
 *                  ederek kopyalamaya çalış.
 *   - 'shallow'  : Proxy nesnesini doğrudan aynı referansla bırak.
 *   - 'error'    : Böyle bir şeye rastlanırsa hata fırlat.
 *
 * enumPolicy / ordPolicy (tek alan olarak enumPolicy kullanılıyor):
 *   Enum / Ord proxy'lerini nasıl yeniden bağlayacağını belirler.
 *   'auto' genelde base.bindTo(owner,key,...) gibi mantıklı yeniden bağlamayı
 *   dener. Eğer bağlayamazsa JSON benzeri nötr değer dönebilir. fileciteturn131file0
 *
 * hydrateOwner:
 *   true ise yeni owner instance'ına source içeriği hydrate() / merge() veya
 *   alan kopyalama yoluyla aktarılır.
 *
 * equalizeDomBox:
 *   true ise yeni DOM node'u (klon) kaynakla aynı left/top/width/height
 *   inline style değerlerini alır. Bu sayede görsel olarak aynı yerde
 *   spawn olur. fileciteturn131file0
 *
 * copyDomEvents:
 *   'auto' ya da custom (srcEl,dstEl)=>void fonksiyonu. 'auto' ise,
 *   eventHandling entegrasyonu denenir; olmazsa element.__events gibi
 *   yerel alanlardan handler'lar kopyalanır. fileciteturn131file0
 */
export interface DeepCopyOptions {
  skipKeys?: Array<string | symbol>;
  proxyPolicy?: 'serialize' | 'shallow' | 'error';

  ownerPolicy?: DeepCopyOwnerPolicy;

  enumPolicy?: 'auto' | 'bind' | 'factory' | 'value' | 'proxy';
  enumValueMode?: 'json' | 'primitive';

  enumBindTo?: any;
  ordBindTo?: any;
  enumFactoryOf?: ((o: any) => any) | null;
  ordFactoryOf?: ((o: any) => any) | null;
  enumBindCtx?: any;
  ordBindCtx?: any;

  hydrateOwner?: boolean;
  hydrateSkip?: Array<string | symbol>;

  equalizeDomBox?: boolean;
  copyDomEvents?: 'auto' | ((src: Element | EventTarget, dst: Element | EventTarget) => void);

  eventHandling?: DeepCopyEventHandling;
}

/**
 * deepCopy varsayılanları (runtime'da değiştirilebilir).
 * deepCopy.config(partial) ile global varsayılanları güncelleyebilirsin. fileciteturn131file0
 */
export const DeepCopyDefaults: DeepCopyOptions;

/**
 * deepCopy(root, options)
 *
 * - Kompleks nesneleri (owner nesneleri, DOM elementleri, Map/Set, Date,
 *   ArrayBuffer, Enum/Ord proxy'leri vs.) akıllıca kopyalar.
 * - UI'daki canlı bir elemanı çoğaltıp aynı parent içine, aynı konum/stilde
 *   yeni bir kopya "spawn" etmek için kullanılır.
 * - Event listener'ları da mümkünse yeni DOM'a takar. fileciteturn131file0
 */
export function deepCopy<T = any>(root: T, options?: Partial<DeepCopyOptions>): T;

/** deepCopy alias'ı. */
export const deepClone: typeof deepCopy;

/* -------------------------------------------------------------------------
 * Event snapshot / restore
 * ---------------------------------------------------------------------- */

/**
 * snapshotEvents(el)
 * DOM node'un üstündeki event listener'larını yakalar ve taşınabilir
 * bir snapshot objesi döndürür. Eğer eventHandling.getEventMap
 * kullanabiliyorsa 'eventMap' modunda id tabanlı saklar; yoksa
 * ham listener fonksiyonlarını da saklayabilir. fileciteturn131file0
 */
export function snapshotEvents(
  el: Element | EventTarget | null | undefined
): any;

/**
 * restoreEvents(sourceOrSnapshot, targetEl)
 * snapshotEvents sonucu (veya başka bir kaynak element) kullanılarak
 * targetEl'e addEventListener ile handler'lar yeniden eklenir. */
export function restoreEvents(
  sourceOrSnapshot: any,
  targetEl: Element | EventTarget | null | undefined
): void;

/* -------------------------------------------------------------------------
 * deepMerge (zengin strateji)
 * ---------------------------------------------------------------------- */

/**
 * deepMerge'in davranışını kontrol eden varsayılanlar.
 *
 * array:
 *   'replace' : kaynak diziyi doğrudan al
 *   'concat'  : hedef + kaynak ekle
 *   'unique'  : hedef + kaynak ama aynı değerleri tekrar etme
 *   'by'      : kimlik alanına göre (arrayBy) birleştir
 *
 * map:
 *   'merge'   : Map içindeki her anahtar için deepMerge uygula
 *   'replace' : kaynak Map'i direkt al
 *
 * set:
 *   'union'   : Set birleşimi
 *   'replace' : kaynak Set'i direkt al
 *
 * preferSourceInstance:
 *   Plain olmayan objelerde (class instance vs.) kaynak instance'ı mı
 *   kullanayım yoksa hedefi mi hydrate edeyim?
 *
 * customizer(dstVal, srcVal, key, path, opts):
 *   kendi birleştirme mantığını inject etmek için hook. Eğer undefined
 *   harici bir şey döndürürsen o değer direkt kullanılır. fileciteturn131file0
 */
export interface DeepMergeConfig {
  array?: 'replace' | 'concat' | 'unique' | 'by';
  arrayBy?: string | ((item: any) => any);
  map?: 'merge' | 'replace';
  set?: 'union' | 'replace';
  preferSourceInstance?: boolean;
  customizer?: (
    dstVal: any,
    srcVal: any,
    key: string,
    path: string[],
    opts: DeepMergeConfig
  ) => any;
}

/**
 * Global deepMerge varsayılanları.
 * deepMerge.config(partial) bunları günceller. */
export const DeepMergeDefaults: DeepMergeConfig;

/**
 * deepMerge(target, ...sources)
 * - Plain objelerde recursive merge
 * - Array/Map/Set'te yukarıdaki stratejiye göre birleştir
 * - Class instance'larında mümkünse .merge()/.hydrate() çağırır
 * - TypedArray, Date, RegExp vb. türleri klonlar
 *
 * Dönüş değeri genelde target referansıdır. Eğer kaynak tamamen farklı
 * tipteyse yeni bir referans dönebilir. fileciteturn131file0
 */
export function deepMerge<T>(target: T, ...sources: any[]): T;

/**
 * deepMergeNew(...sources)
 * Boş bir {} ile başlayıp sources'ı deepMerge ederek yeni bir obje döndürür.
 * target mutasyonunu istemediğin durumda kullanışlıdır.
 */
export function deepMergeNew(...sources: any[]): any;

/**
 * deepMerge.config(partial)
 * Global varsayılan stratejiyi günceller.
 */
export namespace deepMerge {
  function config(partial?: Partial<DeepMergeConfig>): typeof deepMerge;
}

/* -------------------------------------------------------------------------
 * Timing / async yardımcıları
 * ---------------------------------------------------------------------- */

/** sleep(ms) → Promise<void> */
export function sleep(ms: number): Promise<void>;

/**
 * defer()
 * Promise + dışarı açık resolve/reject döndürür.
 *
 * Örnek:
 *   const d = defer<string>();
 *   setTimeout(()=> d.resolve("done"), 1000);
 *   await d; // "done"
 */
export function defer<T = any>(): TDefer<T>;

/**
 * debounce(fn,ms)
 * Son çağrıdan sonra ms geçene kadar bekler, sonra fn çağrılır.
 * Yeni çağrı gelirse önceki timer resetlenir.
 */
export function debounce<Fn extends (...args: any[]) => any>(
  fn: Fn,
  ms?: number
): (...args: Parameters<Fn>) => void;

/**
 * throttle(fn,ms)
 * fn'i en fazla ms arayla bir kez çağır.
 * Aradaki çağrılar son argümanları hatırlanır ve pencere dolunca tek
 * seferde çalıştırılır. */
export function throttle<Fn extends (...args: any[]) => any>(
  fn: Fn,
  ms?: number
): (...args: Parameters<Fn>) => void;

/* -------------------------------------------------------------------------
 * Runtime config / global resolver
 * ---------------------------------------------------------------------- */

/**
 * deepCopy.config(partial)
 * Global DeepCopyDefaults'u mutate eder ve aynı deepCopy fonksiyonunu
 * geri döner (chain-style kullanım). */
export namespace deepCopy {
  function config(partial?: Partial<DeepCopyOptions>): typeof deepCopy;
}

/**
 * resolveGlobal("window.Some.ns")
 * globalThis üzerinden path çözmeye çalışır.
 * path boş/verilmezse globalThis'in kendisini dönebilir. */
export function resolveGlobal(path?: string): any;

/**
 * makeUid("u")
 * => "u_<base36timestamp>_<random6>"
 * Hızlı benzersiz id üretimi (örn. DOM node id'si). */
export function makeUid(prefix?: string): string;

/* -------------------------------------------------------------------------
 * SKIP listeleri
 * ---------------------------------------------------------------------- */

/**
 * deepCopy sırasında kopyalanmaması gereken alanlar için varsayılan kara liste.
 * owner,parent,root,layer,el,style,event emitter alanları, vs. içerir. fileciteturn131file0
 */
export const SKIP_KEYS_DEFAULT: string[];

/**
 * hydrate aşamasında atlanacak alanlar (özellikle canlı DOM alanları:
 * childrenEls, nodeType, tagName, vb.). SKIP_KEYS_DEFAULT üzerine kuruludur. fileciteturn131file0
 */
export const SKIP_HYDRATE_DEFAULT: string[];

/* -------------------------------------------------------------------------
 * Ek alias'lar
 * ---------------------------------------------------------------------- */

/**
 * deepClone = deepCopy alias'ı.
 * merge      = mergeDeep alias'ı.
 * _px/_num   : style numeric helper'ları.
 *
 * Bu dosya default export vermez; tüm yardımcılar named export'tur. fileciteturn131file0
 */

export {}; // (module is a TS module, no global augmentation)

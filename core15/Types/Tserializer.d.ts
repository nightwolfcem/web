/**
 * Tserializer.d.ts
 * ---------------------------------------------------------------------------
 * Evrensel serialize / deserialize katmanı. fileciteturn129file0
 *
 * Bu sınıfın görevi:
 *
 * 1. Nesneleri "JSON-friendly" minimale indirgemek (toMin / toMinDoc / toGraphDoc)
 *    - Döngüsel referansları ve shared referansları ($ref) ile korur.
 *    - Date, Map, Set, Error, DOMRect, DOM Element, ArrayBuffer, TypedArray,
 *      BigInt, NaN, ±Infinity gibi özel türleri kayıpsız paketler.
 *    - Enum / Ord instance'larını { type:'Enum'|'Ord', args:[BaseName, value] }
 *      şeklinde kompakt işaretleyiciyle kaydeder ve geri açarken base.bindTo
 *      vb. ile yeniden bağlar. (Enum/Ord bindTo entegrasyonu) fileciteturn129file0
 *
 * 2. Tekrar canlandırmak (fromMin / fromMinDoc / fromGraphDoc)
 *    - Sınıf bilgisini (constructor) otomatik çözmeye çalışır:
 *      globalThis.CLASS.find(name, ns) → new C(...ctorArgs)
 *    - Eğer sınıfın rebindSaved() / afterRevive() metodları varsa çağırır.
 *      Böylece runtime'taki sinir uçları (event emitter, reactive pointer vs.)
 *      geri takılır. fileciteturn129file0
 *
 * 3. Policy tabanlı filtreleme
 *    - mode:'optOut' (varsayılan)  → her property serileşir, bazıları hariç
 *    - mode:'optIn'               → sadece includeProps listesinde olanlar
 *    - includeProps / excludeProps / includeClasses / elementOnly ile
 *      hangi alanların yazılacağı çok ince ayarlanır.
 *    - DOM düğümleri, Event nesneleri, fonksiyonlar gibi runtime-only şeyleri
 *      otomatik atlar. fileciteturn129file0
 *
 * 4. Event köprüsü
 *    - toJSON_withEvents() / fromJSON_withEvents() / attachEvents() / restoreEvents()
 *    - Bir DOM elementinin üstündeki event listener haritasını snapshotlayıp
 *      ($ev) dump'a yazar ve geri yüklerken yeniden addEventListener yapar.
 *    - globalThis.TeventBridge.snapshot/restore veya globalThis.getEventMap,
 *      globalThis.getFnById ile haberleşir. Bu sayede canlı interaktif UI
 *      sahnesi export/import yapılabilir (ör. editor state'i kaydedip tekrar
 *      açınca click handler'ların geri gelmesi). fileciteturn129file0
 *
 * 5. Ek formatlar
 *    - toMinDoc()/fromMinDoc() : atom table (string sıkıştırma) destekli "doc".
 *    - toGraphDoc()/fromGraphDoc(): graph snapshot
 *         { v:1, cl:[[ns,name],...], nodes:[[classIdx,id,props],...],
 *           edges:[[fromId,key,toId],...], ctr:[[id,...ctorArgsMin],...],
 *           roots:[id,...] }
 *      Bu format shared-references + sınıf hiyerarşisini açıkça taşır,
 *      büyük sahnelerde diff/merge yapmak için idealdir. fileciteturn129file0
 *
 * 6. Yardımcı kısayollar
 *    - serializeMin(), deserializeMin() ...
 *    - serializeDoc(), deserializeDoc() ...
 *    Bunlar tek satırda yeni bir Tserializer oluşturup uygun yöntemi çağırır.
 *
 * Özet kullanım:
 *
 *   const S = new Tserializer({
 *     ns: 'editor',
 *     policy: {
 *       mode: 'optOut',
 *       excludeProps: { Telement: ['el','dom','__proxy__'] },
 *       elementOnly: true // DOM-heavy objelerde riskli alanları at
 *     },
 *     events: { enabled: true } // event listener snapshot/import aktif
 *   });
 *
 *   // ---> hafif dump
 *   const min   = S.toMin(sceneRoot);
 *   const again = S.fromMin(min);
 *
 *   // ---> persist için doküman
 *   const doc   = S.toMinDoc(sceneRoot);
 *   const back  = S.fromMinDoc(doc);
 *
 *   // ---> tam JSON + event'ler
 *   const j     = S.toJSON_withEvents(uiRoot);
 *   const live  = S.fromJSON_withEvents(j);
 */

export interface TserializerPolicy {
  /**
   * 'optOut':
   *   Varsayılan. Objede gördüğümüz tüm alanları yazarız ama
   *   excludeProps[...] veya elementOnly ile bazılarını filtreleriz.
   *
   * 'optIn':
   *   Sadece includeProps[ClassName] içindeki alanları yazarız.
   *   Eğer includeClasses ClassName'i içeriyorsa, o sınıf için yine de
   *   tüm alanları alabiliriz.
   */
  mode?: 'optOut' | 'optIn';

  /**
   * Sınıf adı → dahil edilecek prop adları dizisi.
   * Yalnızca mode:'optIn' için anlamlıdır (beyaz liste).
   */
  includeProps?: Record<string, string[]>;

  /**
   * Sınıf adı → hariç tutulacak prop adları dizisi.
   * mode:'optOut' durumunda kullanılır (kara liste).
   * elementOnly=true ise DEFAULT_EXCLUDES ('el','dom','htmlObject','__proxy__')
   * otomatik olarak eklenir. fileciteturn129file0
   */
  excludeProps?: Record<string, string[]>;

  /**
   * 'optIn' modundayken bile bu sınıflar tam olarak serialize edilsin
   * (yani includeProps sınırını genişlet).
   */
  includeClasses?: string[];

  /**
   * true ise DOM/tabanlı sahnelerde yalnızca "element ile ilgili"
   * alanları serialize et, ağır runtime pointer / proxy alanlarını at.
   */
  elementOnly?: boolean;
}

/**
 * DOM snapshot ayarları.
 * - enabled       : true ise serialize ederken Element nodelarını da işler
 * - preserveHTML  : innerHTML string olarak kaydedilir (örn. tasarım araçlarında)
 * - attributes    : element.getAttribute(...) değerleri kaydedilir, fakat
 *                   inline "onClick" gibi event attribute'ları filtrelenir. fileciteturn129file0
 */
export interface TserializerDomOpts {
  enabled?: boolean;
  preserveHTML?: boolean;
  attributes?: boolean;
}

/**
 * Atom tablosu (string sıkıştırma) ayarları.
 * enabled  : true ise tekrar eden string'leri tabloya alır.
 * minLen   : tabloya girecek string için min. uzunluk
 * minFreq  : tabloya girecek string için min. tekrar sayısı
 */
export interface TserializerAtomsOpts {
  enabled?: boolean;
  minLen?: number;
  minFreq?: number;
}

/**
 * Event köprüsü ayarları.
 * enabled : true ise toJSON_withEvents() / fromJSON_withEvents() esnasında
 *           DOM üzerindeki event listener haritası da ($ev) snapshot'a
 *           eklenir ya da geri yüklenir. fileciteturn129file0
 */
export interface TserializerEventsOpts {
  enabled?: boolean;
}

/**
 * Tserializer kurucu opsiyonları.
 *
 * respectObjectMinJSON :
 *   Eğer objenin kendi toMinJSON() metodu varsa onu kullan.
 *
 * respectObjectJSON :
 *   Eğer true yapılırsa objenin toJSON() çıktısını da kabul eder
 *   (aksi halde toJSON() runtime-logic içindir diye görmezden gelinir).
 *
 * warnOnIgnoredObjectJSON :
 *   respectObjectJSON=false iken bir objede toJSON() bulunduysa
 *   console.warn() yapabilir (debug amaçlı).
 *
 * pool / rebind :
 *   pool=true  → shared refs için $ref havuzu oluştur.
 *   rebind=true→ fromMin() sonrasında instance.rebindSaved?.() vb.
 *                lifecycle hook'larını çağırarak canlı bağlantıları geri tak.
 *
 * ns :
 *   Function registry ve benzeri yerlerde kullanılacak namespace
 *   (ör. TfunctionRegistry.idOf(fn, ns, ...)).
 *
 * tag :
 *   'type' | 'className' | 'both' | 'none'
 *   Nesnenin sınıf bilgisini dökümana nasıl yerleştireceğini belirler.
 *   Örn. 'both' → { $type:'MyClass', $className:'MyClass', ... } gibi.
 *
 * dom / atoms / events / policy :
 *   Ayrıntıları kendi arayüzlerinde anlatıldı.
 *
 * includeSourceOnSerialize :
 *   Fonksiyonları { $fnsrc:"function(...) {...}" } şeklinde düz JS source
 *   olarak da paketlemeye izin verir (güvenlik/rehydrate maliyetine dikkat).
 *
 * allowSourceEval :
 *   fromMin() sırasında $fnsrc kodunun Function(...) ile eval edilmesine
 *   izin verir. Varsayılan kapalıdır (güvenlik). fileciteturn129file0
 *
 * initSym :
 *   Graph snapshot (toGraphDoc) için ctor argümanlarını bulurken bakılan
 *   sembol/alan. (CLASS.__SYM_INIT tarzı internal imza.)
 */
export interface TserializerOpts {
  respectObjectMinJSON?: boolean;
  respectObjectJSON?: boolean;
  warnOnIgnoredObjectJSON?: boolean;
  pool?: boolean;
  rebind?: boolean;
  atoms?: TserializerAtomsOpts;
  dom?: TserializerDomOpts;
  policy?: TserializerPolicy | null;
  ns?: string;
  tag?: 'type' | 'className' | 'both' | 'none';
  events?: TserializerEventsOpts;
  includeSourceOnSerialize?: boolean;
  allowSourceEval?: boolean;
  initSym?: any;
  /**
   * Opsiyon setini genişletmek isteyen caller kendi ekstra alanlarını da
   * koyabilir. Bu yüzden index signature tanımlıyoruz.
   */
  [key: string]: any;
}

/**
 * MinDoc çıktısı yapısı.
 *
 * Eğer atoms.enabled === false ise:
 *   { v:1, data: <toMin(value)> }
 *
 * Eğer atoms.enabled === true ise:
 *   {
 *     v:1,
 *     a:{ s: string[] },   // string atom tablosu
 *     data: <toMin(value)> // yerde atom referansları ($s:index) var
 *   }
 */
export interface TserializerMinDoc {
  v: number;
  a?: { s: string[] };
  data: any;
}

/**
 * GraphDoc çıktısı yapısı.
 *
 * cl   : [[ns,name], ...] sınıf tablosu. Her node bu tablo üzerinden classIdx
 *        ile sınıfına referans verir.
 * nodes: [ [classIdx:number, id:number, propsRecord:object], ... ]
 * edges: [ [fromId:number, key:string, toId:number], ... ]
 * ctr  : [ [id:number, ...ctorArgsMin], ... ]
 * roots: [id:number, ...] kök node id'leri.
 *
 * Bu format büyük sahnelerde "hangi instance hangi property ile kime bağlı"
 * bilgisini açıkça tutar. fromGraphDoc() bu tabloyu okuyup tekrar canlı
 * instance ağacı kurar, ctor argümanlarını uygular ve sonra her instance
 * için rebindSaved()/afterRevive() çağırmaya çalışır. fileciteturn129file0
 */
export interface TserializerGraphDoc {
  v: number;
  cl: any[];
  nodes: any[];
  edges: any[];
  ctr: any[];
  roots: any[];
}

/**
 * Serializer'ın codec registry'si için basit tip.
 * - registerCodec(nameOrClass, {toMin,fromMin}) ile yeni tip codec eklenir.
 * - get(nameOrClass) ile runtime'da geri okunur. fileciteturn129file0
 */
export interface TserializerCodecRegistry {
  byName: Map<string, { toMin: (...args:any[])=>any; fromMin: (...args:any[])=>any }>;
  register(
    nameOrClass: any,
    io: { toMin: (value:any, self:Tserializer, ctx?:any)=>any;
          fromMin: (min:any, self:Tserializer, ctx?:any)=>any; }
  ): this;
  get(
    nameOrClass: any
  ): { toMin: (value:any, self:Tserializer, ctx?:any)=>any;
       fromMin: (min:any, self:Tserializer, ctx?:any)=>any; } | null;
}

/**
 * Dahili ctx yapısı (pool / $ref takibi için). Dışarı açmak zorunlu değil
 * ama tip yardımı için tanımlıyoruz. fileciteturn129file0
 */
export interface TserializerCtx {
  pool: boolean;
  seen: Map<any, number>;
  rev: Map<number, any>;
  nextId: number;
}

/**
 * Tserializer ana sınıfı.
 *
 * Not: runtime'da `export const Tserializer = CLASS(class Tserializer {...})`
 * şeklinde tanımlanıyor, ardından `export default Tserializer`. d.ts tarafında
 * biz bunu doğrudan `class Tserializer` olarak ilan ediyoruz ve default
 * export'u aynı referansa yönlendiriyoruz.
 */
export class Tserializer {
  /** Aktif opsiyonlar (ctor sırasında normalize edilir). */
  opts: TserializerOpts;

  /** Codec registry (Date, Map, Set, Enum/Ord vb. için hazır codec'ler). */
  registry: TserializerCodecRegistry;

  /** Statik hook noktaları (gelişmiş kullanıcılar için). */
  static hooks: Record<string, any>;

  /**
   * Statik yardımcı: objeyi toJSON_withEvents ile serialize eder
   * (events.enabled=true konfigi ile yeni bir Tserializer yaratır).
   */
  static toJSON_withEvents(obj: any, ctx?: any): any;

  /**
   * Statik yardımcı: fromJSON_withEvents ile geri açar ve event listener
   * haritasını (varsa $ev) restore eder. */
  static fromJSON_withEvents(min: any, ctx?: any): any;

  /** Statik yardımcı: objenin event listener map'ini min içine $ev olarak yazar. */
  static attachEvents(min: any, obj: any): any;

  /** Statik yardımcı: min.$ev bilgisini obj.el üzerine yeniden bağlar. */
  static restoreEvents(obj: any, min: any): void;

  constructor(opts?: TserializerOpts);

  /* ---------------------------------------------------------------------
   * Policy / namespace
   * ------------------------------------------------------------------ */

  /**
   * Serileştirme policy'sini (mode, excludeProps, includeProps, ...) değiştirir.
   * chainable.
   */
  setPolicy(p: TserializerPolicy | null | undefined): this;

  /**
   * Bu serializer'ın namespace'ini değiştirir. (TfunctionRegistry.idOf vb. için.)
   * chainable.
   */
  setNamespace(ns: string): this;

  /* ---------------------------------------------------------------------
   * Adapter / Ctor köprüsü  (JSON köprüsü)
   * ------------------------------------------------------------------ */

  /**
   * Belirli bir className için adaptör kaydet:
   *   toJSON(value, ctx)  → düz JSON
   *   fromJSON(data, ctx) → canlı nesne
   *
   * Bu mekanizma "tam JSON dump" (toJSON/fromJSON) yolunda kullanılır,
   * toMin() hattından bağımsızdır.
   * chainable.
   */
  registerAdapter(className: string, adapter: any): this;

  /** registerAdapter'ın tersi. */
  unregisterAdapter(className: string): this;

  /**
   * className → ctor map'i.
   * fromJSON sırasında className eşleşirse new ctor(...)
   * ile canlı instance açmaya çalışır.
   * chainable.
   */
  registerCtor(className: string, ctor: (...args:any[])=>any): this;

  /** registerCtor'un tersi. */
  unregisterCtor(className: string): this;

  /* ---------------------------------------------------------------------
   * Codec Registry API (Min JSON)
   * ------------------------------------------------------------------ */

  /**
   * Belirli bir type / sınıf için özel codec kaydeder.
   * Örnek: Date, Map, Set, DOMRect, Enum, Ord vb. codec'ler builtin
   * olarak constructor'da _installBuiltins() ile eklenir.
   * chainable.
   */
  registerCodec(
    nameOrClass: any,
    io: { toMin: (value:any, self:Tserializer, ctx?:TserializerCtx)=>any;
          fromMin: (min:any, self:Tserializer, ctx?:TserializerCtx)=>any; }
  ): this;

  /* ---------------------------------------------------------------------
   * Ana yüksek seviye API
   * ------------------------------------------------------------------ */

  /**
   * toJSON(value,{policy?,pretty?})
   * -------------------------------
   * value → "JSON-friendly" plain object'e çevirir.
   * - İçeride aslında this.toMin(...) çalışır.
   * - Eğer {pretty:true} verirsen dönen obje JSON.parse(JSON.stringify(...))
   *   ile derin klonlanır ki devtools'ta rahat okunabilsin.
   *
   * NOT: events.enabled=false iken event listener bilgilerini dahil etmez.
   */
  toJSON(
    value: any,
    opts?: { policy?: TserializerPolicy | null; pretty?: boolean }
  ): any;

  /**
   * fromJSON(data)
   * --------------
   * toJSON() çıktısını geri açar.
   * İçeride this.fromMin(...) kullanılır.
   */
  fromJSON(data: any): any;

  /**
   * stringify(value,opts) = JSON.stringify(toJSON(value,opts)).
   */
  stringify(
    value: any,
    opts?: { policy?: TserializerPolicy | null; pretty?: boolean }
  ): string;

  /**
   * parse(text) = JSON.parse(text) → fromJSON(...).
   * Hata durumunda null döndürür (try/catch).
   */
  parse(
    text: string,
    opts?: { policy?: TserializerPolicy | null; pretty?: boolean }
  ): any;

  /* ---------------------------------------------------------------------
   * Event bridge (instance)
   * ------------------------------------------------------------------ */

  /**
   * toJSON_withEvents(obj, ctx?)
   * ----------------------------
   * toJSON() benzeri ama this.opts.events.enabled=true ise,
   * obj.el üzerindeki event listener haritasını snapshotlayıp
   * sonuç içine $ev alanı olarak ekler.
   */
  toJSON_withEvents(obj: any, ctx?: any): any;

  /**
   * fromJSON_withEvents(min, ctx?)
   * ------------------------------
   * fromJSON() ile objeyi geri kurar.
   * Eğer min.$ev varsa ve obj.el varsa, globalThis.TeventBridge.restore
   * (veya globalThis.getFnById vb.) üzerinden event listener'ları yeniden
   * addEventListener ile bağlamaya çalışır. fileciteturn129file0
   */
  fromJSON_withEvents(min: any, ctx?: any): any;

  /**
   * attachEvents(min,obj)
   * ---------------------
   * min dump'ına obj.el üzerindeki event listener haritasını ($ev) gömer.
   * Eğer events.enabled değilse min aynen geri döner.
   */
  attachEvents(min: any, obj: any): any;

  /**
   * restoreEvents(obj,min)
   * ----------------------
   * eğer min.$ev varsa ve obj.el varsa bu haritayı kullanarak
   * event listener'ları yeniden kurar.
   */
  restoreEvents(obj: any, min: any): void;

  /* ---------------------------------------------------------------------
   * Minimal JSON hattı (graph/pool/$ref vs.)
   * ------------------------------------------------------------------ */

  /**
   * toMin(value)
   * ------------
   * "en küçük" şekil:
   * - Döngüler / shared referanslar için { $ref:id } kullanır.
   * - Özel türleri { type:'Map', args:[...] } gibi codec'lere çevirir.
   * - DOM Element'i { type:'Element', args:[tag,attrs,html] } olarak paketler
   *   (opts.dom.enabled=true ise).
   * - Enum / Ord instance'larını { type:'Enum', args:[baseName,value] } olarak
   *   yazar ki tekrar açarken base.bindTo(...) ile alanlara yeniden takılabilsin.
   */
  toMin(value: any): any;

  /**
   * fromMin(min)
   * ------------
   * toMin() çıktısını tekrar canlı hale getirir.
   * Bu sırada:
   *  - className / $type / $className varsa global sınıf çözümü yapılır.
   *  - instance.rebindSaved?.() ve instance.afterRevive?.(...) tetiklenir
   *    (opts.rebind === true ise). Bu, UI sahnesinin pointer controller,
   *    history bağları vb. ilişkilerini yeniden kurmak için kritik. fileciteturn129file0
   */
  fromMin(min: any): any;

  /**
   * toMinDoc(value,{atoms?,minLen?,minFreq?})
   * ----------------------------------------
   * toMin(value) sonucunu bir "doküman" içine sarar.
   * Eğer atoms.enabled==true ise tekrar eden string'ler tabloya alınır
   * ve verinin içine { $s:index } referansları yazılır.
   *
   * Dönen yapı genelde localStorage/IndexedDB gibi persist katmanına
   * konur: { v:1, a:{s:[...]}, data:{...} }.
   *
   * Bu format Tpersist.save()/load() ile bire bir uyumludur. (Bkz. Tpersist) 
   */
  toMinDoc(
    value: any,
    aopts?: { atoms?: boolean; minLen?: number; minFreq?: number }
  ): TserializerMinDoc;

  /**
   * fromMinDoc(doc)
   * ---------------
   * toMinDoc() çıktısını geri açar.
   * Eğer doc.a.s varsa önce atom referansları çözülür (string tablosu),
   * sonra fromMin() çağrılır.
   */
  fromMinDoc(doc: TserializerMinDoc): any;

  /** Alias: tomindoc(...) = toMinDoc(...). */
  tomindoc(value: any, opts?: { atoms?: boolean; minLen?: number; minFreq?: number }): TserializerMinDoc;

  /** Alias: frommindoc(...) = fromMinDoc(...). */
  frommindoc(doc: TserializerMinDoc): any;

  /* ---------------------------------------------------------------------
   * Graph snapshot hattı
   * ------------------------------------------------------------------ */

  /**
   * toGraphDoc(value)
   * -----------------
   * Sahneyi graph olarak paketler:
   *  - Her instance'a benzersiz id verir.
   *  - classIndex tablosu (cl) ile tip bilgisini tutar.
   *  - props/edges ile object graph'ı açıkça yazar.
   *  - ctr dizisi ile her node'un ctor argümanlarını saklar (varsa).
   *
   * Bu format diff/merge/versiyonlama için uygundur.
   */
  toGraphDoc(value: any): TserializerGraphDoc;

  /**
   * fromGraphDoc(doc)
   * -----------------
   * toGraphDoc() çıktısını tekrar canlı modele çevirir.
   *  - cl tablosundan sınıf constructor'larını çözmeye çalışır
   *    (globalThis.CLASS.find(ns,name) fallback globalThis[name]).
   *  - ctr bilgisine göre new C(...args) dener, yoksa Object.create(C.prototype).
   *  - props ve edges ile alanları/ilişkileri tekrar kurar.
   *  - En sonda rebindSaved()/afterRevive() çağırır (opts.rebind=true ise).
   *
   * Dönen değer tek bir root ise direkt o instance; birden fazla root varsa
   * köklerin dizisi olabilir. (Bu yüzden dönüş tipi any). fileciteturn129file0
   */
  fromGraphDoc(doc: TserializerGraphDoc): any;

  /* ---------------------------------------------------------------------
   * Dahili yardımcılar (tip-yardım amaçlı public olarak ilan)
   * ------------------------------------------------------------------ */

  /** İç pool context'i yaratır ({pool,seen,rev,nextId}). */
  protected _mkCtx(): TserializerCtx;

  /** Bir objeye numeric id atar ($ref desteği için). */
  protected _idFor(o: any, ctx: TserializerCtx): number | null;

  /**
   * Sınıf adından gerçek ctor'ı çözmeye çalışır.
   * CLASS.find(ns,name) / globalThis[name] / this._ctorCache...
   */
  protected _resolveCtor(typeName: string | null): any;

  /** type + args çiftinden uygun instance inşa eder (ArrayBuffer, DataView...). */
  protected _constructByType(typeStr: string, args: any[]): any;

  /** Fonksiyonu { $fn:id } veya { $fnsrc:"source" } şeklinde paketler. */
  protected _packFn(fn: Function): any;

  /** { $fn:id } veya { $fnsrc:"..." } marker'ından tekrar fonksiyon üretir. */
  protected _unpackFn(marker: any): Function | null;

  /** Dahili built-in codec'leri, Enum/Ord codec'lerini vs. kaydeder. */
  protected _installBuiltins(opts: TserializerOpts): void;
}

/* ---------------------------------------------------------------------------
 * Yardımcı kısayol fonksiyonları
 * ------------------------------------------------------------------------ */

/**
 * serializeMin(v)
 * ---------------
 * new Tserializer().toMin(v)
 * Tek seferlik hızlı kullanım. */
export function serializeMin(v: any): any;

/** deserializeMin(m) = new Tserializer().fromMin(m) */
export function deserializeMin(m: any): any;

/**
 * serializeJSON(v,opts)
 * ---------------------
 * new Tserializer(opts).toJSON(v, opts)
 * pretty/policy ayarları ops üzerinden geçilebilir. */
export function serializeJSON(
  v: any,
  opts?: TserializerOpts
): any;

/** deserializeJSON(j,opts) = new Tserializer(opts).fromJSON(j) */
export function deserializeJSON(
  j: any,
  opts?: TserializerOpts
): any;

/** serializeGraph(v) = new Tserializer().toGraphDoc(v) */
export function serializeGraph(v: any): TserializerGraphDoc;

/** deserializeGraph(d) = new Tserializer().fromGraphDoc(d) */
export function deserializeGraph(d: any): any;

/**
 * serializeDoc(v,opts)
 * --------------------
 * new Tserializer(opts).toMinDoc(v, opts)
 * (atoms sıkıştırması dahil) */
export function serializeDoc(
  v: any,
  opts?: TserializerOpts
): TserializerMinDoc;

/** deserializeDoc(d) = new Tserializer().fromMinDoc(d) */
export function deserializeDoc(d: TserializerMinDoc): any;

/**
 * Default export runtime'da `export default Tserializer`.
 * Burada da aynı referansı dışarı veriyoruz. fileciteturn129file0
 */
declare const _default: typeof Tserializer;
export default _default;

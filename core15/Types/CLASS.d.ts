// CLASS.d.ts
// -----------------------------------------------------------------------------
// Bu dosya direkt olarak sağlanan core12/CLASS.js içeriğinden türetilmiştir.
// Hiçbir ek hayalî API eklenmedi; sadece orada gördüğümüz yüzey API'ler
// (CLASS namespace fonksiyonları, config, plugin loader ekosistemi,
// layered options sistemi, meta/id yardımcıları, augment edilen statikler vb.)
// açıklamalı ve tipli şekilde dökümanlaştırıldı.
//
// Bu dosya iki seviyeyi kapsar:
//
// 1. GLOBAL CLASS NESNESİ
//    - Registry (register/get/require/alias/...)
//    - Kimlik/id üretim yardımcıları (peekNext, parseId, getId, findById, setIdFormatter...)
//    - Meta yardımcıları (meta, metaOf, metaPeek, describe, parentsOf, parentsClean...)
//    - Hook sistemi (on('register'/'construct', ...))
//    - Plugin yükleyici (install/bindInstall/installMany, installMap, installBase,
//      getPluginProvider)
//    - Layered options (options/appOptions/runtimeOptions + opt/getConfig)
//    - Global injection (window.CLASS, globalThis.CLASS) + config yansıtma
//
// 2. CLASS tarafından sarmalanan sınıflara enjekte edilen STATİK alanlar/metotlar
//    (__CLASS_AUGMENT ile): $debug, $v, $meta, autoId(), define(), codec(), vb.
//
// Önemli Terimler:
//
// - "ns": namespace. Örn: "app://local/". Sınıfın hangi alan altında kayıtlandığını
//   temsil eder. CLASS.register ve CLASS.require bu ns bilgisini kullanır.
// - "$meta": her sınıf için tutulur. İçinde:
//    name: sınıfın görünen adı
//    idPrefix: id üretirken kullanılacak prefix (genelde sınıf adından türetilmiş)
//    caps: davranış kapasiteleri (selectable, movable, draggable, droppable, serializable)
//    defaults: varsayılan config/state parçaları
// - "id" formatı: CLASS_CONFIG.idFormat(ns,type,n) ile üretilebilen "type-n"
// - layered options: options() < appOptions() < runtimeOptions() sıralı birleşir.
//   `opt("x.y")` bu tabakaları merge edip tek noktadan okur.
//
// -----------------------------------------------------------------------------


/**
 * CLASS sisteminin global konfigürasyonu.
 * Bu obje runtime boyunca değişebilir (ör. CLASS.setIdFormatter bunu güncelleyebilir).
 */
export interface TClassConfig {
  /**
   * defaultNs:
   * Varsayılan namespace. Kodda `new URL('.', import.meta.url)` ile
   * hesaplanmaya çalışılıyor, eğer hata alınırsa 'app://local/' kullanılıyor.
   * Bu ns, CLASS.register gibi fonksiyonlarda sınıfın hangi alanda
   * kaydedileceğini belirler.
   */
  defaultNs: string;

  /**
   * idFormat(ns, type, n):
   * Global ID string üretici.
   * Varsayılan implementasyon: `${type}-${n}`
   * - ns: namespace
   * - type: sınıf tipi (genelde sınıf adı gibi)
   * - n: sayaç numarası
   */
  idFormat(ns: string, type: string, n: number): string;

  /**
   * privatePrefix:
   * Özel/gizli property isimlerini işaretlemek için kullanılan RegExp.
   * Örn. /^[_$]/ => "_" veya "$" ile başlayanlar "private" kabul edilebilir
   * (bazı serialize/clone araçları bunları atlayabilir).
   */
  privatePrefix: RegExp;

  /**
   * enforceTPrefix:
   * true ise her sınıf adı "T" ile başlamalı.
   */
  enforceTPrefix: boolean;

  /**
   * enforceCamelAfterT:
   * true ise "T" den sonraki ilk harf küçük olmalı (camelCase stili).
   * Örn. "Tlayer" ✅, "TLayer" ❌ (uyarı veya hata).
   */
  enforceCamelAfterT: boolean;

  /**
   * naming.mode:
   * İsimlendirme ihlali durumundaki davranış;
   * 'warn', 'error', ya da 'off'.
   * CLASS.__ensureTPrefix() içinde kullanılıyor.
   */
  naming: { mode: 'warn' | 'error' | 'off' };
}

/**
 * Sağlanan CLASS.js içinde export edilen sabit config nesnesi.
 */
export const CLASS_CONFIG: TClassConfig;


/**
 * CLASS içindeki meta bilgileri nesneye yapıştırmak için kullanılan Symbol.
 * Kodda: const __SYM_META = Symbol.for('T::__meta')
 * İçerik tipik olarak { ns, type, n, name } gibi kimlik bilgileri.
 * Bu Symbol doğrudan export edilmiyor ama CLASS.metaPeek(obj) bu bilgiyi okuyor.
 */
declare const __SYM_META: unique symbol;

/**
 * Nesnenin oluşturulurken aldığı orijinal constructor argümanlarını
 * (init args) saklamak için kullanılan Symbol.
 * Kodda: const __SYM_INIT = Symbol.for('T:init')
 *
 * CLASS.__SYM_INIT bu sembolü dışarı açıyor; böylece dışarıdan obj[CLASS.__SYM_INIT]
 * gibi erişim mümkün.
 */
export const __SYM_INIT: symbol;


// -----------------------------------------------------------------------------
// Augment edilen sınıflar için ortak meta yapısı
// -----------------------------------------------------------------------------

/**
 * Bir sınıf augment edildikten sonra ($meta doldurulduktan sonra)
 * tutulacak meta bilgisi.
 */
export interface TClassStaticMeta {
  /**
   * name:
   * Sınıfın görünen adı. Varsayılan: Wrapped.name veya "Tclass".
   */
  name: string;

  /**
   * idPrefix:
   * ID üretiminde kullanılacak önek.
   * Varsayılan: sınıf adından "T" başını kırpıp lowercase yapmak.
   * Örnek: "Tlayer" -> "layer"
   */
  idPrefix: string;

  /**
   * caps:
   * Bu sınıf örneklerinin ne yapabildiğini ifade eden capability bayrakları.
   * Bunlar UI davranış/izin katmanında kullanılır.
   *
   * - selectable: kullanıcı tarafından seçilebilir mi?
   * - movable: sahnede taşınabilir mi?
   * - draggable: pointer ile sürüklenebilir mi?
   * - droppable: başka şeyler bunun üstüne bırakılabilir mi?
   * - serializable: snapshot/serialize sürecinde bu nesne çıktıya dahil edilir mi?
   */
  caps: {
    selectable: boolean;
    movable: boolean;
    draggable: boolean;
    droppable: boolean;
    serializable: boolean;
    [key: string]: any;
  };

  /**
   * defaults:
   * Bu sınıf için varsayılan yapılandırma / stil / state parçaları.
   * Örneğin .styles gibi alt alanlar barındırabilir ve uygulama bootstrap
   * sırasında style manager'a yüklenebilir.
   */
  defaults: Record<string, any>;
}

/**
 * CLASS.__CLASS_AUGMENT(...) çağrısından sonra her sınıfın statik tarafına
 * eklenen alanlar/metotlar.
 *
 * Bu interface, augment sonrası "Wrapped" üzerinde beklenen statik API'yi
 * temsil eder. Bunlar instance'a değil, sınıfın kendisine aittir.
 */
export interface TAugmentedClassStatics {
  /**
   * $debug:
   * Geliştiriciye yardımcı bayrak.
   * Varsayılan false olarak atanır.
   */
  $debug: boolean;

  /**
   * $v:
   * Sürüm numarası gibi davranır. Varsayılan 1 atanıyor.
   * Bu hem debug hem serialize uyumluluğu için kullanılabilir.
   */
  $v: number;

  /**
   * $meta:
   * Sınıfa ait üst seviye meta bilgileri.
   * Eğer yoksa augment sırasında oluşturuluyor:
   * {
   *   name: <sınıf adı veya "Tclass">,
   *   idPrefix: <T sonrası lowercase>,
   *   caps: { selectable:true, movable:true, draggable:true, droppable:false, serializable:true },
   *   defaults: {}
   * }
   */
  $meta: TClassStaticMeta;

  /**
   * autoId(prefix?):
   * Bu sınıf için benzersiz bir id string üretir.
   * - prefix verilmezse $meta.idPrefix kullanılır.
   * - global bir counter (globalThis.__nsCounters[prefix]) artırılarak çalışır.
   *
   * Örnek çıktı: "layer12"
   */
  autoId(prefix?: string): string;

  /**
   * getId(o):
   * Verilen objenin o.id değerini döner.
   * Bu sınıfın objeleri tipik olarak bir "id" alanına sahiptir.
   */
  getId<T extends { id?: any }>(o: T): any;

  /**
   * setId(o, id):
   * Objeye bir id yazar (o.id = id) ve aynı objeyi geri döner.
   * Bu, serialize veya hydrate sonrası objeye kimlik atamada kullanılır.
   */
  setId<T extends { id?: any }>(o: T, id: any): T;

  /**
   * parentsOf(o):
   * Sınıfın kalıtım zincirini / parent listesini döndürür.
   * Kod içinde: o.$parents varsa slice() ile kopyalanıyor.
   * Bu, debug veya registry bilgisi için kullanışlıdır.
   */
  parentsOf(o: any): string[];

  /**
   * is(o):
   * Bu sınıfın bir örneği mi?
   * `o instanceof Wrapped` veya `o.constructor === Wrapped` benzeri kontrol yapılıyor.
   * true => o bu sınıfın (veya sarılmış halinin) instance'ı.
   */
  is(o: any): boolean;

  /**
   * define(meta):
   * Bu sınıfın $meta bilgisini (caps ve defaults dahil) merge eder.
   * - caps alanlarında mevcut caps üzerine yenileri bind edilir.
   * - defaults alanlarında mevcut defaults üzerine yeni alanlar bind edilir.
   *
   * Bu genelde sınıfın yeteneklerini bildirmek için kullanılır:
   *   MyClass.define({
   *     caps: { draggable:false, droppable:true },
   *     defaults: { styles: {...} }
   *   })
   */
  define(meta: Partial<TClassStaticMeta>): this;

  /**
   * codec(toMin?, fromMin?):
   * Sınıf için $codec tanımlar / günceller.
   * $codec = {
   *   toMin(obj): any;    // objeyi minimal JSON temsiline çevir
   *   fromMin(args): any; // minimal temsilden instance oluştur
   * }
   *
   * Eğer parametre verilmezse __ensureCodec(...) içindeki default
   * implementasyon kullanılır:
   * - toMin: genelde objeyi minimal argüman dizisine çevirir
   * - fromMin: argüman listesini new Wrapped(...args) ile geri kurar
   */
  codec(
    toMin?: (o: any) => any,
    fromMin?: (minArgs: any) => any
  ): this;

  /**
   * registerCodec(serializer):
   * Dış bir serializer servisine bu sınıfın codec'ini kaydeder.
   *
   * Beklenen serializer arayüzü:
   *   serializer.registerCodec(name, { toMin, fromMin })
   *
   * Burada name genelde sınıf adı ya da $meta.name.
   * Bu sayede global/harici serialize sistemi bu sınıfı tanır.
   */
  registerCodec(serializer: {
    registerCodec?: (name: string, codec: { toMin(o:any): any; fromMin(a:any): any }) => void;
    [key: string]: any;
  }): this;

  /**
   * toMinJSON(o):
   * Tekil bir objeyi sınıfın $codec.toMin fonksiyonu ile minimal JSON'a çevirir.
   */
  toMinJSON(o: any): any;

  /**
   * fromMinJSON(minArgs):
   * Sınıfın $codec.fromMin fonksiyonunu kullanarak minimal JSON'dan
   * yeni bir instance döndürür.
   */
  fromMinJSON(minArgs: any): any;

  /**
   * install(ctx):
   * Bu sınıfı verilen "ctx" ortamına entegre eder.
   *
   * ctx.serializer      -> varsa registerCodec ile bu sınıf codec'ini kaydeder
   * ctx.registry        -> varsa ctx.registry.registerType(this.name, this)
   * ctx.styles          -> eğer this.$meta.defaults.styles varsa,
   *                        ctx.styles.registerDefaults(name, defaults.styles) çağırmaya çalışır
   *
   * Bu tipik olarak uygulama boot sırasında tüm sınıfları tek tek kaydetmek için çağrılır.
   */
  install(ctx?: {
    serializer?: any;
    registry?: { registerType?: (n: string, C: any) => void };
    styles?: { registerDefaults?: (className: string, styleDef: any) => void };
    [key: string]: any;
  }): this;

  /**
   * use(ctx):
   * Çoklu sınıfı tek shot'ta kurulum yapmak için kısayol.
   * Kodda `(...asses||[Wrapped]).forEach(C => C.install(ctx))` gibi bir pattern var.
   * Yani:
   *   ctx.classes varsa onların hepsinde install(ctx) çalıştırır;
   *   yoksa sadece bu sınıfı install eder.
   */
  use(ctx?: {
    classes?: any[];
    serializer?: any;
    registry?: any;
    styles?: any;
    [key: string]: any;
  }): this;

  /** internal işaret: augment'in zaten uygulandığını belirtir. */
  __augmented?: boolean;
}

/**
 * CLASS(CLASS) çağrısından dönen şey: augment uygulanmış sınıf tipi.
 *
 * - Normal constructor signature'ını korur (new (...args) => instance)
 * - Statik tarafta TAugmentedClassStatics ekler.
 *
 * Not: Instance tarafı burada bilinçli olarak "any" çünkü CLASS.js içinde
 * verilen parçada instance prototipine eklenen özel metotlar gösterilmedi.
 * Yani burada yanlış bir prototip uydurmak yerine güvenli davranıyoruz.
 */
export type TAugmentedClass<Ctor extends new (...args: any[]) => any> =
  Ctor & TAugmentedClassStatics;


// -----------------------------------------------------------------------------
// CLASS ana fonksiyonu ve extendsWith
// -----------------------------------------------------------------------------

/**
 * extendsWith(Base, ...mixins):
 * Bir Base sınıfını bir veya daha fazla mixin ile birleştirir.
 * Uygulamada __copyStatics ve __copyProto ile hem statik alanlar
 * hem prototip metotları kopyalanıyor.
 *
 * Bu, klasik "mix-in" pattern'i: runtime'da bir sınıf yaratıp döndürüyor.
 */
export function extendsWith<BaseCtor extends new (...args: any[]) => any>(
  Base: BaseCtor,
  ...mixins: any[]
): BaseCtor & { [key: string]: any };

/**
 * CLASS(Cls, meta?):
 * Verdiğin sınıfı sarar:
 *  - İsim kurallarını kontrol eder (T ile başlamalı, camelCase uyarısı vs.)
 *  - ns bilgisini atar (ya parametre ile ya defaultNs)
 *  - init argümanlarını yakalamak için __SYM_INIT / __initWM mekanizmasını oluşturur
 *  - registry'ye kayıt eder
 *  - Hook'ları tetikler (construct, register)
 *  - $meta / $debug / $v / codec / install / use ... gibi statik yardımcıları
 *    __CLASS_AUGMENT üzerinden enjekte eder.
 *
 * Dönüşte orijinal constructor'ı kırmadan augment edilmiş sınıf döner.
 */
export function CLASS<Ctor extends new (...args: any[]) => any>(
  Cls: Ctor,
  meta?: Partial<{ ns: string; className: string }>
): TAugmentedClass<Ctor>;

/**
 * CLASS.__SYM_INIT:
 * Dışarı açılan init symbol referansı. Objelerin ilk oluşturulurken aldığı
 * argüman listesine bu sembol üstünden ulaşılabiliyor.
 */
export namespace CLASS {
  const __SYM_INIT: typeof __SYM_INIT;
}


// -----------------------------------------------------------------------------
// CLASS namespace içindeki yardımcılar / registry API
// -----------------------------------------------------------------------------

export namespace CLASS {
  /**
   * extends:
   * CLASS.extends === extendsWith
   */
  const extends: typeof extendsWith;

  /**
   * register(Ctor, ns?):
   * Bir sınıfı doğrudan registry'ye yazar.
   * - `Ctor.$ns` ve `Ctor.$parents` de ayarlanır.
   * - İsim kuralları (__ensureTPrefix) uygulanır.
   *
   * Bu, CLASS(Cls) ile otomatik yapılan kaydın manuel versiyonu gibi davranır.
   */
  function register<T extends Function>(Ctor: T, ns?: string): T;

  /**
   * get(ns, name): registry'den sınıfı getirir.
   * Yoksa null döner.
   */
  function get(ns: string | undefined, name: string): any | null;

  /**
   * has(ns, name): registry'de var mı?
   */
  function has(ns: string | undefined, name: string): boolean;

  /**
   * require(ns, name):
   * get(...) ile aynı ama bulunamazsa Error throw eder.
   * Bu, "bu sınıf OLMALI" durumları için kullanılır.
   */
  function require(ns: string | undefined, name: string): any;

  /**
   * list():
   * Registry'deki bütün anahtarları (ns|className) döner.
   */
  function list(): string[];

  /**
   * keys():
   * list() ile aynı, kısayol.
   */
  function keys(): string[];

  /**
   * entries():
   * Registry'yi [key, ctor] çiftleri olarak döner.
   * key genelde `${ns}|${className}`.
   */
  function entries(): Array<[string, any]>;

  /**
   * getId(obj):
   * Objede `id` alanı varsa döndürür, yoksa null döndürür.
   * Bu global yardımcı; instance üstündeki id erişiminden bağımsızdır.
   */
  function getId(obj: { id?: any } | null | undefined): any;

  /**
   * findById(id):
   * Global lookup yardımı.
   * - Eğer CLASS.byId varsa ve id anahtarını içeriyorsa onu döndürür.
   * - Eğer CLASS.byOrder varsa ve id number ise byOrder[id] döner.
   *
   * Not: CLASS.byId / CLASS.byOrder bu dosyada sadece varsayılmış store'lar,
   * dışarıdan bir yerde doldurulmaları bekleniyor.
   */
  function findById(id: any): any | null;

  /**
   * peekNext(ns, type):
   * İç sayaçlardan (ns|type bazlı) bir SONRAKİ sıra numarasını preview eder,
   * iç state'i kalıcı olarak artırmadan geri verir gibi davranır.
   *
   * Dosyada:
   *   return ((... __nsCounters.get(`${ns}|${type}`)) || 0) + 1;
   */
  function peekNext(ns: string, type: string): number | null;

  /**
   * parseId(id):
   * Farklı id string formatlarını parçalar.
   * Desteklenen pattern'ler (dosyada görülen regex'e göre):
   *   ns|Type#n
   *   ns|Type-n
   *   Type#n
   *   Type-n
   *
   * Dönüş:
   *   { ns?:string, type?:string, n?:number } veya { raw:string }
   */
  function parseId(id: any): { ns?: string; type?: string; n?: number; raw?: string } | null;

  /**
   * metaPeek(obj):
   * Objeye augment sırasında iliştirilen __SYM_META bilgisini (ns, type, n, name)
   * hızlıca döndürmeye çalışır.
   * Mutasyon yapmaz.
   *
   * Dönüş örneği:
   *   { name, type, n }
   * veya null.
   */
  function metaPeek(obj: any): { name?: string; type?: string; n?: number } | null;

  /**
   * describe(obj):
   * Objeyi insan-dostu özetler.
   * - id
   * - ns
   * - type
   * - order (yani meta içindeki n/sıra)
   *
   * Bunu metaPeek(obj) ve metaOf(obj) bilgilerini birleştirerek yapar.
   */
  function describe(obj: any): {
    id: any;
    ns: string | null;
    type: string | null;
    order: number | null;
  };

  /**
   * meta(Ctor):
   * Bir constructor'ın ns, name, parents, key bilgisini verir.
   *
   * Dönüş:
   *   {
   *     ns: <namespace>,
   *     name: <sınıf adı>,
   *     parents: <kalıtım zinciri listesi>,
   *     key: "<ns>|<name>"
   *   }
   *
   * Eğer parametre function değilse null döner.
   */
  function meta(Ctor: Function): {
    ns: string;
    name: string;
    parents: string[];
    key: string;
  } | null;

  /**
   * metaOf(obj):
   * Bir instance üzerinden meta bilgisi döndürür.
   * Dönüş:
   *   {
   *     ns: <namespace>,
   *     class: <sınıfın adı>,
   *     init: <ilk constructor argümanları veya null>
   *   }
   * Burada init, obj[CLASS.__SYM_INIT] ya da obj.__init üzerinden okunuyor.
   */
  function metaOf(obj: any): {
    ns: string;
    class: string;
    init: any[] | null;
  } | null;

  /**
   * parentsOf(x):
   * Bir sınıfın / instance'ın kalıtım zincirini düz liste olarak döndürür.
   * Bu, __flatParents(Ctor) sonucudur.
   */
  function parentsOf(x: any): string[];

  /**
   * parentsClean(x, opts?):
   * parentsOf ile aynı bilgiyi döndürür ama:
   *  - skip listesine göre belirli parent isimlerini atabilir
   *  - dedupe=true ise ardışık tekrarları temizler
   *
   * Varsayılan skip:['Bridge'], dedupe:true
   */
  function parentsClean(
    x: any,
    opts?: { skip?: string[]; dedupe?: boolean }
  ): string[];

  /**
   * flatParents:
   * Internal __flatParents fonksiyonunun public alias'ı.
   * Bir sınıfın prototip zincirinden sınıf isimlerini çıkarır.
   */
  const flatParents: (Ctor: any) => string[];

  /**
   * nameOf(x):
   * Objede $className varsa onu döndürür,
   * yoksa constructor.name döner,
   * yoksa ''.
   */
  function nameOf(x: any): string;

  /**
   * nsOf(x):
   * Objede $ns varsa onu döndürür,
   * yoksa constructor.$ns döner,
   * yoksa ''.
   */
  function nsOf(x: any): string;

  /**
   * isA(obj, CtorOrName):
   * - Eğer CtorOrName bir function ise `obj instanceof CtorOrName` benzeri bir
   *   zincir kontrolü yapar (prototype chain içinde yakalamaya çalışır).
   * - Eğer CtorOrName string ise, obj.constructor.name ile text eşleşmesi yapar.
   *
   * true => obj o sınıf (veya kalıtımından biri).
   */
  function isA(obj: any, CtorOrName: Function | string): boolean;

  /**
   * defineProp(obj, key, initial):
   * Objeye dirty-track uyumlu bir getter/setter tanımlar.
   * Setter çağrıldığında, obj.__markDirty(key, v) varsa tetikler.
   * Bu model UI nesnelerinde "bu alan değişti" bilgisini history/undo sistemine
   * otomatik olarak aktarmak için kullanılır.
   */
  function defineProp<T extends object>(
    obj: T,
    key: string,
    initial: any
  ): T;

  /**
   * setIdFormatter(fmt):
   * CLASS_CONFIG.idFormat fonksiyonunu runtime'da override etmeye yarar.
   * fmt(ns,type,n) -> string
   */
  function setIdFormatter(
    fmt: (ns: string, type: string, n: number) => string
  ): void;

  /**
   * setNsFor(Ctor, ns):
   * Bir sınıfın $ns değerini ayarlar ve registry'ye bu yeni ns ile yazar.
   * Bu, dinamik olarak başka bir namespace altında aynı sınıfı expose etmek
   * için kullanılabilir.
   */
  function setNsFor<T extends Function>(Ctor: T, ns?: string): T;

  /**
   * on(evt, fn):
   * Hook sistemi.
   * CLASS içinde __HOOKS = { register:Set(), construct:Set() } var.
   *
   * - evt: 'register' veya 'construct' gibi event anahtarı
   * - fn: çağrılacak callback
   *
   * Dönüş: unsubscribe fonksiyonu (Set'ten siler).
   *
   * Register hook'u yeni bir sınıf kayda geçince tetikleniyor.
   * Construct hook'u bir instance oluşturulunca tetikleniyor olabilir.
   */
  function on(
    evt: string,
    fn: (info: any) => void
  ): () => (boolean | void);

  /**
   * alias({ from:{ns?,name}, to:{ns?,name} }):
   * Registry'de var olan bir sınıfı başka bir isim/namespace altında da
   * görünür yapar. Yani ikinci bir anahtar açar.
   *
   * Örnek:
   *   CLASS.alias({
   *     from: { ns:'app://local/', name:'Tlayer' },
   *     to:   { ns:'app://alt/',   name:'Tlayer' }
   *   })
   */
  function alias(cfg: {
    from: { ns?: string; name: string };
    to:   { ns?: string; name: string };
  }): any;

  /**
   * installBase:
   * Dinamik plugin yükleyici için baz URL.
   * Eğer relative path verilirse bu base ile resolve edilip import edilir.
   * Varsayılan: null.
   */
  let installBase: string | null;

  /**
   * installMap:
   * Kısa isim -> module path eşlemesi.
   * Dosyada varsayılan:
   * {
   *   serializer: './Tserializer.js',
   *   fn:         './TfnRegistry.js',
   *   function:   './TfnRegistry.js',
   *   events:     './eventsBridge.js',
   *   ev:         './eventsBridge.js',
   *   history:    './ThistoryManager.js',
   *   hs:         './ThistoryManager.js',
   *   enums:      './enums.js',
   *   class:      './CLASS.js'
   * }
   *
   * Bu, CLASS.install('serializer') gibi kısa çağrılarda hangi dosyanın
   * import edileceğini tanımlar.
   */
  const installMap: Record<string, string>;

  /**
   * getPluginProvider(name):
   * installMap anahtarını (örn 'serializer', 'fn', 'events', 'history', 'enums', 'class')
   * daha genel bir "provider" etikete çevirir.
   * Dönen string genelde:
   *   'serializer' | 'function' | 'events' | 'history' | 'enums' | 'class'
   * Yoksa null döndürür.
   */
  function getPluginProvider(
    name: string
  ): 'serializer' | 'function' | 'events' | 'history' | 'enums' | 'class' | null;

  /**
   * install(name, opts?):
   * Dinamik modül yükler (ESM import).
   *
   * - name: installMap içinde tanımlı kısa ad ya da direkt URL/path.
   * - opts.base:
   *     Relative path resolve ederken kullanılacak base URL.
   *     Yoksa CLASS.installBase kullanılır, o da yoksa document.baseURI'den
   *     (tarayıcı ortamı varsa) hesaplanır.
   * - opts.url:
   *     Eğer direkt URL vermek istersen. Bu varsa map[name] yerine bunu kullanır.
   * - opts.as:
   *     Modülü CLASS altına bu isimle de ekle (alias olarak).
   * - opts.attach (default true):
   *     true ise import edilen modül CLASS[<name>] altına frozen olarak konur.
   * - opts.CLASS:
   *     Hedef namespace; default CLASS'in kendisi. Bu sayede farklı "sanal"
   *     CLASS alanlarına yükleme yapılabilir.
   *
   * Dönüş: dynamic import sonucu modül (Promise).
   *
   * Örnek:
   *   await CLASS.install('serializer', { as:'serializer' });
   *   const ev = await CLASS.install('events', { base:'/core12/' });
   */
  function install(
    name: string,
    opts?: {
      base?: string;
      url?: string;
      as?: string;
      attach?: boolean;
      CLASS?: typeof CLASS;
    }
  ): Promise<any>;

  /**
   * bindInstall(K?):
   * install'ı belirli bir CLASS benzeri konteynıra sabitler.
   *
   * const localInstall = CLASS.bindInstall(myNamespace);
   * await localInstall('history', { as:'hs' });
   *
   * Dönen fonksiyon, install ile aynı argümanları alır fakat
   * opts.CLASS olarak verdiğin K'yi otomatik geçirir.
   */
  function bindInstall(
    K?: typeof CLASS
  ): (name: string, opts?: {
    base?: string;
    url?: string;
    as?: string;
    attach?: boolean;
    CLASS?: typeof CLASS;
  }) => Promise<any>;

  /**
   * installMany(names, opts?):
   * Birden fazla plugin'i sırayla yükler.
   * Geri dönüş: { [name]: modül, ... }
   *
   * Örnek:
   *   const { serializer, history } =
   *       await CLASS.installMany(['serializer','history']);
   */
  function installMany(
    names: string[],
    opts?: {
      base?: string;
      url?: string;
      as?: string;
      attach?: boolean;
      CLASS?: typeof CLASS;
    }
  ): Promise<Record<string, any>>;

  /**
   * Tinstall / TbindInstall / TinstallMany:
   * install/bindInstall/installMany için alias (kısayol).
   * Bunlar aynı fonksiyonları gösterir.
   */
  const Tinstall: typeof install;
  const TbindInstall: typeof bindInstall;
  const TinstallMany: typeof installMany;

  /**
   * install.setMap(m):
   * installMap'e toplu ekleme/override yapar.
   * install.getMap():
   * installMap'in kopyasını döndürür.
   * install.setBase(url):
   * CLASS.installBase değerini ayarlar (veya null yapar).
   */
  namespace install {
    function setMap(m?: Record<string, string>): Record<string, string>;
    function getMap(): Record<string, string>;
    function setBase(url?: string | null): void;
  }

  /**
   * registry:
   * Sadece getter ile expose ediliyor.
   * __registry içindeki ham tabloyu (ns|name -> ctor) döner.
   * Not: bu "legacy alias" olarak işaretlenmiş.
   */
  const registry: Record<string, any>;

  // ---------------------------------------------------------------------------
  // Layered options public API
  // ---------------------------------------------------------------------------

  /**
   * options():
   *   - Argüman yoksa: global (en alt katman) options objesinin klonunu döner.
   *   - Tek string path verilirse: o path altındaki değerin klonunu döner.
   *   - (path, val): o path'e val yazar ve val'i döner.
   *   - (obj): objeyi mevcut global options ile merge eder.
   *
   * Burada "global" katman: __optsGlobal
   */
  function options(): Record<string, any>;
  function options(path: string): any;
  function options(path: string, val: any): any;
  function options(obj: Record<string, any>): Record<string, any>;

  /**
   * appOptions():
   * Aynı semantik ama app-level katman (__optsApp) üzerinde çalışır.
   */
  function appOptions(): Record<string, any>;
  function appOptions(path: string): any;
  function appOptions(path: string, val: any): any;
  function appOptions(obj: Record<string, any>): Record<string, any>;

  /**
   * runtimeOptions():
   * Aynı semantik ama runtime-level katman (__optsRuntime) üzerinde çalışır.
   * runtime katmanı en yüksek öncelikli overrides tabakasıdır.
   *
   * DİKKAT:
   * CLASS.runtimeOptions(...) fonksiyonunun sonunda `return __CLASS_AUGMENT(undefined);`
   * gibi bir çağrı var. Bu, sadece augment'i tetiklemek / side effect almak için
   * kullanılıyor gibi görünüyor. Dönüş değeri pratikte genelde kullanılmaz.
   */
  function runtimeOptions(): Record<string, any>;
  function runtimeOptions(path: string): any;
  function runtimeOptions(path: string, val: any): any;
  function runtimeOptions(obj: Record<string, any>): any;

  /**
   * opt(path, defaults?):
   * options() + appOptions() + runtimeOptions() üç tabakayı merge ederek
   * tek noktadan okur.
   *
   * Eğer path bulunamazsa:
   *  - defaults basit bir değer ise direkt onu döner.
   *  - defaults bir obje ise onun klonunu çıkarıp merge eder.
   *
   * Bu, config okumak için ana entry point'tir.
   */
  function opt<T = any>(
    path: string,
    defaults?: T
  ): T;

  /**
   * getConfig(path, defaults?) == opt(path, defaults?)
   * Sadece alias.
   */
  function getConfig<T = any>(
    path: string,
    defaults?: T
  ): T;
}


// -----------------------------------------------------------------------------
// Global export davranışı
// -----------------------------------------------------------------------------
//
// CLASS.js sonunda:
//   if (typeof window !== 'undefined') window.CLASS = CLASS;
//   if (typeof globalThis !== 'undefined') globalThis.CLASS = CLASS;
//
// ve
//   Object.defineProperty(globalThis, 'config', {
//     get: ()=> CLASS.options(),
//     enumerable: true
//   });
//
// Bu sayede:
//   globalThis.CLASS   -> aynı CLASS nesnesi
//   globalThis.config -> global options tabakasının (CLASS.options()) readonly görünümü
//
// Biz bu tipleri sadece dokümantasyon için söylüyoruz. Burada ayrıca
// declare global bloğunda ambient tanım yapabiliriz:

declare global {
  /**
   * globalThis.CLASS:
   * Aynı CLASS nesnesi global ortama enjekte edilir.
   */
  // eslint-disable-next-line no-var
  var CLASS: typeof CLASS;

  /**
   * globalThis.config:
   * CLASS.options() çıktısına readonly pencere.
   * Yani global konfig snapshot'ı gibi davranır.
   */
  // eslint-disable-next-line no-var
  var config: Record<string, any> | undefined;
}


// -----------------------------------------------------------------------------
// DEFAULT EXPORT
// -----------------------------------------------------------------------------

/**
 * Default export: CLASS nesnesinin kendisi.
 * Bu nesne hem yukarıdaki namespace fonksiyonlarını (register, metaOf, installMany...)
 * hem de layered options/config fonksiyonlarını taşır.
 */
declare const CLASS_default: typeof CLASS;
export default CLASS_default;

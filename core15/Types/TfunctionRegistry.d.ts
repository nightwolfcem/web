/**
 * TfunctionRegistry.d.ts
 * ---------------------------------------------------------------------------
 * Global / namespaced fonksiyon kaydı yöneticisi. fileciteturn11file0
 *
 * Amaç
 * -----
 * - Bir fonksiyona kararlı bir isim ("ns:name") ve/veya global id
 *   ("fn:ns:name:seq") atamak.
 * - Bu isimden/id'den tekrar fonksiyonu bulabilmek.
 * - Çakışma politikası ('suffix' | 'warn' | 'error') ile
 *   aynı isim yeniden kaydedilince ne olacağını kontrol etmek.
 * - pack()/unpack() ile serializer köprüsü kurmak:
 *     pack(fn)  → { $fn:'ns:name', $fnsrc?: 'function(...) {...}' }
 *     unpack(o) → fn
 * - snapshot()/restore() ile meta bilgisini saklayıp yeniden kurmak.
 *
 * İki yüzey vardır:
 *   1) Instance API  → belirli bir namespace için kayıt defteri
 *   2) Static API    → global tekil id haritası ("append" uyumluluğu)
 *
 * Runtime dosyası TfunctionRegistry.js bu davranışları uygular. fileciteturn11file0
 */

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/**
 * Kurucu opsiyonları.
 *
 * namespace  : Varsayılan ad alanı. register(fn) çağrıldığında buraya yazar.
 * collision  : Aynı anahtar tekrar kaydedilirse ne yapalım?
 *              'suffix' → otomatik olarak `-2`, `-3` ... ekler
 *              'warn'   → console.warn ile uyarır, üzerine yazar
 *              'error'  → throw Error
 * allowSource: unpack(marker) sırasında marker.$fnsrc string'inden Function
 *              üretmeye izin ver (güvenlik nedeni ile varsayılan false).
 * includeSourceOnSerialize:
 *              pack(fn) çıktısına $fnsrc eklenmesine izin verir.
 */
export interface TfunctionRegistryOpts {
  namespace?: string;
  collision?: 'suffix' | 'warn' | 'error';
  allowSource?: boolean;
  includeSourceOnSerialize?: boolean;
  [key: string]: any;
}

/**
 * snapshot() çıktısı tek namespace'in özet bilgisidir.
 */
export interface TfunctionRegistrySnapshot {
  v: 1;
  ns: string;
  items: Array<{
    /** "ns:name" tam anahtar */
    name: string;
    /** meta bilgisi (tags, ver, hash ...) */
    meta: Record<string, any>;
  }>;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

export class TfunctionRegistry {
  /** Kurulum seçenekleri. */
  opts: {
    namespace: string;
    collision: 'suffix' | 'warn' | 'error';
    allowSource: boolean;
    includeSourceOnSerialize: boolean;
    [key: string]: any;
  };

  /**
   * Yerel kayıtlar:
   *  - _byName   : "ns:name"  → fn
   *  - _byFn     : fn         → "ns:name"
   *  - _meta     : "ns:name"  → { ns,tags,ver,hash }
   *  - _reserved : Geçici ayırtılmış anahtarlar (rezervasyon).
   */
  protected _byName: Map<string, Function>;
  protected _byFn: WeakMap<Function, string>;
  protected _meta: Map<string, any>;
  protected _reserved: Set<string>;

  constructor(opts?: TfunctionRegistryOpts);

  /* ------------------------------------------------------------------------
   *  NAMESPACE / ANAHTAR İŞLEMLERİ
   * --------------------------------------------------------------------- */

  /** Aktif namespace'i döndürür. */
  ns(): string;

  /** Aktif namespace'i değiştirir. chainable. */
  setNamespace(ns: string): this;

  /**
   * "name" + "ns" → "ns:name" biçimini üretir.
   * Eğer name "ns:name" formatında ise dokunmadan döndürür.
   */
  key(name: string, ns?: string): string;

  /**
   * "ns:name" → { ns:'ns', name:'name' } olarak ayırır.
   * Eğer ":" yoksa { name:'full' } döner.
   */
  split(full: string): { ns?: string; name: string };

  /**
   * Geçici olarak bir anahtarı rezerve et.
   * Böylece aynı anda iki farklı register() çağrısı aynı ismi alamasın.
   */
  reserve(name: string, ns?: string): this;

  /** reserve() ile alınan rezervasyonu bırak. */
  unreserve(name: string, ns?: string): this;

  /* ------------------------------------------------------------------------
   *  INSTANCE CRUD / LOOKUP
   * --------------------------------------------------------------------- */

  /** Bu registry içinde o isim var mı? */
  has(name: string, ns?: string): boolean;

  /** Fonksiyonu getir ("ns:name" veya (name,ns)). Bulunamazsa null. */
  get(name: string, ns?: string): Function | null;

  /** get(...) alias'ı. */
  getByName(a: string, b?: string): Function | null;

  /**
   * Kayıttan siler. true → gerçekten silindi.
   */
  delete(name: string, ns?: string): boolean;

  /**
   * Bu fn şu anda hangi "ns:name" ile kayıtlı?
   * Yoksa fn.name veya null döner.
   */
  nameOf(fn: Function): string | null;

  /**
   * register(ns,name,fn)
   * register('ns:name', fn)
   * register(fn)
   *
   * Dönüş: kesin "ns:name". Kollision moduna göre otomatik -2,-3 suffix eklenebilir.
   */
  register(a: any, b?: any, c?: any): string;

  /**
   * set("ns:name", fn)
   * Doğrudan kaba yazma (collision check yapmaz).
   */
  set(idOrKey: string, fn: Function): string;

  /**
   * Çözümleyici:
   *  resolve('ns','name')
   *  resolve('ns:name')
   *
   * -> fn | null
   */
  resolve(a: string, b?: string): Function | null;

  /** Bu fn için kaydedilmiş "ns:name" kim? */
  idOf(fn: Function): string | null;

  /** remove(...) → delete alias'ı */
  remove(a: string, b?: string): boolean;

  /**
   * Tüm anahtarları döner. filterNs verilirse sadece o namespace ile başlayanlar.
   * ['app:save', 'app:open', 'core:noop', ...]
   */
  list(filterNs?: string | null): string[];

  /** [["ns:name", fn], ...] şeklinde entries. */
  entries(): Array<[string, Function]>;

  /**
   * Meta.tag ekle / birleştir.
   * örn: tag('save', ['ui','file'])
   */
  tag(name: string, tags?: any[]): this;

  /**
   * Versiyon bump. meta.ver++
   */
  bump(name: string): string;

  /**
   * Bir module objesindeki fonksiyonları topluca kaydet.
   * prefix ile başlayanları al veya filter(...) true dönenleri al.
   * Dönüş: kayıt edilen tam anahtar listesi.
   */
  registerModule(
    mod: Record<string, any>,
    opts?: { ns?: string | null; prefix?: string; filter?: (k: string, v: Function) => boolean | void }
  ): string[];

  /**
   * Sadece meta bilgisinin snapshot'ını çıkarır.
   * Fonksiyon gövdesi serialize edilmez.
   */
  snapshot(opts?: { ns?: string | null }): TfunctionRegistrySnapshot;

  /**
   * snapshot() ile alınmış meta bilgisini geri yazar.
   * Not: Bu işlem sadece meta'yı geri koyar, fn gövdelerini restore etmez.
   */
  restore(snap: any): this;

  /* ------------------------------------------------------------------------
   *  SERIALIZER KÖPRÜSÜ
   * --------------------------------------------------------------------- */

  /**
   * Bir fonksiyonu { $fn:'ns:name' } marker'ına çevirir.
   * includeSourceOnSerialize aktifse $fnsrc da eklenebilir.
   */
  pack(fn: Function, ns?: string | null): { $fn: string; $fnsrc?: string } | null;

  /**
   * pack() ile üretilmiş marker'dan fonksiyonu geri çözer.
   * allowSource=true ise marker.$fnsrc içinden Function derlenmesine izin verebilir.
   */
  unpack(marker: any): Function | null;

  /**
   * { type:'TfunctionRegistry', args:[ { ns, keys:[...] } ] }
   * şeklinde minimal JSON temsilini döndürür.
   */
  toMinJSON(): {
    type: 'TfunctionRegistry';
    args: [{
      ns: string;
      keys: string[];
    }];
  };

  /**
   * Debug amaçlı okunabilir JSON. { "app:save":"save", ... }
   */
  toJSON(): Record<string, string>;

  /* ------------------------------------------------------------------------
   *  STATİK ALANLAR / GLOBAL ID HARİTASI
   * --------------------------------------------------------------------- */

  /**
   * Belirli bir namespace için singleton döner.
   * TfunctionRegistry.forNs('ui') her zaman aynı instance'ı verir.
   */
  static forNs(ns: string): TfunctionRegistry;

  /**
   * Global kayıt:
   *   register(ns,name,fn)
   *   register('ns:name',fn)
   *   register(fn)
   *
   * Dönüş: global id "fn:ns:name:seq"
   */
  static register(a: any, b?: any, c?: any): string;

  /**
   * "fn:ns:name:seq" veya "ns:name" → Function | null
   */
  static getById(id: string): Function | null;

  /** get('ns','name') → fn|null */
  static get(ns: string, name: string): Function | null;

  /** getByName alias'ı. */
  static getByName(ns: string, name: string): Function | null;

  /**
   * Çözümleyici (çok esnek):
   *  - direct fn           → aynı fn
   *  - "fn:ns:name:seq"    → kayıtlı fn
   *  - "ns:name"           → kayıtlı fn
   *  - {$:'fn', ns, name } → kayıtlı fn
   */
  static resolve(ref: any): Function | null;

  /**
   * Eğer aynı fn daha önce kaydedildiyse aynı id'yi döndürür;
   * yoksa register() gibi yeni id üretir.
   */
  static registerIfAbsent(ns: string, name: string, fn: Function): string | null;

  /** fn → "fn:ns:name:seq" veya null */
  static idOf(fn: Function): string | null;

  /** Belirli namespace altındaki tüm "ns:name" anahtarlarını listeler. */
  static list(ns?: string): string[];

  /**
   * Global minimal snapshot.
   * { map:{ "ns:name":"fn:ns:name:seq", ... } }
   */
  static toMinJSON(): { map: Record<string, string> };

  /**
   * Global snapshot'tan geri yükleme.
   * Eksik anahtarlar map'e placeholder olarak konur.
   */
  static fromMinJSON(min: any): typeof TfunctionRegistry;
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

declare const _default: typeof TfunctionRegistry;
export default _default;
export { TfunctionRegistry };

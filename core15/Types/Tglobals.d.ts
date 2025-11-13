/**
 * Tglobals.d.ts
 * ---------------------------------------------------------------------------
 * Uygulama genel ayarlarını, profilleri, path çözümlemeyi ve policy
 * köprülerini yöneten üst seviye config yöneticisi. Ayrıca fonksiyon
 * registry bootstrap ve feature flag yönetimi sağlar. fileciteturn11file1
 *
 * Tglobals iki katmandan oluşur:
 *  1) Instance API
 *     - baseUrl / codeSrc / appPath / ns gibi ortam bilgilerini tutar
 *     - Tdefaults ile varsayılanları (`this.d`) yönetir
 *     - aktif profile'ı setProfile()/getActiveProfile() ile yönetir
 *     - history / serializer / styles policy'lerini döndürür
 *     - path çözümleme yapar (resolvePath, resolve)
 *     - loadDefaults() ile defaults.json vb. dosyaları async olarak yükler
 *
 *  2) Static API (append ile eklenen fonksiyonlar)
 *     - get/set/merge/resolve      : namespaced config erişimi
 *     - applyToSerializer          : serializer config/hooklarını enjekte et
 *     - applyToHistory             : history yöneticisine policy uygula
 *     - registerFns                : { name:fn } map'ini TfunctionRegistry'ye yaz
 *     - toMinJSON / fromMinJSON    : config snapshot / restore
 *     - flags / enable / disable   : feature flag yönetimi
 *     - useDefaults / defaults     : global varsayılanlar
 *
 * Runtime dosyası Tglobals.js bu davranışı uygular. fileciteturn11file1
 */

import type { Tevents } from './Tevents.js';
import type Tdefaults from './Tdefaults.js';

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/**
 * Kurucu/init seçenekleri.
 *
 * baseUrl       : kök URL. genelde document.baseURI
 * codeSrc       : kodların (module'ların) yüklendiği base path
 * appPath       : uygulamanın asset/base path'i
 * ns            : aktif namespace adı ('app' varsayılan)
 * defaults      : başlangıç default config objesi (Tdefaults'a merge edilir)
 * profile       : aktif profil adı
 * classOptions  : CLASS.options() / CLASS.appOptions() / CLASS.runtimeOptions()
 *                 için naming ayarları
 * loadDefaults  : init() sırasında otomatik loadDefaults() çalıştırmak için
 *                 { fromApp, fromCode, profileAware } gibi bayraklar
 * paths, app    : init() sırasında ekstra merge edilecek config parçaları
 */
export interface TglobalsInitOpts {
  baseUrl?: string;
  codeSrc?: string;
  appPath?: string;
  ns?: string;
  defaults?: any;
  profile?: string;
  classOptions?: any;
  loadDefaults?: any;
  paths?: any;
  app?: any;
  [key: string]: any;
}

/**
 * dapi yüzeyi (this.dapi). Instance içinden kolay erişim için sunulur.
 * get/set/merge doğrudan Tdefaults üstünden geçer.
 */
export interface TglobalsDapi {
  get(path: string, def?: any): any;
  set(path: string, val: any): any;
  merge(obj: any): any;
  getHistoryPolicy(ns?: string): any;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

export class Tglobals extends Tevents {
  /** document.baseURI vb. kök url */
  baseUrl: string;

  /** kod dosyalarının base path'i (ör. /code/) */
  codeSrc: string;

  /** uygulama path'i (ör. /app/) */
  appPath: string;

  /** aktif namespace ismi ('app' varsayılan) */
  ns: string;

  /** Tdefaults instance'ı (profil+namespace aware config deposu) */
  d: Tdefaults | any;

  /**
   * Kısayol API'si: d.get/d.set/d.merge + getHistoryPolicy().
   * UI katmanları direkt `globals.dapi.get('class.naming')` gibi kullanabilir.
   */
  dapi: TglobalsDapi;

  /**
   * Feature flags alanı. append bloğu bu alanı statik olarak da yönetir.
   * instance tarafında explicit garanti edilmez ama burada deklarasyon olarak
   * tutuyoruz.
   */
  flags?: Record<string, boolean>;

  constructor(opts?: TglobalsInitOpts);

  /**
   * Init akışı.
   *
   * - baseUrl/codeSrc/appPath/ns override eder
   * - opts.paths ve opts.app değerlerini defaults'a merge eder
   * - profil setProfile(opts.profile)
   * - applyClassOptions(ns, opts.classOptions) çağrılır
   * - opts.loadDefaults verilmişse loadDefaults(...) beklenir
   * - 'init' event'i emit edilir
   *
   * Promise<this> döner.
   */
  init(opts?: TglobalsInitOpts): Promise<this>;

  /* ------------------------------------------------------------------------
   *  PROFIL API
   * --------------------------------------------------------------------- */

  /**
   * Aktif profili değiştirir. CLASS naming ayarlarını profilden tekrar uygular,
   * 'profile' event'i emit eder ve aktif profil adını döndürür.
   */
  setProfile(name?: string): string;

  /** Şu anda aktif profil adını döndürür. */
  getActiveProfile(): string | undefined;

  /* ------------------------------------------------------------------------
   *  NAMESPACE / CLASS OPTIONS / POLICY MERGE
   * --------------------------------------------------------------------- */

  /**
   * İç katmanları birleştirir:
   *   global defaults → namespace overrides → app overrides → profile overrides
   * Bu metod dahili kullanıma yöneliktir.
   */
  protected _mergeLayers(ns: any, key: string): any;

  /**
   * Belirli bir namespace altında (this.d.namespaces[ns]) config patch uygular.
   * Dönen değer merge edilmiş son haldir.
   */
  registerNamespace(ns: string, patch: any): any;

  /**
   * CLASS naming/options katmanını (global → ns → app → profile) hesaplayıp
   * CLASS.options/appOptions/runtimeOptions üzerinden uygular.
   * runtimeOpt.naming verilirse onu da runtimeOptions('naming') ile basar.
   * Dönen değer bu hesaplanan config objesidir.
   */
  applyClassOptions(ns: string, runtimeOpt?: any): any;

  /** History policy (undo/redo izlemesi için). ns verilmezse this.ns kullanır. */
  getHistoryPolicy(ns?: string): any;

  /** Serializer policy. ns verilmezse this.ns kullanır. */
  getSerializerPolicy(ns?: string): any;

  /** Styles policy / theme presetleri. ns verilmezse this.ns kullanır. */
  getStyles(ns?: string): any;

  /* ------------------------------------------------------------------------
   *  PATH / URL COZUMLEME
   * --------------------------------------------------------------------- */

  /**
   * Alias'ı gerçek path'e çevirir.
   *  - app.paths.overrides   önceliklidir
   *  - globals.paths.overrides sonra
   *  - 'codeSrc' / 'appPath' özel case'leri çözer
   */
  resolvePath(alias: string, fallback?: string): string;

  /**
   * Relatif yolu baseUrl/codeSrc/appPath'e göre mutlak URL'ye çevirir.
   * scope:
   *   'code' → codeSrc
   *   'app'  → appPath
   *   'auto' → appPath || codeSrc || baseUrl
   */
  resolve(rel: string, opts?: { scope?: 'auto' | 'code' | 'app' }): string;

  /* ------------------------------------------------------------------------
   *  DEFAULTS YUKLEME
   * --------------------------------------------------------------------- */

  /**
   * defaults.json, defaults/styles.json, profile.{p}.json vb. dosyaları
   * baseUrl+codeSrc / baseUrl+appPath altından yükler.
   * fromApp/fromCode/profileAware bayrakları ile kontrol edilir.
   * Yükledikten sonra applyClassOptions tekrar çağrılır (profil naming için).
   */
  loadDefaults(opts?: {
    fromApp?: boolean;
    fromCode?: boolean;
    profileAware?: boolean;
    [key: string]: any;
  }): Promise<this>;

  /* ------------------------------------------------------------------------
   *  KUCÜK YARDIMCILAR / FONKSIYON REGISTRY ENTEGRESI
   * --------------------------------------------------------------------- */

  /**
   * İsimlendirilmiş fonksiyonu (ns,name → fn) yerel tabloya yazar.
   * Daha sonra getFn('ns','name') ile okunabilir.
   */
  registerFn(ns: string, name: string, fn: Function): Function;

  /** ns/name ile kayıtlı fonksiyonu döndürür (yoksa null). */
  getFn(ns: string, name: string): Function | null;

  /** ns/name fonksiyonunu çağırır. Fonksiyon yoksa undefined döner. */
  callFn(ns: string, name: string, ...args: any[]): any;

  /* ------------------------------------------------------------------------
   *  EVENT SURFACE
   * --------------------------------------------------------------------- */

  /** Tevents.emit(...) üzerinden 'ready', 'init', 'profile' vb. eventi atar. */
  emit(type: string, detail?: any, meta?: any): number;
  on(keys: string | string[], handler: any, opts?: any): () => void;
  once(keys: string | string[], handler: any, opts?: any): () => void;
  off(keys?: string, handler?: any, opts?: { ns?: string | string[] }): this;
}

/* ==========================================================================
 *  STATIK / GLOBAL API (APPEND ILE EKLENEN)
 * ========================================================================== */

/**
 * app→ns→defaults→core önceliğine göre key çözümlemesi.
 * Eğer aynı metod instance tarafında tanımlı değilse static Tglobals.resolve
 * atılır (append bloğu). fileciteturn11file1
 */
export interface TglobalsStatic {
  /**
   * Çok katmanlı config resolve.
   * Örn: Tglobals.resolve('serializer', 'app')
   */
  resolve?(key: string, ns?: string): any;

  /**
   * Belirli namespace için (veya global app alanı için) config okumak.
   * get(ns,key,def)
   */
  get?(ns: string, key: string, def?: any): any;

  /** set(ns,key,val) → config'i mutate eder. */
  set?(ns: string, key: string, val: any): any;

  /** merge(ns,obj) → derin merge. */
  merge?(ns: string, obj: any): any;

  /**
   * Serializer'e policy/hook enjekte eder.
   * Tserializer globaline bakar ve deepMerge uygular.
   */
  applyToSerializer?(ns?: string): any;

  /**
   * History manager'a policy uygular (limit, track vs.).
   */
  applyToHistory?(hmgr: any, ns?: string): any;

  /**
   * { name:fn } map'ini alıp TfunctionRegistry.register(ns,name,fn)
   * ile global TfunctionRegistry'ye yazar.
   */
  registerFns?(ns: string, map: Record<string, Function>): any;

  /**
   * Config snapshot çıkarır (yalnızca yapı; fonksiyon yok).
   * { app, ns, defaults, core }
   */
  toMinJSON?(): {
    app?: any;
    ns?: any;
    defaults?: any;
    core?: any;
  };

  /**
   * Snapshot'tan yeni bir Tglobals üretir. Fonksiyonlar taşınmaz.
   */
  fromMinJSON?(min: any): Tglobals;

  /* ----- feature flags ----- */

  /** Global feature flag bag'ı. */
  flags?: Record<string, boolean>;

  /** Feature flag aç. */
  enable?(flag: string): TglobalsStatic;

  /** Feature flag kapat. */
  disable?(flag: string): TglobalsStatic;

  /** Feature flag açık mı? */
  isEnabled?(flag: string): boolean;

  /** Varsayılan config deposu. */
  defaults?: any;

  /**
   * Global varsayılanları birleştir.
   * Tglobals.useDefaults({ historyLimit:500, theme:'default', ... })
   */
  useDefaults?(obj: any): TglobalsStatic;
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

declare const _default: typeof Tglobals & TglobalsStatic;

export default _default;
export { Tglobals };

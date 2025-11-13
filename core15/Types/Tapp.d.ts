/**
 * Tapp.d.ts
 * ---------------------------------------------------------------------------
 * Uygulama kabugu / runtime konteyneri.
 *
 * Bu sinif tek bir editor/uygulama instance'inin tum yurutme
 * baglamini tutar:
 *  - Kök DOM baglantisi (root / host)
 *  - Event bus (Tevents)
 *  - History/undo-yigin yöneticisi (ThistoryManager)
 *  - Serializer (Tserializer / TeventBridge snapshot)
 *  - Clipboard servis katmani (Tclipboard + local fallback)
 *  - Shortcuts / hotkey haritasi (Tshortcut veya manual keydown listener)
 *  - Service / Module / Component registry (DI container gibi)
 *  - Persist (localStorage ve/veya harici Tpersist)
 *  - Selection ve Layer kumesi (Tselection, Tlayer)
 *  - CLASS.install ile dinamik modul/asset resolve mekanizmasi
 *
 * Tapp tekil olarak yaratilir ve daha sonra mount()/unmount(),
 * attachHotkeys()/detachHotkeys(), save()/load(), toMinJSON()/fromMinJSON()
 * gibi lifecycle fonksiyonlari ile yasatilir.
 */

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/** Clipboard arabirimi (useClipboard() donusu). */
export interface TClipboardAPI {
  setData(x: any): boolean | Promise<boolean>;
  getData(): any;
  clear(): void;
  setText(t: any): Promise<boolean>;
  getText(): Promise<string>;
  toJSON(): any;
  fromJSON(j: any): boolean;
}

/** Plugin dispose fonksiyonu tipi. */
export type TPluginDisposer = (() => void) | null | undefined;

/** Plugin fonksiyonu tipi. Dondurulen deger dispose icin kullanilabilir. */
export type TPluginFn = (app: Tapp, opts?: any) => (void | { dispose?: () => void } | (() => void));

/** Kisa yol (hotkey) haritasi. 'Ctrl+S': handler gibi. */
export type THotkeyMap = Record<string, (e: KeyboardEvent) => any>;

/**
 * Tapp.create() / new Tapp(...) icin kurulum parametreleri.
 * Tum alanlar opsiyoneldir; verilmezse Tapp kendi makul varsayilanlarini
 * olusturmaya calisir.
 */
export interface TappInitOpts {
  /** Kök DOM el'i. Varsayilan document.body. */
  root?: any;
  /** harici event bus instance'i (Tevents). */
  events?: any;
  /** harici history yöneticisi (ThistoryManager). */
  history?: any;
  /** alias olarak historyManager da kabul edilir. */
  historyManager?: any;
  /** harici serializer (Tserializer benzeri). */
  serializer?: any;
  /** harici clipboard servisi (Tclipboard). */
  clipboard?: any;
  /** harici selection yöneticisi (Tselection). */
  selection?: any;
  /** harici layer kökü (Tlayer). */
  layer?: any;
  /**
   * Uygulama opsiyonlari override'lari.
   * appOpt() icine merge edilir. Örnek:
   * { ui:{theme:'dark'}, shortcuts:{enabled:false} }
   */
  options?: Record<string, any>;
  /**
   * Baslangicta kaydedilecek named servisler.
   * { persist: myPersist, clipboard: myClipboard }
   */
  services?: Record<string, any>;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

export class Tapp {
  /**
   * CLASS kayit adini tutar. Runtime'da CLASS(...) wrap'i icinde atanir.
   * Bu alanin varligi, serializer tarafinda tur tespiti icin kullanilir.
   */
  static TNAME: 'Tapp';

  /**
   * Yeni bir uygulama kabugu yaratir.
   * - root/body referansi, event bus, history manager, serializer gibi
   *   cekirdek objeleri olusturur veya inject eder.
   * - internal service map / plugin set / module & component registry
   *   acilir.
   * - clipboard icin hem sistem clipboard'u hem de local fallback hazirlanir.
   */
  constructor(opts?: TappInitOpts);

  /**
   * Uygulama kok elemani (genelde document.body). mount() sonrasi host
   * bilgisi icin getHost() kullanilabilir.
   */
  protected _root: any;

  /** Global event bus (Tevents). */
  protected _events: any;

  /** History/undo-redo yöneticisi (ThistoryManager). */
  protected _history: any;

  /**
   * Serializer / snapshotlayici.
   * Event baglantilarini dump edip tekrar yukleyebilir.
   */
  protected _serializer: any;

  /** Servis kayitlari. name → instance veya {__factory:Function}. */
  protected _services: Map<string, any>;

  /** Plugin'lerin dispose() fonksiyonlari. */
  protected _plugins: Set<TPluginDisposer>;

  /** Module registry. name → module ya da factory(app,...args). */
  protected _modules: Map<string, any>;

  /** Component registry. name → component ya da factory(app,...args). */
  protected _components: Map<string, any>;

  /** mount() cagrildi mi? */
  protected _mounted: boolean;

  /**
   * Harici clipboard servisi (Tclipboard) ya da local fallback wrapper'i.
   */
  protected _clipboard: any;

  /**
   * Local clipboard fallback state'i.
   * { setData,getData,clear,setText,getText }
   */
  protected _clipLocal: TClipboardAPI;

  /** Tshortcut instance'i veya manuel keydown listener wrapper'i. */
  protected _shortcut: any;

  /** Aktif hotkey map'i. */
  protected _hotkeyMap: Map<string, (e: KeyboardEvent) => any>;

  /** CLASS.install icin name→url map'i. */
  protected _installMap: Record<string, any>;

  /** CLASS.install icin base URL. */
  protected _installBase: string | null;

  /** Profil / env bilgileri (Tglobals). */
  protected _globals: any;

  /** Persist katmani (Tpersist). */
  protected _persist: any;

  /** Selection yöneticisi (Tselection). */
  protected _selection: any;

  /** Layer kok referansi (Tlayer). */
  protected _layer: any;

  /** Birlestirilmis app options objesi. */
  protected _opts: Record<string, any>;

  /** Opsiyonel host cache'i (mount() icinde atanir). */
  protected _host?: any;

  /** Uygulama icin opsiyonel id; persist anahtarinda kullanilir. */
  id?: string | number;

  /* ------------------------------------------------------------------------
   * GETTER'LAR (salt okunur yansimalar)
   * --------------------------------------------------------------------- */

  /** Kök DOM referansi. */
  get root(): any;
  /** Global event bus. */
  get events(): any;
  /** History yöneticisi. */
  get history(): any;
  /** Derin kopyalanmis opsiyon objesi. */
  get options(): Record<string, any>;
  /** mount() sonrasi true olur. */
  get mounted(): boolean;
  /** Serializer nesnesi. */
  get serializer(): any;
  /** Aktif selection yöneticisi. */
  get selection(): any;
  /** Aktif layer kok'u. */
  get layer(): any;
  /** Profil / globals yöneticisi. */
  get globals(): any;
  /** Persist servisi. */
  get persist(): any;

  /* ------------------------------------------------------------------------
   * DI / INJECTOR / BAGLANTI KURULUMU
   * --------------------------------------------------------------------- */

  /**
   * Kök DOM referansını ayarlar veya değiştirir.
   *
   * Bu, uygulamanın görsel olarak hangi container içinde yaşadığını tanımlar.
   * mount(root) zaten bunu otomatik olarak çağırır; manuel olarak çağırırsan
   * uygulamayı çalışma zamanında başka bir host elemente taşıyabilirsin.
   *
   * Kabul edilen değerler:
   * - Bir HTMLElement (örn. <div id="editorRoot">)
   * - Bir wrapper obje: { el: HTMLElement } veya { host: HTMLElement }
   *   (mount(root) bu pattern'i destekler; getHost() bu alanı döndürür.)
   * - Framework tabanlı bir view/component objesi (React/Vue benzeri) fakat
   *   içinde DOM kökünü temsil eden bir alan (el/host/root) olması beklenir.
   *
   * Dönüş: aynı Tapp instance'ı (chainable).
   */
  setRoot(el: any): this;

  /**
   * Uygulamanın kullanacağı event bus'ı (Tevents benzeri) enjekte eder.
   *
   * Beklenen arayüz:
   *   ev.on(type, fn)
   *   ev.off(type, fn)
   *   ev.once(type, fn)
   *   ev.emit(type, payload)
   *
   * Eğer hiç set etmezsen constructor kendi local event bus'ını oluşturur.
   * Eğer birden fazla Tapp örneğinin tek bir global kanal paylaşmasını
   * (ör. cross-tab senkronizasyon veya test doubles) istiyorsan manuel çağır.
   *
   * Dönüş: aynı Tapp instance'ı (chainable).
   */
  setEvents(ev: any): this;

  /**
   * Undo/redo yığın yöneticisini (genelde ThistoryManager) enjekte eder.
   *
   * hm'den beklenen çekirdek API:
   *   hm.exec(cmd)
   *   hm.undo() / hm.redo()
   *   hm.canUndo() / hm.canRedo()
   *   hm.clear()
   *   hm.batch(fn)
   *
   * Eğer hiç set etmezsen ensureHistory() ilk ihtiyaçta varsayılan bir
   * history manager yaratır ve cache'ler. Ortak global history paylaşmak
   * ya da deterministik test koşmak istiyorsan bunu manuel verirsin.
   *
   * Dönüş: aynı Tapp instance'ı (chainable).
   */
  setHistory(hm: any): this;

  /**
   * Serializer / snapshotlayıcı nesnesini enjekte eder.
   *
   * Bu nesne genelde application state'i ve event handler bağlantılarını
   * dışa/minified JSON'a çıkarıp sonra geri yükleme işini yapar.
   * Örnek beklenen yetenekler:
   *   S.attachEvents(root)
   *   S.snapshot(app)
   *   S.restore(app, json)
   *
   * Eğer hiç set etmezsen ensureSerializer() kendi varsayılanını kurmaya
   * çalışır.
   *
   * Dönüş: aynı Tapp instance'ı (chainable).
   */
  setSerializer(S: any): this;

  /**
   * Selection yöneticisini (genelde Tselection) enjekte eder.
   *
   * Bu yöneticinin görevi hangi nesnelerin şu anda seçili olduğunu tutmaktır.
   * Beklenen davranış örnekleri:
   *   sel.set(ids) / sel.replace(ids)
   *   sel.get() → aktif seçim kimlikleri listesi
   *
   * Tapp.setSelectionFrom(ids) doğrudan bu yöneticiyi kullanır.
   * copySelection() ve pasteToLayer() akışında da buradan okunur.
   *
   * Dönüş: aynı Tapp instance'ı (chainable).
   */
  setSelection(sel: any): this;

  /**
   * Katman kökünü (Tlayer benzeri ana canvas/layer root) enjekte eder.
   *
   * layer genelde görsel yüzeydir ve alt katmanları (selection highlight,
   * dragPreview ghost, overlay ui vs.) barındırır.
   * pasteToLayer(payload) gibi fonksiyonlar yapıştırmayı doğrudan bu layer
   * üzerinden yapar.
   *
   * Dönüş: aynı Tapp instance'ı (chainable).
   */
  setLayer(layer: any): this;

  /**
   * Globals / profil yöneticisini (genelde Tglobals) enjekte eder.
   *
   * g'den beklenen çekirdek API tipik olarak:
   *   g.setProfile(name, data?)
   *   g.getProfile(name?)
   *
   * Tapp.setProfile(name,data) ve Tapp.getProfile(name?) bu yöneticiyi
   * proxy'ler. Profil; tema, kullanıcı ayarları, workspace bilgisi gibi
   * şeyleri kapsar.
   *
   * Dönüş: aynı Tapp instance'ı (chainable).
   */
  setGlobals(g: any): this;

  /**
   * Persist / storage servis katmanını (genelde Tpersist) enjekte eder.
   *
   * Bu servis kalıcı depolama / yükleme işlerini üstlenir:
   *   p.save(name, data) → Promise<boolean>
   *   p.load(name)       → Promise<any>
   *
   * Tapp.save() / Tapp.load() doğrudan bu servise delege eder. Eğer persist
   * servisi yoksa fallback olarak:
   *   - saveState()/loadState() ile localStorage kullanılır
   *   - save() sırasında Blob indirterek manuel JSON export yapılır
   *
   * Dönüş: aynı Tapp instance'ı (chainable).
   */
  setPersist(p: any): this;

  /* ------------------------------------------------------------------------
   * SERVICE CONTAINER API (DI registry)
   * --------------------------------------------------------------------- */

  /** Bir servisi kaydet. */
  setService(name: string, svc: any): this;
  /** Alias. */
  set(name: string, service: any): this;

  /**
   * Tek shot alma.
   * - Varsa instant instance'i dondurur
   * - varsa __factory ise calistirip cache'ler
   */
  getService(name: string): any;
  /** Alias. */
  get(name: string): any;

  /** Varlik kontrolu. */
  hasService(name: string): boolean;
  /** Alias. */
  has(name: string): boolean;

  /** Kayıtlı servisi tamamen siler. */
  deleteService(name: string): this;

  /** Varsa isim listesini döndürür. */
  listServices(): string[];

  /**
   * Factory fonksiyonu kaydet.
   * İlk istek geldiginde factory(app,...args) calisir ve cache'lenir.
   */
  registerServiceFactory(name: string, factory: (app: Tapp, ...args: any[]) => any): this;

  /**
   * getService/getOrCreateService kisa yollari.
   */
  registerService(name: string, svc: any): this;

  /**
   * Varsa __factory ile instance olusturup cache'leyip geri döndürür.
   */
  getOrCreateService(name: string, ...args: any[]): any;

  /**
   * Yoksa initFn(app) ile olusturup setService eder.
   */
  useService(name: string, initFn?: (app: Tapp) => any): any;

  /**
   * Toplu servis kaydi icin "record" destegi.
   *
   * - use({ foo:svc, bar:factoryFn }) → hepsini kaydeder
   * - use('foo', svc)                 → tek tek kaydeder
   * - use('foo', factoryFn)           → factory olarak kaydeder
   */
  use(nameOrRecord: Record<string, any> | string, maybeFactory?: any): this;

  /* ------------------------------------------------------------------------
   * MODULE / COMPONENT REGISTRY
   * --------------------------------------------------------------------- */

  /** Module kaydet. */
  registerModule(name: string, modOrFactory: any): this;
  /** Module al (factory olmadan). */
  getModule(name: string): any;
  /** Module olustur (factory ise cagirir). */
  createModule(name: string, ...args: any[]): any;

  /** Component kaydet. */
  registerComponent(name: string, compOrFactory: any): this;
  /** Component al. */
  getComponent(name: string): any;
  /** Component olustur (factory ise cagirir). */
  createComponent(name: string, ...args: any[]): any;

  /* ------------------------------------------------------------------------
   * PLUGIN SISTEMI
   * --------------------------------------------------------------------- */

  /**
   * Bir plugin fonksiyonunu calistirir.
   * Donen deger bir dispose fonksiyonuysa _plugins set'ine eklenir.
   */
  use(plugin: TPluginFn, opts?: any): this;

  /** Tum plugin'lerin dispose() fonksiyonlarini calistirir ve temizler. */
  unuseAll(): this;

  /* ------------------------------------------------------------------------
   * LIFECYCLE / MOUNT
   * --------------------------------------------------------------------- */

  /**
   * mount(root):
   * - this.set('root', root) ile servislere de kaydeder
   * - host bilgisini cikarir (root.el || root.host || root HTMLElement)
   * - 'mount' eventini emit eder
   */
  mount(root: any): this;

  /**
   * unmount():
   * - this._mounted=false
   * - 'unmount' eventini emit eder
   * - tum plugin'leri kapatir (unuseAll)
   * - tum hotkey listenerlarini kaldirir (detachHotkeys)
   */
  unmount(): this;

  /** host HTMLElement'ini (varsa) dondurur. */
  getHost(): any;

  /* ------------------------------------------------------------------------
   * EVENTS PROXY (Tevents)
   * --------------------------------------------------------------------- */

  on(type: string, fn: (...args: any[]) => any, opts?: any): any;
  off(type: string, fn: (...args: any[]) => any, opts?: any): any;
  once(type: string, fn: (...args: any[]) => any, opts?: any): any;
  emit(type: string, payload?: any): any;

  /* ------------------------------------------------------------------------
   * HISTORY PROXY (ThistoryManager)
   * --------------------------------------------------------------------- */

  exec(cmd: any): any;
  undo(): any;
  redo(): any;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): any;

  /** History.batch(fn) proxy'si (yoksa fn() dogrudan). */
  batch<T>(fn: () => T): T;

  /**
   * Eğer history yoksa yeni bir ThistoryManager yaratip cache'ler
   * ve onu dondurur.
   */
  ensureHistory(): any;

  /**
   * Eğer serializer yoksa yeni bir serializer ureterek cache'ler.
   * Not: runtime kodunda TserializerCtor adı geciyor; bu burada any.
   */
  ensureSerializer(): any;

  /* ------------------------------------------------------------------------
   * APP OPTIONS (AOP)
   * --------------------------------------------------------------------- */

  /**
   * appOpt(path?, val?):
   * - path undefined → tum opsiyon objesinin klonunu dondurur
   * - path string    → getter veya setter gibi davranir
   * - path object    → mevcut opsiyonlarla merge eder
   *
   * CLASS.appOptions() tanimliysa onun uzerinden calisir; yoksa kendi
   * icindeki _opts uzerinden calisir.
   */
  appOpt(): Record<string, any>;
  appOpt(path: string): any;
  appOpt(path: string, val: any): any;
  appOpt(patch: Record<string, any>): Record<string, any>;

  /* ------------------------------------------------------------------------
   * SHORTCUT / HOTKEY SISTEMI
   * --------------------------------------------------------------------- */

  /**
   * Klavye kisayollarini baglar.
   * - Varsayilan hedef window.
   * - map { 'Ctrl+S': fn } formatinda.
   * - Eger Tshortcut varsa onu kullanir, yoksa kendi keydown listener'ini
   *   kurar ve stopPropagation/PreventDefault yapar.
   */
  attachHotkeys(target?: any, map?: THotkeyMap): this;

  /** Tum kisayollari kaldirir. */
  detachHotkeys(): this;

  /** Aktif hotkey stringlerinin listesi. */
  hotkeys(): string[];

  /* ------------------------------------------------------------------------
   * CLIPBOARD API
   * --------------------------------------------------------------------- */

  /**
   * Sistem clipboard'una (varsa) veya local fallback'e abstraction.
   * Ayrica bu abstraction'i 'clipboard' servisi olarak kaydeder.
   */
  useClipboard(): TClipboardAPI;

  /** Kisa yol; metni kopyala. */
  copyText(text: any): Promise<boolean>;
  /** Kisa yol; sistemden metni oku. */
  readText(): Promise<string>;
  /** Kisa yol; yapisal payload kopyala. */
  copy(payload: any): boolean;
  /** Kisa yol; yapisal payload getir. */
  paste(): any;

  /* ------------------------------------------------------------------------
   * INSTALL KOPRUSU / PATH RESOLVE
   * --------------------------------------------------------------------- */

  /** CLASS.install icin base URL ayarla. */
  setInstallBase(url: string | null | undefined): this;
  /** CLASS.install icin name→url map'ini merge et. */
  installSetMap(map: Record<string, any>): this;
  /** Aktif install map'inin kopyasini dondurur. */
  installGetMap(): Record<string, any>;

  /**
   * CLASS.install(name, opts) proxy'si.
   * name → modul adi / paket adi.
   */
  install(name: string, opts?: Record<string, any>): Promise<any>;

  /** Birden cok ismi art arda install eder, objede dondurur. */
  installMany(names: string[], opts?: Record<string, any>): Promise<Record<string, any>>;

  /**
   * Relative/goreli bir yolu app bazina gore absolute URL'e cevirir.
   * http(s):, file:, data:, app: gibi protokoller oldugu gibi dokunulmaz.
   */
  resolvePath(url: string): string;

  /** installMap icindeki alias'i cozup resolvePath() uzerinden tam URL verir. */
  resolve(nameOrUrl: string): string;

  /* ------------------------------------------------------------------------
   * GLOBALS / PROFIL / PERSIST
   * --------------------------------------------------------------------- */

  /** Aktif profili degistirir ve globals.setProfile(...) cagirir. */
  setProfile(name: string, data?: any): this;

  /** Profil bilgisini dondurur (globals.getProfile veya {name}). */
  getProfile(name?: string): any;

  /**
   * Tum uygulama durumunu localStorage'a yazar.
   * suffix → anahtar postfix'i.
   * extra  → toMinJSON() uzerine merge edilecek ek alanlar.
   * true/false dondurur.
   */
  saveState(suffix?: string, extra?: any): boolean;

  /**
   * Daha once saveState ile yazilan localStorage kaydini okur.
   * Bulunamazsa null.
   */
  loadState(suffix?: string): any;

  /**
   * Harici Tpersist varsa onu kullanarak (veya fallback olarak
   * bir Blob indirerek) JSON kaydet.
   */
  save(name?: string, data?: any): Promise<boolean>;

  /**
   * Harici Tpersist varsa onu kullanarak veya dogrudan verilen
   * minified JSON'dan yeni bir Tapp instance'i kurar.
   */
  load(fileOrJSON: any): Promise<Tapp | any | null>;

  /* ------------------------------------------------------------------------
   * SELECTION / LAYER KÖPRÜLERI
   * --------------------------------------------------------------------- */

  /** Selection manager icin id listesini set eder/replace eder. */
  setSelectionFrom(ids: any): this;

  /** Su anki selection'i disariya kopyalanabilir bir payload'a cevirir. */
  copySelection(mapper?: (id: any) => any): {
    type: 'selection';
    items: any[];
  } | null;

  /** Bir selection payload'unu aktif layer'a yapistirmaya calisir. */
  pasteToLayer(payload: any): boolean;

  /* ------------------------------------------------------------------------
   * SERIALIZE (events dahil)
   * --------------------------------------------------------------------- */

  /**
   * Uygulamanin minimal temsili.
   * - {$:'Tapp', opts:..., meta:{hasEvents,hasHistory}, $ev?:snapshot}
   * - Eger serializer.attachEvents varsa onun cikisini kullanir.
   * - Aksi halde TeventBridge.snapshot(root) cagrilirsa $ev eklenir.
   */
  toMinJSON(ctx?: any): any;

  /**
   * Minimal temsilden yeni bir Tapp olusturur.
   * - opts merge edilir (appOpt)
   * - eger min.$ev varsa ve el mevcutsa event handlerlar restore edilir
   */
  static fromMinJSON(min: any, ctx?: any): Tapp;

  /* ------------------------------------------------------------------------
   * KISA YOLLAR / STATICS
   * --------------------------------------------------------------------- */

  /** new Tapp(opts) kisa yolu. */
  static create(opts?: TappInitOpts): Tapp;

  /** new Tapp({ options: overrides }) kisa yolu. */
  static withDefaults(overrides?: Record<string, any>): Tapp;
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

declare const _default: typeof Tapp;
export default _default;

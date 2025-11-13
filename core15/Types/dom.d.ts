/**
 * Tdom.d.ts
 * ---------------------------------------------------------------------------
 * core/dom.js modulunun tip bildirimi ve dokumantasyonu.
 *
 * Bu modul editore ait ana tarayici/DOM bootstrap katmanidir:
 * - Sayfa yüklendiginde tekil bir global DOM yöneticisi (export const DOM)
 *   yaratır ve window.DOM olarak kaydeder.
 * - Katman sistemini (Tlayer) hazırlar: base layer ve onun alt layer'larını
 *   olusturur, selection/overlay gibi editor katmanlarini kurar.
 * - Pointer controller (TpointerController) baglantisini yapar.
 * - Seçim dikdörtgenini (marquee / selection rectangle) yönetir ve gösterir.
 * - Event köprüsü kurar: TeventBinder / TeventBridge / TfunctionRegistry ile
 *   event dinleyicilerini kaydedebilir, id'li bağlayabilir ve snapshot/restore
 *   yapabilir.
 * - CLASS.byOrder listesini yürütür: mount() / load() / body() gibi lifecycle
 *   fonksiyonlari tek tek çağırır ve 'loaded' flag'ini set eder.
 * - Stil ve script injection yardımcıları sağlar (addStyleSheet, addScript),
 *   relative yol cozulmesini kolaylastirir (getUpPath), default CSS'yi
 *   enjekte eder (selection-rectangle, pointer-events:none vb.).
 *
 * Bu d.ts dosyası Tdom'un tüm public yüzünü, alanlarını, metodlarını,
 * initialize akışını ve event/selection API'lerini ayrıntılı olarak tarif eder.
 *
 * ÖNEMLİ NOTLAR (bilinçli sınırlamalar):
 * - TpointerController, Tlayer, TeventBinder, TeventBridge, TfunctionRegistry
 *   burada 'any' olarak tiplenmiştir çünkü bu modüllerin kendi .d.ts'leri
 *   henüz tanımlanmadı. Bu tipler geldikçe buradaki 'any' referansları
 *   güncellenebilir.
 * - CLASS.byOrder içeriği de 'any' olarak tiplenmiştir; CLASS.d.ts bu listeyi
 *   netleştirdiğinde (body/mount/load signature'ları vb.) güncellenecektir.
 * - Dahili yardımcı fonksiyonlar (runAll, upPath, ensureDefaultInlineCSS vs.)
 *   dışa export edilmediği için burada ayrı export verilmez; ancak davranışları
 *   ilgili methodların JSDoc açıklamalarında detaylandı.
 *
 * Bu dosya core12 mimarisinde ana giriş noktalarından biridir. DOM tarafındaki
 * gerçek davranış (global init, layer kurulumu, event köprüsü) bu tiplerle
 * bire bir eşleşmelidir.
 */

/**
 * Tüm modul için sürüm numarası.
 * APPEND sonrası birleştirmeler ve tekrar eden kodların temizlenmesi gibi
 * revizyonları ifade eder (örn. '1.1.0').
 */
export const TdomVersion: string;

/**
 * onDOMLoad(fn):
 * ---------------------------------------------------------------------------
 * DOM tamamen yüklenince (DOMContentLoaded veya readyState 'complete'/'interactive')
 * çalıştırılmak üzere bir fonksiyon kaydeder.
 *
 * - Eğer DOM zaten hazırsa fonksiyon microtask olarak hemen kuyruğa alınır.
 * - Eğer henüz hazır değilse iç set'e kaydedilir ve ilk init'te hepsi çağrılır.
 *
 * Bu, harici modüllerin "hazır olduğunda şunu çalıştır" diyebilmesi için
 * global bir kayıt noktasıdır. Bir nevi lightweight startup hook.
 */
export function onDOMLoad(fn: (() => void) | undefined | null): void;

/**
 * Tdom sınıfı:
 * ---------------------------------------------------------------------------
 * Tekil DOM yöneticisidir. Bu sınıfın bir örneği (export const DOM) sistemin
 * aktif controller'ıdır ve otomatik olarak window.DOM'a da atanır.
 *
 * SORUMLULUKLAR:
 * 1) CSS / JS yükleme yardımcıları
 *    - addStyleSheet(): Aynı href'e sahip stil daha önce eklenmişse tekrar
 *      eklemez. link[rel=stylesheet] döndürür.
 *    - addScript():   Aynı src'ye sahip script daha önce eklenmişse tekrar
 *      eklemez. <script defer> elemanını döndürür.
 *    - setTitle():    document.title günceller.
 *    - getUpPath():   import.meta.url veya currentScript.src baz alınarak
 *      üst dizin(ler)e çıkıp base path üretir. Bu, relatif asset dosyalarını
 *      (ör. files/css/dom.css) bulmak için kullanılır.
 *
 * 2) initialize():
 *    - Yalnızca bir kez çalışır (this.loaded ile korunur).
 *    - Default inline CSS'yi yazar (selection-rectangle stili ve
 *      pointer-events:none vb.).
 *    - Tlayer varsa baseLayer kurar; gerekiyorsa createSubLayers() çağırır.
 *    - baseLayer.subLayers['selection'] varsa buraya ekstra bir Tlayer
 *      oluşturup selectionRectangle olarak saklar; yoksa doğrudan body'ye
 *      .selection-rectangle div'i enjekte eder.
 *    - TpointerController varsa yeni bir instance oluşturur ve this.pointer
 *      içine koyar. attachTo mantığı usePointer() ile de güncellenebilir.
 *    - CLASS.byOrder içindeki elemanları sırayla çalıştırır; body()/mount()/
 *      load() fonksiyonlarını çağırır ve el.loaded=true yapar.
 *
 * 3) Event köprüsü:
 *    - on():        TeventBinder.bind() varsa onu kullanır; yoksa
 *                   addEventListener ile dinleyici ekler ve off() döndürür.
 *    - onWithId():  TeventBridge.bindWithId() varsa onu kullanır.
 *                   Yoksa native addEventListener yapar, ayrıca
 *                   TfunctionRegistry.register(ns,name,fn) ile bir id üretip
 *                   { id } döndürür.
 *    - snapshotEvents():   TeventBridge.snapshot(el) varsa bunu döner.
 *    - restoreEvents():    TeventBridge.restore(el,snap) varsa uygular.
 *    Bu mekanizma event listener'ların serialize/deserialize edilmesine izin
 *    verir ve editor state'inin kaydedilip tekrar yüklenmesini mümkün kılar.
 *
 * 4) Pointer / Layer bağlama:
 *    - usePointer(): var olan bir pointer controller instance'ını takar ve
 *      gerekiyorsa ptr.attach(attachTo) çağırır.
 *    - useLayer():   harici bir Tlayer instance'ını baseLayer olarak atar ve
 *      mountTo verilmişse layer.mount(mountTo) çağırır.
 *
 * 5) Seçim dikdörtgeni API'si:
 *    - setSelectionRect(): Harici bir HTMLElement'i selectionRectangle olarak
 *      kaydet.
 *    - showSelectionRect({x,y,w,h}): Bu rect'i DOM üzerinde görünür yap ve
 *      style.left/top/width/height ile konumlandır.
 *    - hideSelectionRect(): Dikdörtgeni gizle (display:'none').
 *
 * ALANLAR:
 *    opts                → constructor'da verilen yapılandırma objesi.
 *    pointer             → TpointerController instance'ı veya null.
 *    baseLayer           → Tlayer (root layer) veya null.
 *    selectionRectangle  → HTMLElement veya null. Seçim marquee'si / highlight.
 *    loaded              → initialize() bir kez koştuktan sonra true yapılır.
 */
export class Tdom {
  /**
   * TNAME sabiti: bu sınıfın kayıtlı adı. CLASS sistemi tarafından
   * reflection / registry / serialize amaçlarıyla kullanılır.
   */
  static TNAME: 'Tdom';

  /**
   * Yeni bir Tdom yaratır. Genellikle bu sınıf manuel yaratılmaz; modul
   * otomatik olarak tek bir örnek (DOM) üretir. Ancak test/detached kullanım
   * için ikinci bir örnek oluşturmak mümkündür.
   *
   * @param opts Serbest yapılandırma nesnesi. custom pointer host, custom
   *             layer kökü vb. bilgileri barındırabilir.
   */
  constructor(opts?: Record<string, any>);

  /** Serbest yapılandırma nesnesi; initialize akışında kullanılabilir. */
  opts: Record<string, any>;

  /**
   * Aktif pointer controller instance'ı.
   * TpointerController modülü henüz tiplenmediği için 'any'.
   * initialize() içinde otomatik oluşturulabilir ya da usePointer() ile
   * harici olarak atanabilir.
   */
  pointer: any | null;

  /**
   * Katman kökü. Genellikle yeni Tlayer('div', { parent: document.body,
   * layerName:'base' }) ile oluşturulur ve createSubLayers() çağrılır.
   * Inspector overlay, selection highlight vb. sublayer'lar bu kökün
   * altında bulunur.
   */
  baseLayer: any | null;

  /**
   * Seçim dikdörtgenini temsil eden HTMLElement.
   * initialize() sırasında ya baseLayer.subLayers['selection'] içine yeni bir
   * Tlayer eklenir ve onun htmlObject'i burada tutulur, ya da doğrudan
   * document.body'ye enjekte edilen <div class="selection-rectangle"> tutulur.
   */
  selectionRectangle: HTMLElement | null;

  /**
   * initialize() çağrıldı mı? Init yalnızca ilk çağrıda tam kurulum yapar.
   */
  loaded: boolean;

  /**
   * Bir stil dosyasını (<link rel="stylesheet">) head'e enjekte eder.
   * Aynı href daha önce eklendiyse tekrar eklemez.
   * @param href   Yüklenecek stylesheet URL'si.
   * @param attrs  link elementine ekstra attribute'lar (integrity, crossorigin...)
   * @returns      Eklenen veya önceden var olan <link> elementini döndürür.
   */
  addStyleSheet(
    href: string | undefined | null,
    attrs?: Record<string, string>
  ): HTMLLinkElement | null;

  /**
   * Bir <script> elementi (varsayılan defer=true) enjekte eder. Aynı src daha
   * önce eklendiyse tekrar eklemez.
   * @param srcOrOpts  Salt string src ya da {src, defer?, type?} objesi.
   * @returns         Eklenen veya önceden var olan <script> elementini döndürür.
   */
  addScript(
    srcOrOpts:
      | string
      | {
          src?: string;
          defer?: boolean;
          type?: string;
          [key: string]: any;
        }
      | undefined
      | null
  ): HTMLScriptElement | null;

  /**
   * document.title ataması yapar.
   * @param text  Başlık olarak ayarlanacak değer.
   */
  setTitle(text: any): void;

  /**
   * import.meta.url ya da <script> tag'inin src'si baz alınarak, belirtilen
   * kadar üst dizine çıkar ve bu tabanı döndürür. Bu, runtime'da "files/css"
   * gibi asset yollarını çözmekte kullanılır.
   *
   * @param baseUrl  Zorla kullanılacak URL (opsiyonel).
   * @param up       Kaç klasör yukarı çıkılacak. Varsayılan 1.
   * @returns        Çözülmüş üst yol (slash ile biter).
   */
  getUpPath(baseUrl?: string | null, up?: number): string;

  /**
   * DOM bootstrap'ını gerçekleştirir.
   * - Tek seferliktir: this.loaded true yapılırsa yeniden çalışmaz.
   * - Varsayılan selection CSS'sini (<style id="inline:dom-defaults">)
   *   head'e yazar.
   * - Gerekirse harici dom.css dosyasını yükler (getUpPath() + 'files/css/dom.css').
   * - TpointerController varsa kurar.
   * - Tlayer varsa baseLayer kurar ve subLayers oluşturur.
   * - selectionRectangle alanını hazırlar.
   * - CLASS.byOrder içindeki her öğe için body() / mount() / load() çağırır ve
   *   el.loaded=true yapar.
   */
  initialize(): void;

  /**
   * TeventBinder varsa onu kullanarak element'e event listener bağlar.
   * Yoksa native addEventListener kullanır.
   *
   * @param el    Hedef DOM elementi veya EventTarget.
   * @param type  Event tipi ("click", "pointerdown" ...).
   * @param fn    Dinleyici fonksiyon.
   * @param opts  addEventListener opsiyonları.
   * @returns     Kaldırıcı fonksiyon (off) döndürür.
   */
  on(
    el: any,
    type: string,
    fn: EventListenerOrEventListenerObject,
    opts?: any
  ): () => void;

  /**
   * Kimlikli event bağlama.
   * - TeventBridge.bindWithId() varsa doğrudan onu kullanır.
   * - Yoksa native addEventListener ile bağlar ve TfunctionRegistry.register()
   *   ile {ns:name} benzeri bir id üretip { id } döner.
   *
   * Bu id daha sonra serialize edilip event haritasına yazılabilir.
   *
   * @param el     Hedef element / EventTarget.
   * @param type   Event tipi.
   * @param ns     Namespace / kategori (ör. 'events').
   * @param name   İnsan okunabilir isim veya fn.name.
   * @param fn     Dinleyici fonksiyon.
   * @param opts   addEventListener opsiyonları.
   * @returns      { id: string | null } şeklinde bir kayıt nesnesi.
   */
  onWithId(
    el: any,
    type: string,
    ns: string | undefined | null,
    name: string | undefined | null,
    fn: EventListenerOrEventListenerObject,
    opts?: any
  ): {
    id: string | null;
  };

  /**
   * Bir element üzerindeki event listener'ların snapshot'unu döndürür.
   * TeventBridge.snapshot(el) kullanılır; yoksa null döner.
   * Bu çıktı serializer tarafında saklanabilir.
   *
   * @param el  Kaynak element.
   * @returns   Köprü tarafından üretilen snapshot (implementation-defined) veya null.
   */
  snapshotEvents(el: any): any | null;

  /**
   * snapshotEvents() ile alınmış bir snapshot'u geri yükler.
   * TeventBridge.restore(el, snap) çağrılabiliyorsa çağırır.
   *
   * @param el    Hedef element.
   * @param snap  snapshotEvents() çıktısı.
   * @returns     this (chainable).
   */
  restoreEvents(el: any, snap: any): this;

  /**
   * Dışarıdan verilmiş bir pointer controller instance'ını bu DOM yöneticisine
   * bağlar. İstenirse ptr.attach(attachTo) çağırır.
   *
   * @param ptr       Harici pointer controller instance'ı.
   * @param options   { attachTo?: any }
   * @returns         this (chainable).
   */
  usePointer(
    ptr: any,
    options?: {
      attachTo?: any;
      [key: string]: any;
    }
  ): this;

  /**
   * Harici bir Tlayer instance'ını baseLayer olarak set eder. Eğer mountTo
   * verilmişse ve layer.mount fonksiyonu varsa, layer.mount(mountTo) çağırır.
   *
   * @param layer     Harici layer/root layer.
   * @param options   { mountTo?: any }
   * @returns         this (chainable).
   */
  useLayer(
    layer: any,
    options?: {
      mountTo?: any;
      [key: string]: any;
    }
  ): this;

  /**
   * Bu DOM yöneticisinin kullanacağı seçim dikdörtgeni elementini manüel olarak
   * set eder. initialize() içinde otomatik oluşturulan veya harici verilen
   * highlight/selection overlay HTMLElement'i olabilir.
   *
   * @param rectEl  HTMLElement veya null.
   * @returns       this (chainable).
   */
  setSelectionRect(rectEl: HTMLElement | null): this;

  /**
   * Seçim dikdörtgenini görünür hale getirir ve konum/boyut uygular.
   * r.x / r.y sol-üst koordinatları; r.w / r.h boyutlarıdır (px cinsinden).
   *
   * @param r  { x:number, y:number, w:number, h:number }
   * @returns  this (chainable).
   */
  showSelectionRect(
    r: {
      x: number;
      y: number;
      w: number;
      h: number;
      [key: string]: any;
    }
  ): this;

  /**
   * Seçim dikdörtgenini gizler (display:'none').
   * @returns this (chainable).
   */
  hideSelectionRect(): this;
}

/**
 * DOM:
 * ---------------------------------------------------------------------------
 * Bu modül yüklenirken otomatik olarak new Tdom() ile yaratılan tekil
 * örnektir. Genellikle uygulama boyunca hep bu aynı instance kullanılır.
 *
 * Ayrıca tarayıcı ortamında window.DOM = DOM yapılır; böylece harici
 * script'ler / debug konsolu bu yöneticiyi doğrudan kullanabilir.
 *
 * Bu instance modul yüklendiği anda initialize() tetiklenir (DOMContentLoaded
 * sonrası veya hemen). Böylece baseLayer, pointer controller, selection
 * rectangle ve CSS setup hazır hale gelir.
 */
export const DOM: Tdom;

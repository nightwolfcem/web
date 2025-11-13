/**
 * TlayerBridge.d.ts
 * ---------------------------------------------------------------------------
 * Katman ↔ DOM ↔ sürükle/bırak köprüsü.
 *
 * Bu modül iki ana parçadan oluşur:
 *
 * 1. class TlayerBridge
 *    - Bir Tlayer ağacını gerçek DOM ile senkron tutmaya yardım eder.
 *    - Layer'ların DOM sırasını host container içinde korur, seçim highlight
 *      uygular, pointer eventlerini çocuk layer nesnelerine yönlendirir.
 *      fileciteturn126file0
 *
 * 2. createLayerDropBridge(rootLayer, opts)
 *    - Tinteract sürükle/bırak (transfer/move/copy) akışı ile Tlayer ağacını
 *      konuşturmak için hazır bir "drag&drop policy" objesi döndürür.
 *    - accept() ile hedef uygun mu?, onDrop() ile gerçekten bırak,
 *      onHover() ile hedefi vurgula gibi callback'ler içerir.
 *      fileciteturn126file0
 *
 * Bu dosya, runtime'da mevcut olan davranışları tipler ve detaylı olarak
 * belgelendirir. Aşağıdaki açıklamalar TlayerBridge.js kaynak kodundan
 * türetilmiştir. fileciteturn126file0
 */

import type { Tlayer } from './Tlayer.js';

/* ==========================================================================
 *  createLayerDropBridge(...) OPSİYONLARI
 * ========================================================================== */

/**
 * createLayerDropBridge() için konfigürasyon.
 *
 * Bu yapı, Tinteract.drag seçeneklerine enjekte edilmek üzere üretilen
 * köprü fonksiyonlarının nasıl davranacağını belirler. Özellikle DOM üstünde
 * nerelere bırakılabilir, kapasite sınırı var mı, kopya mı yoksa taşıma mı,
 * vb. kuralları kontrol eder. fileciteturn126file0
 */
export interface TlayerDropBridgeInitOpts {
  /**
   * Sahnenin kök DOM elementi.
   * Eğer verilmezse document.body kullanılır.
   */
  rootEl?: HTMLElement | null;

  /**
   * Hedef ayırt etmek için kullanılan CSS selector'ları override edebilirsin.
   *
   * Varsayılanlar (hepsi OR ile zincirli):
   *   layer : "[data-layer],[data-layer-id], .layer"
   *   slot  : "[data-slot], .slot"
   *   drop  : "[data-drop], .droppable, [dropzone], " + layer + ", " + slot
   *
   * Bu selector'lar accept()/onDrop() aşamasında event.target üzerinden
   * en yakın geçerli hedefi (layer / slot / generic drop zone) çözmekte
   * kullanılır. fileciteturn126file0
   */
  selector?: {
    layer?: string;
    slot?: string;
    drop?: string;
    [key: string]: any;
  };

  /**
   * Hover sırasında hedef elemana eklenecek/giderilecek sınıflar.
   * Varsayılan:
   *   over     : "drop-over"
   *   accept   : "drop-accept"
   *   deny     : "drop-deny"
   *   swapHint : "drop-swap-hint"
   *
   * onHover() bu sınıfları yönetir; UI tarafında "bırakılabilir mi?",
   * "swap mi olacak?" gibi durumları görsel olarak gösterirsin. fileciteturn126file0
   */
  classes?: {
    over?: string;
    accept?: string;
    deny?: string;
    swapHint?: string;
    [key: string]: any;
  };

  /**
   * true ise bırakma (DOM reparent) sırasında çocuğun ekranda gördüğün
   * pozisyonunu korumaya çalışır:
   * - önce global (viewport) konumu ölçülür
   * - sonra yeni parent'a append edilir
   * - ardından left/top mutlak olarak ayarlanır ki görsel zıplama olmasın
   *
   * Varsayılan: true. fileciteturn126file0
   */
  preservePosition?: boolean;

  /**
   * Drop hedeflerinde kabul edilen tipleri belirlemek için kullanılan
   * attribute adı. Varsayılan "data-accept".
   *
   * Bu attribute virgülle ayrılmış CSS selector listesi tutabilir.
   * accept() her sürüklenen elemanı (group[i]) bu selector'lardan
   * en az birine uyuyor mu diye kontrol eder. Eğer uymuyorsa bırakma
   * reddedilir. fileciteturn126file0
   */
  acceptTypesAttr?: string;

  /**
   * Hedefin kaç çocuk kabul ettiğini belirleyen attribute adı.
   * Varsayılan "data-max-children".
   *
   * Eğer hedef doluysa, slotPolicy (replace / evict / swap / stack)
   * devreye girer. Örn 'swap' tek çocuklu bir slota yeni bir çocuk
   * bırakıldığında eskisini dışarı atar ve LAST_SWAP ile swap geri alma
   * (Alt tuşuyla eskiyi geri çağırma) gibi davranışlara izin verir. fileciteturn126file0
   */
  maxChildrenAttr?: string;

  /**
   * Hedef "kopyaya izin verme" bayrağı.
   * Varsayılan attribute: "data-nocopy".
   *
   * Ctrl/Cmd basılıysa drop "copy mode" sayılır. Bu attribute varsa,
   * kopyalamaya izin verilmez (yalnızca taşıma yapılır). fileciteturn126file0
   */
  noCopyAttr?: string;

  /**
   * Varsayılan slot politikası. Hedef element üzerinde
   * data-slot-policy yoksa bu kullanılır.
   *
   * Anlamlı değerler (code tarafında görülenler):
   *   'append'   : normal ekleme
   *   'replace'  : varolan bütün çocukları çıkar, yenileri koy
   *   'evict'    : kapasite aşımında en eski/ilk çocukları dışarı ata
   *   'swap'     : tek child varsa onunla yer değiştir (Alt ile geri alma)
   *   'stack'    : hepsini üst üste konumlandır (absolute, pointerEvents ayarı)
   *
   * Bu davranışlar onDrop() içinde uygulanıyor. fileciteturn126file0
   */
  slotPolicy?: string;

  /**
   * History entegrasyonu:
   * Eğer verirsen, kabul edilen bir bırakma işlemi sonunda
   * _execHistory(...) çağrılır ve move/reparent gibi DOM yeniden konumlandırma
   * adımları tek bir undo/redo komutu olarak kaydedilir.
   *
   * Bu history objesi ThistoryManager benzeri bir API bekler:
   *   - exec(label, redoFn, undoFn)
   *   - ya da push({label,undo,redo})
   *   - veya begin()/end() çifti.
   * Kaynakta bunların üç varyantı da destekleniyor. fileciteturn126file0
   */
  history?: any;

  /**
   * History commit mesajı için prefix.
   * Varsayılan 'layer'. Sonuç örn. 'layer:reparent', 'layer:swap-recall'.
   * fileciteturn126file0
   */
  labelPrefix?: string;

  /**
   * Evicted (slot dolduğu için dışarı atılan) node'ların nereye park
   * edileceğini belirleyen hedef.
   *
   * - string  → querySelector ile bulunur
   * - HTMLElement → direkt buraya append edilir
   * - function(group, ev) → runtime'da karar verilir
   *
   * Eğer verilmezse, atılan node'lar yalnızca DOM'dan kaldırılır
   * (parent=null). onDrop() bunu yönetiyor. fileciteturn126file0
   */
  evictTarget?: string | HTMLElement | ((group: any[], ev: any) => HTMLElement | null);

  /**
   * İsteğe bağlı hook'lar. onHoverTargetChanged / onEvict / onReplace /
   * onDropCommitted gibi lifecycle noktalarında çağrılır. Bunlar sana
   * UI güncelleme, logging, analytics vs. ekleme şansı verir. fileciteturn126file0
   */
  hooks?: {
    onHoverTargetChanged?: (targetEl: HTMLElement | null, info: any) => void;
    onEvict?: (evicted: any[], ctx: { target: HTMLElement; parkEl: HTMLElement | null }) => void;
    onReplace?: (evicted: any[], ctx: { target: HTMLElement; parkEl: HTMLElement | null }) => void;
    onDropCommitted?: (records: any[], ctx: { target: HTMLElement; copy: boolean }) => void;
    [key: string]: any;
  };
}

/**
 * createLayerDropBridge() çıktısı, Tinteract.drag konfigürasyonuna
 * doğrudan gömülebilir: { targetSelector, accept, onDrop, onHover, getLayer }.
 *
 * Örnek kullanım:
 *
 *   import { createLayerDropBridge } from './TlayerBridge.js';
 *
 *   const dragPolicy = createLayerDropBridge(app.layers.root, {
 *     rootEl: document.querySelector('#canvas'),
 *     history: app.history,
 *     labelPrefix: 'layer',
 *   });
 *
 *   const interact = new Tinteract(rootEl, {
 *     drag: {
 *       targetSelector : dragPolicy.targetSelector,
 *       accept         : dragPolicy.accept,
 *       onDrop         : dragPolicy.onDrop,
 *       onHover        : dragPolicy.onHover,
 *       getLayer       : dragPolicy.getLayer,
 *     },
 *     history: app.history
 *   });
 *
 * Bu şekilde Tinteract sürükleme/bırakma akışı layer ağacınla entegre
 * çalışır, tek bir drag operasyonu sonunda history.exec ile undo/redo
 * entry'si oluşur. fileciteturn126file0
 */
export interface TlayerDropBridge {
  /**
   * Hangi elementler bırakma hedefi olarak sayılacak? (CSS selector)
   * → Bunu Tinteract.drag.targetSelector olarak geçiriyoruz.
   */
  targetSelector: string;

  /**
   * Drag sırasında bir hedefe yaklaşınca çağrılır ve oraya drop izni
   * var mı diye sorar.
   *
   * @param group    Tinteract'ın aktif drag "grubu". Genelde
   *                 [{node, base:{L,T,W,H}}, ...] şeklinde girişler içerir.
   *                 node çoğunlukla bir Tlayer veya layer benzeri objedir.
   * @param targetEl O anda hover edilen DOM elemanı.
   * @param ev       PointerEvent / MouseEvent benzeri event.
   *                 Ctrl/Cmd tuşuna bakılarak "copy mode" tespit edilir.
   * @returns        true → bırakılabilir, false → reddet.
   *
   * Kurallar (koddaki accept() fonksiyonundan özet):
   * - Kendi içine / kendi alt dalına bırakamazsın (sonsuz döngü engeli).
   * - locked olan veya locked hedefe bırakamazsın.
   * - Hedef kapasiteyi aşıyorsa ve slotPolicy bu durumu handle edemiyorsa
   *   reddedilir.
   * - Eğer Ctrl/Cmd ile kopyalıyorsan ama hedef "data-nocopy" diyorsa reddedilir.
   * - Eğer hedef data-accept="..." tanımlamışsa, sürüklediğin elemanın
   *   DOM'u bu selector'larla eşleşmek zorunda. fileciteturn126file0
   */
  accept(
    group: any[],
    targetEl: HTMLElement | null,
    ev: any
  ): boolean;

  /**
   * Bırakmayı gerçekten uygular.
   *
   * @param group    Aktif drag grubu (aynı yapı accept()'teki gibi).
   * @param targetEl Hedef DOM elemanı.
   * @param ev       Mouse/Pointer event. Alt tuşu vs. bazı özel davranışlar
   *                 (ör. 'swap' slotPolicy'sinde Alt ile eski node'u geri çağırma)
   *                 için okunur.
   * @param ctx      Ek bağlam (ör. { data } gibi Tinteract.drag.data()).
   * @returns        true → bırakma başarılı; false → reddedildi.
   *
   * Davranış özet:
   * - Kapasite/slotPolicy kontrol edilir:
   *   • 'replace' : hedefteki tüm çocuklar atılır, yeni grup konur.
   *   • 'evict'   : fazla çocuklar park alanına (evictTarget) taşınır.
   *   • 'swap'    : tek slotlu hedefte mevcut node ile gelen node yer değiştirir,
   *                 LAST_SWAP ile "geri al" davranışı desteklenir.
   *   • 'stack'   : hepsi üst üste bindirilir (absolute konum).
   *
   * - Eğer hedef bir Tlayer ise, mümkün olduğunca Tlayer API'si üzerinden
   *   (append/appendChild) reparent yapılır ki model durumu da güncellensin.
   *   Eğer hedef bir Tlayer değilse düz DOM reparent yapılır ve konum
   *   preservePosition=true ise görsel sıçrama olmaması için left/top yeniden
   *   yazılır.
   *
   * - Tüm hareketler sonrasında tek bir undo/redo entry'si oluşturmak için
   *   _execHistory(...) çağrılır. fileciteturn126file0
   */
  onDrop(
    group: any[],
    targetEl: HTMLElement | null,
    ev: any,
    ctx: { data: any }
  ): boolean | void;

  /**
   * Hover feedback. Drag sürerken sürekli çağrılır.
   *
   * @param group    Drag grubu
   * @param targetEl Şu anki hedef
   * @param info     Ek bilgi { phase, accepted, keys:{altKey,...} }
   *
   * Bu fonksiyon hedef elemana CSS sınıfları ekler/çıkarır
   * (over/accept/deny/swapHint). Ayrıca hooks.onHoverTargetChanged varsa
   * onu da çağırır. Bu sayede UI tarafında "bura kabul ediyor / etmiyor"
   * overlay'i gösterebilirsin. fileciteturn126file0
   */
  onHover(
    group: any[],
    targetEl: HTMLElement | null,
    info: any
  ): void;

  /**
   * Hedeflenen gerçek katman/slot DOM'unu döndürür.
   * Tinteract.drag.getLayer olarak kullanılır.
   *
   * Bu genelde resolveTarget() sonucundaki .el değeridir (slot/layer/drop
   * gibi). Gerekirse sahne kökü fallback olarak döner. fileciteturn126file0
   */
  getLayer(targetEl: HTMLElement | null): HTMLElement | null;

  /** Kullanılan CSS sınıf isimleri ve selector seti (debug/inspect amaçlı). */
  classes: Record<string, any>;
  selector: Record<string, any>;
}

/**
 * createLayerDropBridge
 * ---------------------
 * @param rootLayer  Sahnedeki en üst Tlayer düğümü (zorunlu). Eğer Tlayer
 *                   değilse hata fırlatır.
 * @param opts       Davranış konfigürasyonu (bkz TlayerDropBridgeInitOpts).
 * @returns          Tinteract.drag için uyumlu policy objesi
 *                   ({targetSelector, accept, onDrop, onHover, getLayer}).
 *
 * Bu köprü, drag&drop'da:
 * - hiyerarşi döngülerini engeller (kendi içine bırakamazsın),
 * - slot kapasitesini ve policy'sini yönetir (replace/evict/swap/stack),
 * - copy vs move (Ctrl/Cmd) davranışını ayırt eder,
 * - tek history kaydı üretir.
 * Tüm bu kurallar TlayerBridge.js'teki accept()/onDrop() akışında uygulanır. fileciteturn126file0
 */
export function createLayerDropBridge(
  rootLayer: Tlayer,
  opts?: TlayerDropBridgeInitOpts
): TlayerDropBridge;

/* ==========================================================================
 *  TlayerBridge SINIFI
 * ========================================================================== */

/**
 * TlayerBridge
 * -------------
 * Bu sınıf runtime'da var kabul edilen (globalde tanımlı olabilen)
 * köprü sınıfıdır. TlayerBridge.js dosyasında, sınıfın prototipine
 * bir dizi yardımcı metod ekleniyor:
 *   - attach()
 *   - detach()
 *   - syncDomOrder()
 *   - applySelection()
 *   - enablePointerBridge()
 *
 * Not: Orijinal JS dosyasında `class TlayerBridge` tanımı bu dosyada
 * doğrudan görülmüyor; ama IIFE içinde `if (typeof TlayerBridge !== 'undefined')`
 * kontrolü ile prototip genişletiliyor. Bu d.ts, o beklenen API'yi
 * tek yerde toplam bir sözleşme (contract) olarak sağlar. fileciteturn126file0
 */
export class TlayerBridge {
  /**
   * Kurucu; history / render vb. bağımlılıkları alabilir.
   * Kaynakta constructor(opts) imzası bekleniyor ama tip içeriği esnek
   * tutuluyor. (render, history, observe gibi alanlar olabilir.)
   */
  constructor(opts?: Record<string, any>);

  /**
   * attach(layer, hostEl)
   * ---------------------
   * Bir Tlayer ağacını belirli bir host DOM container'a monte eder.
   *
   * - layer çocuklarının .el (veya .mount()) üzerinden DOM'a eklenmesini
   *   garanti eder.
   * - Çocuk sırası (layer.children) ile DOM child sırasını hizalar.
   * - Eğer child.mount(host) varsa onu çağırır.
   *
   * @param layer   Tlayer örneği (veya layer-benzeri nesne).
   * @param hostEl  Hangi DOM container'ın içine yerleştirileceği.
   * @returns this  chainable.
   *
   * Kullanım örneği:
   *   bridge.attach(app.layers.root, document.querySelector('#scene'));
   *
   * Bu sayede layer ağacın DOM karşılığı tek satırda host içine girer. fileciteturn126file0
   */
  attach(layer: any, hostEl: HTMLElement): this;

  /**
   * detach()
   * --------
   * Daha önce attach() ile host'a monte edilen layer DOM'unu
   * host'tan çıkarır ama layer objesini yok etmez.
   *
   * - layer.el parentNode'dan removeChild yapılır.
   * - Daha önce enablePointerBridge() ile bağlanan pointer listener'ları
   *   kapatılır.
   *
   * @returns this
   */
  detach(): this;

  /**
   * syncDomOrder()
   * --------------
   * Layer.children sırasına göre gerçek DOM child sırasını yeniden
   * hizalar. Eğer bir child henüz mount edilmemişse child.mount(parentEl)
   * çağrılmaya çalışılır.
   *
   * Bu metod; external manipülasyonla DOM sırası bozulduysa veya
   * children array'i programatik olarak reorder edildiğinde çağrılır. fileciteturn126file0
   *
   * @returns this
   */
  syncDomOrder(): this;

  /**
   * applySelection(selection)
   * -------------------------
   * Seçim durumuna göre (Tselection benzeri), her child layer'ın
   * .el elementine 'is-selected' sınıfını ekler / çıkarır.
   *
   * Beklenti:
   *   selection.items → seçili nesnelerin id listesine benzer bir şey
   *   veya selection.list() benzeri API.
   *
   * Bu, sahnede hangi öğelerin seçili olduğuna dair görsel highlight
   * göstermek için kullanılır.
   *
   * @param selection  Tselection veya benzeri.
   * @returns this
   */
  applySelection(selection: any): this;

  /**
   * enablePointerBridge()
   * ---------------------
   * Host container (attach sırasında verdiğin hostEl) üzerindeki
   * pointerdown/pointermove/pointerup eventlerini yakalar ve
   * bu eventleri ilgili child layer nesnelerine forward eder:
   *
   *   - çocuğu bulmak için event.target'tan yukarı doğru çıkar
   *   - eğer child.onPointerDown / onPointerMove / onPointerUp varsa
   *     onları çağırır
   *
   * Bu sayede tek bir üst container dinleyicisi ile tüm alt layer
   * nesneleri pointer olayları alır. (Delegation yaklaşımı.)
   *
   * @returns this
   */
  enablePointerBridge(): this;
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

/**
 * Default export'ta sadece createLayerDropBridge fonksiyonunu içeren
 * küçük bir nesne döner. Bu, orijinal kaynaktaki
 *   export default { createLayerDropBridge }
 * yapısına denk gelir. fileciteturn126file0
 */
declare const _default: {
  createLayerDropBridge: typeof createLayerDropBridge;
};

export default _default;

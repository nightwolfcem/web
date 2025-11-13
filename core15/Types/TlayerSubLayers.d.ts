/**
 * subLayers.d.ts
 * ---------------------------------------------------------------------------
 * Slot / sub-layer yöneticisi.
 *
 * Amaç:
 *  - Bir Tlayer için (veya Tlayer-benzeri nesne için) standart alt-slotları
 *    (background, base, content, overlay, selection, ... ) DOM içinde
 *    garanti eder. (data-slot="content" gibi div'ler yaratır.)
 *  - Bu slotların pointerEvents politikasını (auto / none) uygular.
 *  - Slot sırasını Olayers (const.enums.d.ts içindeki Olayers ordinal'i)
 *    + DEFAULT_ORDER üzerinden tek kaynaktan belirler. fileciteturn127file1
 *
 * Bu yardımcı tek bir statik API sunar: subLayers.ensure(...).
 *
 * Örnek kullanım:
 *   // layer bir Tlayer örneği olsun
 *   subLayers.ensure(layer, true, {
 *     pointerPolicy: {
 *       content: 'auto',      // kullanıcı tıklayabilsin
 *       overlay: 'none',      // tıklanmasın
 *       selection: 'none'     // sadece highlight
 *     }
 *   });
 *
 *   // sadece belli slotları (mesela { content:true, overlay:true }) kur:
 *   subLayers.ensure(layer, { content:true, overlay:true });
 *
 *   // ya da manuel sırayla:
 *   subLayers.ensure(layer, ['content','overlay','selection']);
 */

import type { Tlayer } from './Tlayer.js';

/**
 * ensure(...) için options.
 *
 * order :
 *    Slot dizilimini kendin vermek istersen. Eğer verilmezse,
 *    DEFAULT_ORDER + Olayers birleşimi kullanılır (çakışmasız birleştirme).
 *
 * strict :
 *    true ise DEFAULT_ORDER dışında kalan slot isimleri zorlama ile
 *    yaratılmaz (ör. beklenmeyen/custom isimleri atlar). false ise
 *    hepsi için slot yaratabilir.
 *
 * pointerPolicy :
 *    Hangi slota hangi pointer-events kuralı uygulanacak.
 *    Varsayılan politika:
 *      - 'content' → 'auto'
 *      - diğer her şey → 'none'
 *    Bu, slot DOM elemanlarının style.pointerEvents alanına yazılır.
 */
export interface subLayersEnsureOptions {
  order?: string[];
  strict?: boolean;
  pointerPolicy?: Record<string, string>;
}

/**
 * spec parametresi:
 *
 *  - true
 *      → tüm bilinen slotlar garanti edilir
 *
 *  - string[]
 *      → sadece bu listedeki slot isimleri garanti edilir
 *
 *  - { [slotName]: boolean }
 *      → true olan slot isimleri garanti edilir
 *
 *  - undefined / null
 *      → varsayılan sıra (DEFAULT_ORDER + Olayers) garanti edilir
 */
export type subLayersSpec =
  | true
  | string[]
  | Record<string, boolean>
  | null
  | undefined;

/**
 * subLayers
 * ---------------
 * Sadece statik yardımcılar içerir. Runtime'da CLASS(...) ile bir sınıf
 * olarak tanımlanır ama örnek (instance) oluşturmazsın. fileciteturn127file1
 *
 * Ana iş akışı:
 *    - host DOM'u bul (layer.el / layer.host / layer.element / layer.root)
 *    - her hedef slot için data-slot="name" + class="tlayer-slot tlayer-name"
 *      olan bir <div> var mı bak
 *    - yoksa yarat ve host.appendChild ile ekle
 *    - pointerPolicy uygula
 *
 * Ayrıca pointerPolicy uygularken Olayers + DEFAULT_ORDER birleşimindeki
 * tüm slot isimlerini döner ve her slot için style.pointerEvents ayarlar.
 */
export class subLayers {
  /**
   * ensure(layer, spec, options)
   * ----------------------------
   * @param layer    Tlayer örneği (zorunlu). Eğer gerçek bir Tlayer
   *                 değilse geri dokunmadan aynen döndürür.
   *
   * @param spec     Hangi slotların zorunlu olacağını belirler.
   *                 Bkz. subLayersSpec.
   *
   * @param options  Davranış ayarları (order, strict, pointerPolicy).
   *
   * @returns        Aynı layer nesnesi (chain-like kullanım için).
   *
   * Ayrıntı:
   *  - options.order verilirse o sıra baz alınır.
   *    Verilmezse DEFAULT_ORDER + Olayers listesi birleştirilir
   *    (uniqMerge). DEFAULT_ORDER: ['background','base','content',
   *    'overlay','selection'] gibi editörde kritik katman adlarıdır
   *    (subLayers.js içinden). fileciteturn127file1
   *
   *  - pointerPolicy ile slot bazlı pointer-events kontrol edilir.
   *    İçeride _applyPointerPolicy(layer, policy) bunu yapar ve
   *    'content' için genelde 'auto', diğerleri için 'none' yazar ki
   *    overlay / selection gibi üst katmanlar tıklamayı bloke etmesin.
   *
   *  - Her slot gerçek DOM'da şu şekilde yaratılır (yoksa):
   *      <div data-slot="overlay" class="tlayer-slot tlayer-overlay"></div>
   *    Bu slot referansı layer.__extraSlots[name] içine da cache'lenir.
   *
   * Kullanım örneği:
   *    const panelLayer = layers.create({ name:'panel' });
   *    subLayers.ensure(panelLayer, true, {
   *      pointerPolicy: { content:'auto', overlay:'none', selection:'none' }
   *    });
   *
   * Bu çağrıdan sonra panelLayer.el altında garantili slot DOM'ları olur
   * ve overlay/selection gibi üst katmanlar da tıklanmaz hale gelir.
   */
  static ensure(
    layer: Tlayer,
    spec?: subLayersSpec,
    options?: subLayersEnsureOptions
  ): Tlayer;
}

/* no default export in runtime (module sadece named export kullanıyor) */
export default subLayers;

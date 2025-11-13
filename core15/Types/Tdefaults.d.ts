/**
 * Tdefaults.d.ts
 * ---------------------------------------------------------------------------
 * Global varsayılan config üreticisi.
 *
 * Bu modül uygulama/editor için başlangıç yapı taşlarını tek yerde toplar:
 *
 *   - root:
 *       Hangi host element yaratılacak (tag, class, ...).
 *       TappSetup.ensureRoot() bunu kullanır.
 *
 *   - layers:
 *       Ana layer ağacı ve alt layer şablonu.
 *       TappSetup.ensureLayers() bunu kullanır.
 *
 *   - styles:
 *       Hangi css dosyaları yüklenecek (loadFiles) ve hangi inline <style>
 *       snippet'leri base olarak enjekte edilecek (base[]).
 *       TappSetup.injectDefaultStyles() bunu kullanır.
 *
 *   - history / serializer / stylesPolicy:
 *       Tglobals.applyToHistory(), Tglobals.applyToSerializer(),
 *       Tglobals.applyToStyles() için politika presetleri.
 *
 *   - interact:
 *       Pointer davranışı için default ayarlar (ör. dragThreshold).
 *       TappSetup.apply() bunları app'in pointer/pointerController benzeri
 *       servisine uygular.
 *
 * Normal akış:
 *
 *   const app = new Tapp(...);
 *   const defs = Tdefaults.all(); // veya dışarıdan override edilmiş config
 *   TappSetup.apply(app, defs);
 *
 * Buradaki tipler sadece sözleşmeyi tanımlar. Runtime Tdefaults.js gerçek
 * değerleri döndürür.
 */

import type { TRootOpts, TLayersOpts, TAppDefaults } from './TappSetup.js';

/* ==========================================================================
 *  ANA SINIF / API
 * ========================================================================== */

/**
 * Tdefaults
 * ---------------------------------------------------------------------------
 * Factory-style statik yardımcılar. Genelde instance yaratılmaz; sadece
 * statik metotlar çağrılır.
 */
export class Tdefaults {
  /**
   * Tüm varsayılanları tek obje halinde döndürür.
   *
   * Dönen obje tipik olarak şu alanları içerir:
   *   {
   *     root:    { tag:'div', class:'tapp-root', ... },
   *     layers:  { subLayers:true | [...], order:... },
   *     styles:  { loadFiles:[...], base:[ '...', '...' ] },
   *     history: { ...policy... },
   *     serializer: { ...policy... },
   *     stylesPolicy: { ...policy... },
   *     interact: { dragThreshold: number, ... }
   *   }
   *
   * NOT: Bu obje mutable olabilir ama TappSetup.apply() genelde onu direkt
   * tüketip kendi iç servislerine uygular. Yani dışarıdan değiştirip global
   * davranışı bozmak istemiyorsan kopyalayarak kullan.
   */
  static all(): TAppDefaults;

  /**
   * Sadece kök host oluşturma preset'i.
   * Örnek dönüş:
   *   {
   *     tag: 'div',
   *     class: 'tapp-root'
   *   }
   *
   * TappSetup.ensureRoot(app, defs.root) içinde kullanılır.
   */
  static root(): TRootOpts;

  /**
   * Layer ağacını kurmak için kullanılan şablon.
   *
   * Örnek dönüş:
   *   {
   *     subLayers: true
   *     // veya ['background','content','overlay','selection',...]
   *     order: [...optional override...]
   *   }
   *
   * TappSetup.ensureLayers(app, root, defs.layers) içinde kullanılır.
   */
  static layers(): TLayersOpts;

  /**
   * Stil / tema / base CSS presetleri.
   *
   * Dönüş yapısı tipik olarak:
   *   {
   *     loadFiles: [ 'core.css', 'theme-dark.css', ... ],
   *     base: [
   *       '.Telement{ box-sizing:border-box; }',
   *       '.marquee-rect{ outline:1px dashed rgba(0,0,0,.4); }',
   *       '.selected{ outline:2px solid var(--accent); }',
   *       ...
   *     ]
   *   }
   *
   * Bu bilgiler TappSetup.injectDefaultStyles(defs.styles) ile <head> içine
   * enjekte edilir. Eğer base[] boşsa TappSetup kendi minimum fallback CSS'ini
   * yazar.
   */
  static styles(): {
    loadFiles?: any[];
    base?: string[];
    [key: string]: any;
  };

  /**
   * Pointer / etkileşim defaultları.
   *
   * Örnek dönüş:
   *   {
   *     dragThreshold: 3
   *   }
   *
   * TappSetup.apply() bu eşiği app.get('pointer') veya benzeri servise
   * aktarabilir; dragThreshold kullanıcı bir şey sürüklemeye başlamadan önce
   * kaç px tolerans olacağını belirler.
   */
  static interact(): {
    dragThreshold?: number;
    [key: string]: any;
  };

  /**
   * Üst seviye politika presetleri.
   *
   * Bunlar direkt olarak Tglobals.applyToHistory / applyToSerializer /
   * applyToStyles fonksiyonlarına gider.
   *
   * Örnek dönüş kabaca şöyle olabilir:
   *   {
   *     history: {
   *       trackMask: EhistoryTrack.all,
   *       // DOM değişikliklerinden hangileri undo/redo stack'e alınacak...
   *     },
   *     serializer: {
   *       captureEvents: true,
   *       // snapshot sırasında event handler'ları da yakala mı...
   *     },
   *     stylesPolicy: {
   *       // tema / renk paleti / spacing scale vs.
   *     }
   *   }
   *
   * Bu yapı doğrudan TappSetup.applyPolicies(app, defs) içinde tüketilir.
   */
  static policies(): {
    history?: any;
    serializer?: any;
    stylesPolicy?: any;
    [key: string]: any;
  };

  /**
   * Verilen override ile yeni bir defaults objesi döndürür.
   *
   * Bu, embed modları / readonly mod / tema değişimi gibi durumlarda kullanılır.
   *
   * Örnek:
   *   const defs = Tdefaults.with({
   *     interact: { dragThreshold: 8 },
   *     root: { class: 'mini-editor-root' },
   *     styles: {
   *       base: [
   *         '.Telement{box-sizing:border-box;}',
   *         '.tinteract-overlay{pointer-events:none;}'
   *       ]
   *     }
   *   });
   *
   * Bu metodun mantığı tipik olarak
   *   defs = deepClone(Tdefaults.all());
   *   deepMerge(defs, patch);
   *   return defs;
   *
   * şeklindedir. Yani orijinal global preset'i bozmadan sana yeni bir
   * TAppDefaults döner.
   */
  static with(patch?: Partial<TAppDefaults>): TAppDefaults;
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

/**
 * Runtime tarafında genelde
 *   export const Tdefaults = CLASS(class Tdefaults {...})
 *   export default Tdefaults
 * benzeri bir pattern vardır. Burada hem named hem default export aynı
 * referansı temsil eder.
 */
declare const _default: typeof Tdefaults;
export default _default;

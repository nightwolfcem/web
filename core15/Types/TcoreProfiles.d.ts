/** TcoreProfiles.d.ts
 *
 * Uygulama kurulum profilleri.
 *
 * Bu map, createAppWithProfile() içinde kullanılır.
 * Her profil ismi (ör: "editor") bir servis listesine denk gelir.
 * Bu servis isimleri CLASS.install(...) için kullanılır ve
 * ilgili modülün kendi installX(app, opts) fonksiyonunu çağırmak için kullanılır.
 *
 * Örnek:
 *   import { TcoreProfiles } from "./TcoreProfiles.js";
 *   console.log(TcoreProfiles.editor);
 *   // ["history","selection","pointer",...]
 */
export interface TcoreProfileMap {
  /**
   * Tam editör profili.
   * history, undo/redo, selection, pointer etkileşim,
   * snap (kılavuz/grid), serializer (export/import),
   * persist (autosave), clipboard, shortcut (kısayollar),
   * inspector (property panel senk)
   */
  editor: string[];

  /**
   * Sadece görüntüleme profili.
   * selection, pointer, serializer.
   * (Düzenleme komutları, undo stack vb yoktur.)
   */
  viewer: string[];

  /**
   * Debug profili.
   * selection + pointer + inspector.
   * (Temel etkileşim ve inceleme paneli)
   */
  debug: string[];
}

export declare const TcoreProfiles: TcoreProfileMap;

export default TcoreProfiles;

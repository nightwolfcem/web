/**
 * Ttheme.d.ts
 * ---------------------------------------------------------------------------
 * Tema token yöneticisi + CSS variable üretici + history (undo/redo) entegrasyonu. fileciteturn130file0
 *
 * Bu modül iki ana sınıf export eder:
 *
 * - TthemePatch  → ThistoryManager için tek bir "tema patch" komutu.
 *                  undo/redo bilir ve ardışık patch'leri mergeWith() ile
 *                  tek history kaydına birleştirebilir.
 *
 * - Ttheme       → Gerçek tema nesnesi.
 *                  * nested token objesini tutar (this.tokens)
 *                  * token'ları CSS custom property (`--ui-color-bg` gibi)
 *                    haline çevirir
 *                  * bu değişkenleri <style> içine (applyTo) ya da direkt
 *                    inline style.setProperty(...) olarak uygular
 *                  * history varsa .set() / .remove() / .patch() çağrıları
 *                    otomatik olarak ThistoryManager.exec(...) içinden
 *                    geçer, böylece undo/redo yapılabilir. fileciteturn130file0
 *
 * Örnek kullanım:
 *
 *   const theme = new Ttheme('editor', {
 *     prefix: 'ui',
 *     scope: ':root',
 *     tokens: {
 *       color: { bg: '#1e1e1e', text: '#fff' },
 *       spacing: { xs: 4, sm: 8, md: 16 }
 *     },
 *     history: app.history
 *   });
 *
 *   // Tek bir anahtar güncelle
 *   theme.set('color.bg', '#000', { label:'theme:set-bg' });
 *
 *   // Birden çok anahtarı tek seferde (deep merge)
 *   theme.setTokens({
 *     color: { accent: '#4af' },
 *     radius: { sm: 2, md: 4 }
 *   });
 *
 *   // <style id="Ttheme-editor"> içine tüm CSS değişkenlerini yaz
 *   theme.applyTo(document.documentElement, { inline:false });
 *
 *   // inline mod (sadece bu elemente uygula, stylesheet üretme)
 *   someEl && theme.applyTo(someEl, { inline:true });
 *
 * Event'ler:
 *   theme.on('change', e => {
 *     // e.reason === 'patch' | 'prefix' | 'scope' | 'merge'
 *     // e.tokens güncel nested token objesi vb.
 *   });
 *
 *   theme.on('apply', e => {
 *     // { mode:'inline', target }  veya
 *     // { mode:'stylesheet', selector, el:<style> }
 *   });
 */

/* -------------------------------------------------------------------------
 * Utility tipler
 * ---------------------------------------------------------------------- */

/** Tek bir patch işlemi: set edilen anahtarlar + silinecek anahtar listesi. */
export interface TthemePatchData {
  /** "level.color.bg": "#000" gibi düzleştirilmiş değerler. */
  set?: Record<string, any>;
  /** Silinecek token path'leri. */
  remove?: string[];
}

/**
 * Ttheme.change event payload'ı.
 * reason:
 *   - 'prefix'  : .setPrefix() çağrıldı
 *   - 'scope'   : .setScope() çağrıldı
 *   - 'patch'   : .applyPatch() / _commit() ile token değişti
 *   - 'merge'   : .merge() ile dışarıdan objeyle kaynaştırıldı
 */
export interface TthemeChangeEvent {
  reason: 'prefix' | 'scope' | 'patch' | 'merge';
  /** Yeni prefix (prefix/scope değişiminde mevcut). */
  prefix?: string;
  /** Yeni scope selector'ü (prefix/scope değişiminde mevcut). */
  scope?: string;
  /** Uygulanan patch içindeki set/remove bilgisi (patch sırasında). */
  set?: Record<string, any>;
  remove?: string[];
  /** Güncel tüm token ağacı (nested obje). */
  tokens?: Record<string, any>;
}

/**
 * Ttheme.apply event payload'ı.
 *
 * - inline modunda:
 *   { mode:'inline', target: HTMLElement }
 *
 * - stylesheet modunda:
 *   { mode:'stylesheet', selector: ':root', el: HTMLStyleElement }
 */
export interface TthemeApplyEvent {
  mode: 'inline' | 'stylesheet';
  selector?: string;
  el?: HTMLStyleElement | null;
  target?: HTMLElement | null;
}

/** Ttheme constructor opsiyonları. */
export interface TthemeInitOpts {
  /** CSS custom property prefix'i. Varsayılan: 'ui' → --ui-color-bg */
  prefix?: string;
  /** CSS'in hangi selector'e yazılacağı. Varsayılan ':root'. */
  scope?: string;
  /**
   * Nested token objesi. Örn:
   * {
   *   color:{ bg:'#000', text:'#fff' },
   *   spacing:{ sm:8, md:16 }
   * }
   */
  tokens?: Record<string, any> | null;
  /**
   * History objesi (ThistoryManager uyumlu).
   * Varsa tüm mutasyonlar history.exec(new TthemePatch(...))
   * olarak kaydedilir ki undo/redo mümkün olsun. */
  history?: any | null;
}

/** .compute toVarsMap() çıktı tipi: CSS custom property adı → değer. */
export type TthemeVarsMap = Record<string, string>;

/* -------------------------------------------------------------------------
 * TthemePatch
 * ---------------------------------------------------------------------- */

/**
 * TthemePatch
 * -----------
 * History komutu. Bir tema patch'ini (set/remove) uygular ve geri alır.
 *
 * - do()   : this.theme.applyPatch(patch)
 * - undo() : _undo bilgisine göre geri çevirir
 * - mergeWith() : aynı theme için ardışık patch'leri tek komuta birleştirir
 *
 * History tarafı bunu TselectionChange gibi `history.exec(cmd,{tryMerge})`
 * şeklinde kullanır; tryMerge=true iken art arda gelen küçük değişiklikler
 * tek history satırına gömülür. fileciteturn130file0
 */
export class TthemePatch {
  /** Hedef tema nesnesi. */
  theme: Ttheme;

  /** İleriye uygulanacak patch. */
  patch: Required<TthemePatchData>;

  /** undo() için hazırlanmış ters patch. İlk do() sırasında doldurulur. */
  protected _undo: TthemePatchData | null;

  constructor(theme: Ttheme, patch: TthemePatchData, label?: string);

  /** patch'i uygular. History'de redo olarak da kullanılır. */
  do(): void;

  /** patch'i geri alır. */
  undo(): void;

  /**
   * History snapshot'ı üretir.
   * { type:'theme', patch:{ set:{...}, remove:[...] } }
   */
  toPatch(): { type: 'theme'; patch: TthemePatchData };

  /**
   * Aynı theme üzerinde başka bir TthemePatch ile birleştir.
   * Sonuç tek komutta toplanmış olur ve true döner.
   * Farklı theme ise false döner.
   */
  mergeWith(n: TthemePatch): boolean;
}

/* -------------------------------------------------------------------------
 * Ttheme
 * ---------------------------------------------------------------------- */

/**
 * Ttheme
 * ------
 * Token deposu + CSS değişken üretici.
 *
 * 1. Token CRUD
 *    theme.set('color.bg','#000')
 *    theme.remove('radius.sm')
 *    theme.patch({ set:{'a.b':123}, remove:['c'] })
 *
 *    Bunlar _commit() üzerinden gider. `this.history` varsa:
 *      history.exec(new TthemePatch(...), { label, tryMerge })
 *    yoksa doğrudan applyPatch(patch) çağrılır. → Yani undo/redo entegrasyonu
 *    otomatik hale gelir. fileciteturn130file0
 *
 * 2. CSS üretimi
 *    theme.toVarsMap()
 *      => { '--ui-color-bg':'#000', '--ui-color-text':'#fff', ... }
 *
 *    theme.toCSS()
 *      => ":root {\n  --ui-color-bg:#000;\n  --ui-color-text:#fff;\n}"
 *
 *    theme.applyTo(target,{inline:true})
 *      => her değişkeni target.style.setProperty(...) ile yazar.
 *
 *    theme.applyTo(document.documentElement,{inline:false})
 *      => <style id="Ttheme-editor">/* ... *\/ ekler/günceller.
 *
 * 3. Event yayma
 *    - 'change' (prefix/scope/patch/merge)
 *    - 'apply'  (inline ya da stylesheet uygulandı)
 *
 * 4. Serialize
 *    - toMinJSON(): { type:'Ttheme', args:[ id, {prefix,scope,tokens} ] }
 *    - toJSON(): insan okunabilir debug dump
 */
export class Ttheme {
  /** Bu temanın kimliği (örn. 'editor'). */
  id: string;

  /** CSS var prefix'i (örn. 'ui'). `--ui-color-bg` gibi. */
  prefix: string;

  /** CSS çıktısının selector'ü (örn. ':root', '.MyScope'). */
  scope: string;

  /** Tüm token ağacı (nested obje). */
  tokens: Record<string, any>;

  /** Undo/redo yöneticisi (ThistoryManager benzeri) ya da null. */
  history: any | null;

  /** applyTo({inline:false}) ile oluşturulan <style> etiketi referansı. */
  protected _styleEl: HTMLStyleElement | null;

  constructor(id?: string, opts?: TthemeInitOpts);

  /** History bağla/değiştir. chainable. */
  bindHistory(h: any | null): this;

  /** Prefix'i güncelle ve 'change' yay. chainable. */
  setPrefix(p: string): this;

  /** Scope selector'ünü güncelle ve 'change' yay. chainable. */
  setScope(sel: string): this;

  /* ----- Token CRUD ---------------------------------------------------- */

  /** Bu key mevcut mu? (nested path: 'color.bg' vb.) */
  has(key: string): boolean;

  /** Token değerini al, yoksa dflt dön. */
  get(key: string, dflt?: any): any;

  /**
   * Tek bir anahtar yaz.
   * History-aware. chainable.
   */
  set(
    key: string,
    val: any,
    opts?: { label?: string; tryMerge?: boolean }
  ): this;

  /**
   * Tek bir anahtarı sil.
   * History-aware. chainable.
   */
  remove(
    key: string,
    opts?: { label?: string; tryMerge?: boolean }
  ): this;

  /**
   * Birden fazla key aynı anda set/remove etmek için toplu patch.
   * History-aware. chainable.
   */
  patch(
    all: { set?: Record<string, any>; remove?: string[] },
    opts?: { label?: string; tryMerge?: boolean }
  ): this;

  /**
   * Nested obje merge (derin). Örn:
   *   theme.setTokens({ color:{accent:'#4af'} })
   * hepsini düz key map'e çevirip tek patch olarak uygular.
   * History-aware. chainable.
   */
  setTokens(
    obj: Record<string, any>,
    opts?: { label?: string; tryMerge?: boolean }
  ): this;

  /**
   * patch'i doğrudan uygular:
   *  - set -> _set()
   *  - remove -> _del()
   * ardından 'change' event'i yayar.
   * internal olarak da chainable davranır.
   */
  applyPatch(patch: TthemePatchData): this;

  /* ----- CSS üretimi / DOM'a uygulama --------------------------------- */

  /**
   * Tüm tokenları düzleştirip { '--ui-x-y':'val' } map'i döner.
   * $foo.bar şeklindeki string değerler otomatik olarak
   * var(--ui-foo-bar) referansına çevrilir. (Yani alias chaining.)
   */
  toVarsMap(): TthemeVarsMap;

  /**
   * Tüm değişkenleri bir CSS kuralı halinde döndürür:
   *
   *   ":root {\n  --ui-color-bg:#000;\n  --ui-color-text:#fff;\n}"
   */
  toCSS(opts?: { selector?: string }): string;

  /**
   * CSS'i gerçek DOM'a uygula.
   *
   * inline=true  → her property target.style.setProperty(...)
   * inline=false → <style id="Ttheme-${this.id}">...</style> oluştur/güncelle
   *
   * Ayrıca 'apply' event'i yayar.
   *
   * Döner: true/false (DOM yoksa false olabilir).
   */
  applyTo(
    target?: HTMLElement | null,
    opts?: {
      inline?: boolean;
      selector?: string;
      styleId?: string | null;
    }
  ): boolean;

  /**
   * Daha önce applyTo({inline:false}) ile eklenen <style> etiketini
   * dokümandan kaldırır.
   */
  removeFromDoc(styleId?: string | null): boolean;

  /* ----- Internal history bridge -------------------------------------- */

  /**
   * patch'i ya history.exec(new TthemePatch(...)) ile kaydeder
   * ya da doğrudan applyPatch() çağırır.
   * Her zaman this döndürür (chainable).
   */
  protected _commit(
    patch: TthemePatchData,
    opts?: { label?: string; tryMerge?: boolean }
  ): this;

  /* ----- Serialize / utils ------------------------------------------- */

  /**
   * Küçük snapshot:
   * { type:'Ttheme', args:[ id, { prefix,scope,tokens } ] }
   * Persist/paketleme için kullanılır.
   */
  toMinJSON(): any;

  /**
   * Daha okunabilir debug snapshot:
   * { type:'ns:Ttheme', id, prefix, scope, tokens }
   */
  toJSON(): any;

  /**
   * Dışarıdan gelen obje ile (tokens/prefix/scope) merge et.
   * Derin token merge yapılır, sonra 'change' {reason:'merge'} yayılır.
   * chainable.
   */
  merge(obj: {
    tokens?: Record<string, any>;
    prefix?: string;
    scope?: string;
  }): this;

  /** toCSS() alias'ı; sadece selector string'i döndürüyor. */
  toCssText(selector?: string): string;

  /**
   * applyTo(...) sugar:
   *   theme.injectStyle(':root')
   * eşittir
   *   theme.applyTo(document.documentElement,{ inline:false, selector:':root' })
   * chainable.
   */
  injectStyle(selector?: string): boolean;

  /**
   * Kolay kurucu:
   * Ttheme.fromTokens('light',{ color:{bg:'#fff'} })
   * → new Ttheme('light',{tokens:{...}})
   */
  static fromTokens(
    id: string,
    tokens: Record<string, any>,
    opts?: Omit<TthemeInitOpts, 'tokens'>
  ): Ttheme;
}

/**
 * Varsayılan export runtime'da `{ Ttheme, TthemePatch }` şeklindedir. fileciteturn130file0
 */
declare const _default: {
  Ttheme: typeof Ttheme;
  TthemePatch: typeof TthemePatch;
};
export default _default;

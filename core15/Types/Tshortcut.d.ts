/**
 * Tshortcut.d.ts
 * ---------------------------------------------------------------------------
 * Klavye kısayol yöneticisi. Undo/redo, copy/cut/paste, seçim temizleme,
 * ok tuşu ile nudge, silme vb. gibi editör aksiyonlarını tek merkezden
 * dinler ve çalıştırır. Ayrıca chord (ardışık tuş dizisi) desteği vardır. fileciteturn130file1
 *
 * Bu sınıf Document seviyesinde keydown/keyup dinler, ama `scope` verip
 * sadece belli bir container içinde aktif olmasını sağlayabilirsin.
 *
 * Örnek:
 *
 *   const shortcuts = new Tshortcut({
 *     history: app.history,
 *     selection: app.selection,
 *     layers: app.layers,
 *     clipboard: app.clipboard,
 *     render: app.render,
 *     keymap: {
 *       'Mod+Z':'undo',
 *       'Shift+Mod+Z':'redo',
 *       'Delete':'delete',
 *       'Mod+A':'selectAll'
 *     }
 *   });
 *
 *   // Kendi aksiyonunu kaydet
 *   shortcuts.registerAction('duplicateSelection', ({shortcut}) => {
 *     const items = shortcut.selection?.list?.() || [];
 *     return app.duplicate(items);
 *   });
 *   // Ve tuşa bağla
 *   shortcuts.setKeymap({ 'Mod+D':'duplicateSelection' });
 *
 *   // Chord (ardışık): "G G" → group
 *   shortcuts.onChord(['G','G'], ({comboSeq,shortcut}) => {
 *     app.group(shortcut.selection?.list?.());
 *   }, { prevent:true });
 *
 * Varsayılan aksiyonlar:
 *   undo / redo
 *   copy / cut / paste
 *   selectAll / clearSelection
 *   nudgeLeft / nudgeRight / nudgeUp / nudgeDown (+Big varyantları)
 *   delete
 *
 * Bu aksiyonlar selection + layers + clipboard + render referanslarını
 * kullanır. Örneğin 'nudgeLeft' seçili DOM elementlerinin style.left/top
 * değerini 1px sola kaydırır (10px için *Big varyantı). fileciteturn130file1
 */

/* -------------------------------------------------------------------------
 * Yardımcı tipler
 * ---------------------------------------------------------------------- */

/** keymap: "Mod+Z" -> "undo" gibi. */
export type TshortcutKeymap = Record<string, string>;

/**
 * constructor opsiyonları.
 *
 * target    : EventTarget (genelde document). Varsayılan: document
 * enabled   : başlangıçta dinleyici açık mı
 * scope     : sadece bu DOM subtree içinde aktif olsun (opsiyonel)
 * history   : ThistoryManager benzeri; undo/redo için kullanılır
 * selection : Tselection benzeri; seçili item listesi vs.
 * layers    : Katman yöneticisi; layer silme / flatten() vb. kullanılır
 * clipboard : Tclipboard; copy/cut/paste için kullanılır
 * render    : Trender benzeri; nudge/delete sırasında DOM stilini günceller
 * keymap    : kendi tuş eşlemelerin
 */
export interface TshortcutOpts {
  target?: EventTarget | null;
  enabled?: boolean;
  scope?: Element | null;
  history?: any | null;
  selection?: any | null;
  layers?: any | null;
  clipboard?: any | null;
  render?: any | null;
  keymap?: Record<string, string> | null;
}

/**
 * Tek tuş kombosu handler'ı.
 * combo   : 'Mod+Z', 'Shift+ArrowLeft' vb.
 * e       : orijinal KeyboardEvent
 * shortcut: aynı Tshortcut instance'ı
 *
 * Dönüş true ise handled kabul edilir ve default/bubbling engellenir.
 */
export type TshortcutComboHandler = (ctx: {
  e: KeyboardEvent;
  combo: string;
  shortcut: Tshortcut;
}) => boolean | void;

/**
 * Chord handler (ardışık tuş dizisi).
 * comboSeq: ['G','G'] gibi bufferlanmış dizi
 * e       : son KeyboardEvent
 */
export type TshortcutChordHandler = (ctx: {
  comboSeq: string[];
  e: KeyboardEvent;
  shortcut: Tshortcut;
}) => void;

/**
 * .run(name,{e,combo}) çağrılırken aksiyon fonksiyonuna giden context.
 * Varsayılan aksiyonlar (undo/redo/nudge vs.) bu yapıyı bekler.
 */
export interface TshortcutActionCtx {
  e?: KeyboardEvent;
  combo?: string;
  /** Tshortcut kendisi ayrıca ctx.shortcut olarak inject edilir. */
  [key: string]: any;
}

/* -------------------------------------------------------------------------
 * Tshortcut
 * ---------------------------------------------------------------------- */

/**
 * Tshortcut
 * ---------
 * Klavye dinleyicisi.
 *
 * - attach()  : keydown/keyup listener ekler
 * - detach()  : listener kaldırır
 * - enable()/disable() : runtime'da aç/kapat
 *
 * - on('Mod+S',fn)        → tek komboya özel handler
 * - off('Mod+S',fn?)      → handler kaldır
 * - onChord(['G','G'],fn) → chord handler kaydet
 *
 * - registerAction('foo',fn)
 * - run('foo',{...ctx})
 * - setKeymap({ 'Mod+K':'foo' })
 *
 * İç mantık:
 *  1) keydown → combo normalize edilir (Shift+Mod+Z vb.)
 *  2) önce chord buffer denenir
 *  3) sonra custom on() handler'ları çağrılır
 *  4) sonra keymap'e bakılır (örn. 'undo')
 *  5) preventDefault / stopPropagation yapılır (handled=true ise)
 *
 * `scope` opsiyonu verilmişse sadece e.target bu scope içinde ise işler.
 * Metin alanında yazarken, yalnızca Ctrl/Cmd (Mod) içeren kombolar
 * tetiklenir; ok/harf yazarken normal yazmayı bozmaz. fileciteturn130file1
 */
export class Tshortcut {
  /** Hedef EventTarget (genelde document). */
  target: EventTarget | null;

  /** Sadece bu element altında aktif ol (opsiyonel). */
  scope: Element | null;

  /** Dinleyici açık mı. */
  enabled: boolean;

  /** Undo/redo kaynağı olarak kullanılan history nesnesi. */
  history: any | null;

  /** Seçim modeli (Tselection benzeri). */
  selection: any | null;

  /** Layer yöneticisi (remove(), flatten() gibi metodlara sahip olabilir). */
  layers: any | null;

  /** Clipboard yöneticisi (copyDOM, copyLayers, pasteLayers, vb.). */
  clipboard: any | null;

  /** Render / DOM patcher. Nudge/delete sırasında kullanılabilir. */
  render: any | null;

  /** 'Mod+Z' → 'undo' gibi aksiyon isimleri. */
  keymap: TshortcutKeymap;

  /** Kayıtlı aksiyonlar. name -> handler({e,combo,shortcut}) */
  actions: Map<string, (ctx: TshortcutActionCtx) => boolean | void>;

  /**
   * new Tshortcut({ ...opts })
   * enabled=true ise otomatik attach() yapar
   * ve undo/redo/copy/... gibi default aksiyonları yükler.
   */
  constructor(opts?: TshortcutOpts);

  /* ----- lifecycle ----------------------------------------------------- */

  /** keydown/keyup dinleyicilerini ekle. chainable. */
  attach(): this;

  /** Dinleyicileri kaldır. chainable. */
  detach(): this;

  /** enable() → attach() + 'enable' event'i yay. chainable. */
  enable(): this;

  /** disable() → detach() + 'disable' event'i yay. chainable. */
  disable(): this;

  /** Yalnızca şu element altındaki keydown/keyup kabul edilsin. chainable. */
  setScope(el: Element | null): this;

  /** keymap içini (partial) güncelle. chainable. */
  setKeymap(map: Record<string, string>): this;

  /* ----- kayıt / tetikleme -------------------------------------------- */

  /**
   * registerAction('duplicateSelection', fn)
   * fn({e,combo,shortcut}) true dönerse handled sayılır.
   * chainable.
   */
  registerAction(
    name: string,
    fn: (ctx: TshortcutActionCtx & { shortcut: Tshortcut }) => boolean | void
  ): this;

  /** registerAction'ın tersi. chainable. */
  unregisterAction(name: string): this;

  /**
   * run('undo', { e, combo })
   * → önce custom handler varsa onu çağırır,
   * yoksa built-in default aksiyonlara bakar (undo/redo/nudge/delete...).
   *
   * true dönerse aksiyon işlendi kabul edilir.
   */
  run(name: string, ctx?: TshortcutActionCtx): boolean;

  /**
   * Belirli bir komboya custom handler bağla.
   * combo örn. 'Mod+S', 'Shift+ArrowLeft' ...
   * chainable.
   */
  on(combo: string, fn: TshortcutComboHandler): this;

  /**
   * combo verilmezse tüm handler'lar temizlenir.
   * fn verilmezse o combodaki tüm handler'lar temizlenir.
   * chainable.
   */
  off(combo?: string, fn?: TshortcutComboHandler): this;

  /**
   * chord timeout (ms) değiştir, varsayılan ~750ms.
   * chainable.
   */
  setChordTimeout(ms: number): this;

  /**
   * "G","G" gibi ardışık tuşları yakala.
   * prevent=true → tetiklendiğinde preventDefault yapılır.
   * chainable.
   */
  onChord(
    seq: string[],
    handler: TshortcutChordHandler,
    opts?: { prevent?: boolean }
  ): this;

  /**
   * Sembolik context alanı.
   * (örneğin 'canvas','text','global' gibi bir mod tutup handler içinde
   * davranışı dalga dalga değiştirmek istersen kullanılabilir.)
   * chainable.
   */
  setContext(ctx: string): this;

  /* ----- serialize ----------------------------------------------------- */

  /**
   * Hafif snapshot.
   * { type:'Tshortcut', args:[ { enabled:true } ] }
   * Persist için minimal bilgi. (keymap gibi detaylar yok.)
   */
  toMinJSON(): any;

  /**
   * Debug snapshot.
   * { type:'ns:Tshortcut', enabled:true, keys:<kaç map entry'si var> }
   */
  toJSON(): any;
}

/**
 * Varsayılan export runtime'da `{ Tshortcut }` şeklindedir. fileciteturn130file1
 */
declare const _default: {
  Tshortcut: typeof Tshortcut;
};
export default _default;

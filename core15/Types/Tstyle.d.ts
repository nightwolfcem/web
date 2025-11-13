/**
 * Tstyle.d.ts
 * ---------------------------------------------------------------------------
 * Component-scoped CSS builder. Token-aware ( '$color.primary' →
 * var(--ui-color-primary) gibi ) ve runtime'da <style> etiketi olarak
 * enjekte edilebilir. fileciteturn130file3
 *
 * Kullanım akışı:
 *
 *   const st = new Tstyle('panel', {
 *     scope: '.Panel',
 *     tokensPrefix: 'ui' // theme prefix'i (→ var(--ui-color-bg))
 *   });
 *
 *   // Kuralları ekle (JS objesi → derlenmiş CSS):
 *   st.add('panelBase', {
 *     '&': {
 *       background: '$color.bg',   // → var(--ui-color-bg)
 *       color: '$color.text',
 *       padding: '8px'
 *     },
 *     '& .title': {
 *       fontWeight: 'bold',
 *       fontSize: '14px'
 *     }
 *   });
 *
 *   // Ham CSS bloğu da ekleyebilirsin:
 *   st.add('rawExtra', '.Panel { border:1px solid red; }');
 *
 *   // Final CSS stringini al:
 *   const css = st.toCSS();
 *
 *   // DOM'a uygula (<style id="Tstyle-panel">...):
 *   st.applyToEl(document.head);
 *
 *   // Bir uygulama objesine gönder (app.addCSS / removeCSS protokolü):
 *   st.apply(app);
 *
 * `tokensPrefix`:
 *   '$color.bg' → var(--ui-color-bg)
 *   '$spacing.sm' → var(--ui-spacing-sm)
 * vs. Yani Ttheme içindeki prefix ile hizalanır. fileciteturn130file3
 */

/* -------------------------------------------------------------------------
 * Yardımcı tipler
 * ---------------------------------------------------------------------- */

/**
 * Tstyle constructor opsiyonları.
 * scope         : CSS scope selector'ü (örn. '.Panel' ya da ':root').
 * tokensPrefix  : Theme prefix'i ('ui' → var(--ui-...)).
 */
export interface TstyleOpts {
  scope?: string;
  tokensPrefix?: string;
}

/**
 * apply(app) / removeFrom(app) için beklenen minimal arayüz.
 * Bu, senin uygulama kabuğunun "CSS registry"sine benziyor:
 *
 * app.addCSS(name, css, {apply:true})
 * app.removeCSS(name)
 */
export interface TstyleHostApp {
  addCSS(name: string, css: string, opts?: any): any;
  removeCSS(name: string): any;
}

/**
 * diff(other) çıktısı. İki Tstyle örneğini kıyaslayıp hangi block/rule
 * eklendi/silindi/değiştiğini söyler. Debug / hot-reload için faydalıdır.
 */
export interface TstyleDiff {
  addRules: string[];
  removeRules: string[];
  changeRules: string[];
  addBlocks: string[];
  removeBlocks: string[];
  changeBlocks: string[];
}

/* -------------------------------------------------------------------------
 * Tstyle
 * ---------------------------------------------------------------------- */

/**
 * Tstyle
 * ------
 * Basit bir "CSS module builder".
 *
 * İçeride iki map tutar:
 *   rules:  name -> JS object (selector -> {prop:val} | nested @media)
 *   blocks: name -> raw CSS string
 *
 * .add(name, rulesObj)
 *   Eğer rulesObj bir obje ise derlenmek üzere rules map'ine konur.
 *   Eğer string ise blocks map'ine konur (ham CSS).
 *
 * Derleme sırasında:
 *   - scope ('.Panel') otomatik olarak her selector'e prefixlenir
 *     ('.Panel .title' gibi). Eğer selector '&' içeriyorsa '&'
 *     doğrudan scope ile replace edilir.
 *   - '$token.path' değerleri theme token değişkenine çevrilir:
 *       background: '$color.bg'
 *       → background: var(--ui-color-bg)
 *   - @media/@supports gibi at-rule blokları da desteklenir:
 *       { '@media (max-width:600px)': { '&': { fontSize:'12px' } } }
 *
 * .toCSS() → tüm blocks+rules birleşip tek string döner.
 *
 * .apply(app) → app.addCSS('style-panel', css, {apply:true})
 * .applyToEl(document.head) → <style id="Tstyle-panel">...</style>
 *
 * .merge(obj) ile mevcut scope/tokensPrefix/rules/blocks üstüne yazılabilir.
 * .diff(other) iki Tstyle örneğini kıyaslayıp farkı verir. fileciteturn130file3
 */
export class Tstyle {
  /** Bu stil setinin mantıksal kimliği. ('panel', 'buttonBar' vb.) */
  id: string;

  /** Selector scope (örn. '.Panel' ya da ':root'). */
  scope: string;

  /**
   * Theme token prefix'i.
   * Örnek: 'ui' ⇒ '$color.bg' -> var(--ui-color-bg)
   * İçeride son '-' çıkarılmış halde saklanır (yani 'ui', 'appTheme', ...).
   */
  tokensPrefix: string;

  /** raw CSS block'lar (ad→css). */
  protected blocks: Map<string, string>;

  /** derlenebilir rule objeleri (ad→object). */
  protected rules: Map<string, Record<string, any>>;

  constructor(id?: string, opts?: TstyleOpts);

  /** Scope selector'ünü değiştir. chainable. */
  setScope(sel: string): this;

  /** tokensPrefix'i değiştir. chainable. */
  setTokensPrefix(prefix: string): this;

  /**
   * Yeni bir rule seti veya ham CSS ekle.
   *
   * rulesOrCss:
   *   - object  → scoped rule objesi
   *   - string  → ham CSS
   *
   * name verilmezse "block-<n>" gibi bir isim üretilebilir.
   * chainable.
   */
  add(name: string, rulesOrCss: Record<string, any> | string): this;

  /** Bu ismi kaldır. chainable. */
  remove(name: string): this;

  /** Tüm block/rule temizle. chainable. */
  clear(): this;

  /** Bu isim var mı? */
  has(name: string): boolean;

  /**
   * Derlenmiş tam CSS stringini döndür.
   *
   * scope/tokensPrefix override edebilirsin:
   *   style.toCSS({ scope:'.Panel', tokensPrefix:'ui' })
   */
  toCSS(opts?: { scope?: string; tokensPrefix?: string }): string;

  /**
   * Bir "host app"e css'i push et.
   * app.addCSS(id, css, {apply:true}) çağrılır.
   * chainable.
   */
  apply(app: TstyleHostApp, opts?: { name?: string; scope?: string; tokensPrefix?: string }): this;

  /**
   * Host app'ten css'i kaldır.
   * chainable.
   */
  removeFrom(app: TstyleHostApp, opts?: { name?: string }): this;

  /**
   * Direkt DOM <style> tag'ı yarat/güncelle.
   * styleId vermezsen "Tstyle-${this.id}" kullanılır.
   * chainable.
   */
  applyToEl(
    container?: HTMLElement | null,
    opts?: { styleId?: string | null; scope?: string; tokensPrefix?: string }
  ): this;

  /** applyToEl ile eklenmiş <style> tag'ını DOM'dan kaldır. chainable. */
  removeStyleTag(styleId?: string | null): this;

  /** Kaydedilmiş rule/block objesini getir. */
  get(name: string, def?: any): any;

  /**
   * Mevcut instance'ı bir objeyle merge et.
   * - scope / tokensPrefix güncellenir
   * - blocks / rules map'ine içeri aktarılır
   * chainable.
   */
  merge(obj: {
    scope?: string;
    tokensPrefix?: string;
    blocks?: Record<string, string>;
    rules?: Record<string, Record<string, any>>;
  }): this;

  /**
   * İki Tstyle arasında farkları çıkar.
   * { addRules, removeRules, changeRules, ... } şeklinde döner.
   */
  diff(other: {
    scope?: string;
    tokensPrefix?: string;
    blocks?: Map<string, string>;
    rules?: Map<string, Record<string, any>>;
  }): TstyleDiff;

  /* ----- serialize ---------------------------------------------------- */

  /**
   * Küçük snapshot:
   * { type:'Tstyle', args:[ id, { scope,tokensPrefix,rules,blocks } ] }
   * rules/blocks burada düz objelere aktarılır.
   */
  toMinJSON(): any;

  /**
   * Debug snapshot:
   * { type:'ns:Tstyle', id, scope, tokensPrefix,
   *   rules:[ [name,obj], ... ],
   *   blocks:[ [name,css], ... ] }
   */
  toJSON(): any;

  /* ----- statics ------------------------------------------------------ */

  /**
   * Kolay kurucu:
   *   Tstyle.fromObject('panel', {
   *     '&': { background:'$color.bg' },
   *     '& .title': { fontWeight:'bold' }
   *   }, { scope:'.Panel', tokensPrefix:'ui' })
   *
   * Bu, new Tstyle(...).add('rules', rulesObj) sugar'ıdır.
   */
  static fromObject(
    id: string,
    rules: Record<string, any>,
    opts?: TstyleOpts
  ): Tstyle;
}

/**
 * Varsayılan export runtime'da `{ Tstyle }` şeklindedir. fileciteturn130file3
 */
declare const _default: {
  Tstyle: typeof Tstyle;
};
export default _default;

/**
 * Tinspector.d.ts
 * ---------------------------------------------------------------------------
 * Özellik paneli / inspector modülü.
 *
 * Bu sınıf seçili objelerin (DOM node, Telement, Tlayer, plain JS model ...)
 * özelliklerini form alanları olarak gösterir ve değişiklikleri geri-alınabilir
 * şekilde uygular. ThistoryManager ile entegredir ve Trender üzerinden
 * style/attr patch'leri gönderebilir. fileciteturn13file0
 *
 * TEMEL AKIŞ
 * ----------
 * const insp = new Tinspector({
 *   container : someSidebarEl,
 *   selection : app.selection,     // Tselection
 *   history   : app.history,       // ThistoryManager
 *   render    : app.render,        // Trender (style/attr/text helpers)
 *   layers    : app.layers,        // Tlayers (katman modeli)
 *   schema    : {
 *     groups:[
 *       {
 *         title:'Layout',
 *         fields:[
 *           { key:'style.left',  label:'X', type:'number', unit:'px', live:true },
 *           { key:'style.top',   label:'Y', type:'number', unit:'px', live:true },
 *           { key:'style.width', label:'W', type:'number', unit:'px' },
 *           { key:'style.height',label:'H', type:'number', unit:'px' }
 *         ]
 *       }
 *     ]
 *   }
 * });
 *
 * Inspector formundaki input değişince:
 *   - _onInputChange() her seçili item için _writeField() çağırır
 *   - _writeField() değişimi uygular
 *        * varsa this.render (Trender): render.style/attr/text gibi
 *          history-aware helper'ları kullanır
 *        * yoksa doğrudan DOM'a/objeye yazar ve _pushHistory(...) ile
 *          ThistoryManager.exec(...) tarzı bir komut push eder
 *   - History commit edilir (merge edilir) ve selection yeniden çizilir
 *   - 'apply' / 'refresh' event'leri yayınlanır
 *
 * Inspector ayrıca dışarıdan `bindTarget(obj)` ile tekil bir hedef objeye
 * bağlanıp getProp/setProp ile manuel property editörü gibi de kullanılabilir. fileciteturn13file0
 */

import type { Tevents } from './Tevents.js';

/* ==========================================================================
 *  ŞEMA TİPLERİ
 * ========================================================================== */

/**
 * Tek bir alan (field) tanımı.
 *
 * key / name :
 *    Hangi property okunup yazılacak.
 *    Örnekler:
 *      "text"                → el.textContent
 *      "class"               → el.className
 *      "style.left"          → el.style.left
 *      "attr.id"             → el.getAttribute('id')
 *      "dataset.myKey"       → el.dataset.myKey
 *      "data.title"          → layer.data.title (Tlayer tarafı)
 *    Eğer custom davranış istiyorsan get()/set() tanımlayabilirsin.
 *
 * label :
 *    Inspector satırında gösterilen kullanıcı dostu isim.
 *
 * type :
 *    'text' | 'number' | 'checkbox' | 'color' | 'textarea' | 'select' | custom
 *
 * options :
 *    type==='select' iken kullanılacak seçenekler.
 *      ["left","center","right"] veya
 *      [{value:'left',label:'Left'}, {value:'center',label:'Center'}]
 *
 * unit :
 *    number field'larında "px" gibi otomatik eklenecek birim.
 *
 * live :
 *    true ise 'input' sırasında (her keypresste) apply edilir.
 *    false ise sadece 'change' anında apply edilir.
 *
 * get(item,insp) :
 *    Seçili item'dan değeri oku. Varsayılan olarak key üzerinden çözüyoruz.
 *
 * set(item,value,{live,insp}) :
 *    Değeri item'a uygula. Varsayılan olarak key üstünden yazarız ve
 *    history push ederiz. Kendi özel davranışını override edebilirsin. fileciteturn13file0
 */
export interface TinspectorField {
  key?: string;
  name?: string;
  label?: string;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  unit?: string;
  live?: boolean;
  options?: Array<
    | string
    | number
    | { value: any; label?: string }
  >;
  get?: (item: any, insp: Tinspector) => any;
  set?: (
    item: any,
    value: any,
    ctx: { live: boolean; insp: Tinspector }
  ) => void;
  [key: string]: any;
}

/**
 * Grup (= inspector section). Bir başlık + birden fazla field içerir.
 * UI'da <section class="Tinsp-group"><header>...</header><div>...</div></section>
 * olarak çizilir. fileciteturn13file0
 */
export interface TinspectorGroup {
  title?: string;
  name?: string;
  fields?: TinspectorField[];
  [key: string]: any;
}

/**
 * Inspector şeması. Birden çok grup içerir. build() bu şemayı okuyup
 * DOM inputlarını yaratır. fileciteturn13file0
 */
export interface TinspectorSchema {
  groups: TinspectorGroup[];
}

/**
 * Kurucu opsiyonları.
 *
 * container :
 *    Inspector panelinin yerleştirileceği DOM elemanı. Verilmezse body'ye
 *    eklenir. (this.container) fileciteturn13file0
 *
 * selection :
 *    Tselection benzeri bir nesne. selection.list() → seçili item'lar.
 *    Inspector `refresh()` çağırırken bu seçimi okur, her field'ın değerini
 *    hesaplar ve inputlara yazar. Seçim değiştiğinde `selection.on("change")`
 *    dinlenir ve otomatik refresh yapılır. fileciteturn13file0
 *
 * history :
 *    ThistoryManager. Değer değişimlerini geri alınabilir (undo/redo)
 *    komut olarak push etmek için kullanılır. Inspector _pushHistory ile
 *    ThistoryManager.exec(...) veya history.push(...) tarzında kayıt açar. fileciteturn13file0
 *
 * render :
 *    Trender örneği. Eğer varsa, DOM'a dokunurken doğrudan style/text/attr
 *    set etmek yerine render.style(...) / render.attr(...) / render.text(...)
 *    çağrılır. Bu render helper'ları zaten history ile entegre olduğu için
 *    Inspector bu işi delega eder. Yoksa fallback olarak direkt DOM mutasyonu
 *    + _pushHistory çalışır. fileciteturn13file0
 *
 * layers :
 *    Tlayers koleksiyonu. Bir item bir Tlayer ise (ör. sahnedeki model node'u)
 *    _writeField() patch'i this.layers.setProps(layer, patch, {label}) üzerinden
 *    uygular; bu da history-safe bir yol sağlar. fileciteturn13file0
 *
 * schema :
 *    Başlangıçta kullanmak istediğin grup/alan tanımı.
 */
export interface TinspectorInitOpts {
  container?: Element | null;
  selection?: any;
  history?: any;
  render?: any;
  layers?: any;
  schema?: TinspectorSchema | null;
  [key: string]: any;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

export class Tinspector extends Tevents {
  /** Inspector panelinin parent container'ı. Değiştirilebilir. */
  container: Element | null;

  /** Aktif seçim kontrolcüsü (Tselection benzeri). */
  selection: any;

  /** Undo/redo yöneticisi (ThistoryManager benzeri). */
  history: any;

  /** DOM patch helper (Trender). */
  render: any;

  /** Layer modeli yöneticisi (Tlayers). */
  layers: any;

  /** Şu anki inspector şeması. build() bunu DOM'a çevirir. */
  schema: TinspectorSchema;

  /**
   * Inspector'ın kendi kök DOM elementi.
   * build() sırasında <div class="Tinspector"> olarak oluşturulur ve
   * this.container içine eklenir. Yoksa body'e eklenebilir. fileciteturn13file0
   */
  root: HTMLElement | null;

  /**
   * Hedef nesne (tekil edit modu).
   * bindTarget() ile atanır. getProp()/setProp() bu hedef üzerinde
   * deep path set/get yapar. fileciteturn13file0
   */
  target: any;

  /** Internal: build() sırasında true olur; refresh() UI'yı dokunmaz. */
  protected _building: boolean;

  /** Internal: _onInputChange() apply ederken true; re-entrancy guard. */
  protected _mutating: boolean;

  constructor(opts?: TinspectorInitOpts);

  /* ----------------------------------------------------------------------
   * Yapılandırma / DI set
   * ------------------------------------------------------------------- */

  /** Dışarıdan yeni schema tanımla (override). chainable. */
  define(schema?: TinspectorSchema | null): this;

  /** Selection controller'ını değiştir. chainable. */
  setSelection(sel: any): this;

  /** History yöneticisini değiştir. chainable. */
  setHistory(h: any): this;

  /** Render helper'ını değiştir. chainable. */
  setRender(r: any): this;

  /** Layers yöneticisini değiştir. chainable. */
  setLayers(L: any): this;

  /* ----------------------------------------------------------------------
   * UI kurulum / yenileme
   * ------------------------------------------------------------------- */

  /**
   * Şu anki this.schema üzerinden DOM UI'sını yeniden kurar.
   * - Her grup için <section.Tinsp-group>
   * - Her field için label + input satırı
   *
   * build() bittikten sonra refresh() çağrılır ve 'build' event'i emit edilir.
   * chainable.
   */
  build(): this;

  /**
   * Seçili item'lardan değerleri okuyup input'lara yazar.
   *
   * Eğer bir field için tüm seçili item'larda aynı değer varsa o değer
   * inputa girilir. Farklıysa "—" (MIXED) gösterilir ve satıra
   * .Tinsp-mixed sınıfı eklenir.
   *
   * 'refresh' event'i emit edilir ({count: <seçili sayısı>}). chainable. fileciteturn13file0
   */
  refresh(): this;

  /* ----------------------------------------------------------------------
   * ŞEMA yardımları
   * ------------------------------------------------------------------- */

  /** Tam şemayı değiştirip build() eder. chainable. */
  setSchema(schema: TinspectorSchema): this;

  /**
   * Yeni grup ekle (title başlıklı sekme).
   * build() otomatik çağrılır.
   * Dönüş: oluşturulan grup objesi.
   */
  addGroup(title: string, fields?: TinspectorField[]): TinspectorGroup;

  /**
   * Var olan bir gruba field ekle veya yoksa yeni grup oluştur.
   * build() otomatik çağrılır.
   * Dönüş: eklenen field tanımı.
   */
  addField(groupTitle: string, field: TinspectorField): TinspectorField;

  /**
   * container değiştir ve paneli oraya tak.
   * Eğer this.root yoksa oluşturur. chainable.
   */
  attach(container: Element | null): this;

  /**
   * Hızlı alan tanımlama şortu:
   *   insp.defineField('style.left', { label:'X', type:'number', unit:'px' })
   * İlk grup yoksa otomatik 'General' adında bir grup açılır.
   * build() çağrılır. chainable.
   */
  defineField(key: string, meta: any): this;

  /**
   * Bir kerede birden fazla field tanımla.
   * map = { 'style.left': {...}, 'style.top': {...} }
   * build() çağrılır. chainable.
   */
  defineFields(map: Record<string, any>): this;

  /* ----------------------------------------------------------------------
   * Target mod (tekil obje editleme)
   * ------------------------------------------------------------------- */

  /**
   * Inspector'ı tek bir hedef objeye bağlar.
   * getProp()/setProp() bu `target` üzerinde çalışır.
   * İstersen history override edebilirsin.
   * chainable.
   */
  bindTarget(obj: any, opts?: { history?: any | null }): this;

  /**
   * target[path] = value (derin yol destekli).
   *
   * İşlem history ile sarılır:
   *  - ThistoryManager.exec(...) benzeri geri alınabilir bir komut push edilir
   *  - 'inspector:change' event'i emit edilir ({path, prev, next})
   *
   * label/tag isteğe bağlı metadata olarak history'ye geçebilir. chainable. fileciteturn13file0
   */
  setProp(
    path: string,
    value: any,
    opts?: { label?: string; tag?: any }
  ): this;

  /**
   * target[path] değerini döndürür (deep get). Yoksa def döner.
   */
  getProp(path: string, def?: any): any;

  /* ----------------------------------------------------------------------
   * INTERNAL/PORTEDE YARDIMCI METODLAR (public API değil)
   * ------------------------------------------------------------------- */

  /** Internal: tek bir field için <div class="Tinsp-row"> ... döndürür. */
  protected _buildField(f: TinspectorField): HTMLElement | null;

  /** Internal: field tipine göre <input>,<select>,<textarea> üretir. */
  protected _createInputFor(f: TinspectorField): HTMLElement | null;

  /** Internal: seçili item'lardan alanı oku. */
  protected _readField(f: TinspectorField, item: any): any;

  /**
   * Internal: alanı item'a uygula.
   * render varsa render.style/attr/text çağırır (history aware).
   * yoksa doğrudan DOM/Tlayer/objeye yazar ve _pushHistory ile history.push.
   */
  protected _writeField(
    f: TinspectorField,
    item: any,
    value: any,
    opts?: { live?: boolean }
  ): boolean;

  /**
   * Internal: input event handler'ı.
   * Çoklu seçimde tüm item'lara aynı patch'i uygular, history.begin/end
   * ile tek transaction içinde tutar. 'apply' event'i emit eder.
   */
  protected _onInputChange(
    f: TinspectorField,
    inp: HTMLElement,
    opts?: { live?: boolean }
  ): void;

  /** Internal: tek bir input'a (checkbox/select/number/...) değer yaz. */
  protected _setInputValue(
    inp: HTMLElement,
    f: TinspectorField,
    val: any
  ): void;
}

/* ==========================================================================
 *  DEFAULT EXPORT (module style)
 * ========================================================================== */

declare const _default: {
  Tinspector: typeof Tinspector;
};

export default _default;

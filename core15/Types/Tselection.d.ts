/**
 * Tselection.d.ts
 * ---------------------------------------------------------------------------
 * Seçim (multi/single) modeli + history ile undo/redo entegrasyonu. fileciteturn128file0
 *
 * Bu modül iki ana sınıf export eder:
 *
 * 1. TselectionChange
 *    - ThistoryManager ile kullanılmak üzere bir komut (Tcommand tabanlı).
 *    - Bir seçim farkını (addIds[], removeIds[]) uygular, undo/redo bilir,
 *      ardışık seçim değişimlerini mergeWith ile tek entry'de birleştirebilir.
 *
 * 2. Tselection
 *    - Runtime seçim durumu.
 *    - Tekli / çoklu seçim (mode:'single'|'multiple').
 *    - toggle({multi,range}) / marquee (selectInRect) / predicate seçimi,
 *      bbox() (birleşik bounding box hesaplama), anchor yönetimi,
 *      history.exec(...) ile otomatik kayıt.
 *
 * Yaydığı event'ler (Tevents'ten):
 *    'change' : { added, removed, list, ids }
 *    'anchor' : { anchor }
 *
 * Bu sınıf DOM sınıfı eklemez; görsel highlight işi dışarıda (ör: Trender
 * ya da TlayerBridge.applySelection). Seçim sadece "hangi objeler seçili"
 * bilgisini taşır. fileciteturn128file0
 */

import type { Tevents } from './Tevents.js';
import type { Tcommand } from './Tcommand.js';

/* ==========================================================================
 *  Yardımcı tipler
 * ========================================================================== */

/** Seçim nesnesine verilebilecek seçenekler. */
export interface TselectionOpts {
  /**
   * 'single'  → her zaman en fazla 1 öğe seçili tutulur
   * 'multiple'→ birden fazla öğe tutulabilir (varsayılan)
   */
  mode?: 'single' | 'multiple';

  /**
   * idOf(item) → string | null
   * Bir item'ı benzersiz şekilde temsil eden id döndürür.
   * Varsayılan: item.id || item.el?.id || item.htmlObject?.id || null
   */
  idOf?: (item: any) => string | null;

  /**
   * getById(id) → item
   * Bir id'den tekrar orijinal nesneyi bulmayı sağlar.
   * History komutu (TselectionChange) undo/redo sırasında item'a geri
   * ulaşmak için bunu kullanır. Sağlamazsan model içinde tarar. fileciteturn128file0
   */
  getById?: (id: string) => any;

  /**
   * getRect(item) → {left,top,width,height}
   * Marquee / bbox hesaplamalarında kullanılır.
   * Varsayılan: item.el.getBoundingClientRect() benzeri. fileciteturn128file0
   */
  getRect?: (item: any) => { left:number; top:number; width:number; height:number } | null;

  /**
   * ThistoryManager benzeri bir nesne.
   * Eğer verilirse tüm seçim değişimleri history.exec(...) ile sarılır
   * ve undo/redo yapılabilir hale gelir. History yoksa direkt uygular. fileciteturn128file0
   */
  history?: any;
}

/** apply() / applyIds() için diff yapısı. */
export interface TselectionApplyDiff {
  add?: any[];
  remove?: any[];
}

/** selectInRect() için dikdörtgen bilgisi (viewport koordinatları). */
export interface TrectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** bbox() çıktısı: birleşik seçim bounding box'ı. */
export interface TselectionBBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/* ==========================================================================
 *  TselectionChange  (history komutu)
 * ========================================================================== */

/**
 * TselectionChange
 * -----------------
 * History katmanı için tek bir seçim değişimi.
 *
 * - do()   : model.applyIds({add,remove})
 * - undo() : tersini uygular (ilk duruma döndürür)
 * - mergeWith(next) : art arda gelen seçim değişimlerini tek history
 *   kaydında birleştirir (ör. kullanıcı marquee çekmeye devam ederken). fileciteturn128file0
 */
export class TselectionChange extends (Tcommand as { new(...args:any[]): any }) {
  /** Hedef seçim modeli. */
  model: Tselection;

  /** Eklenmesi istenen id listesi (uniq). */
  addIds: string[];

  /** Çıkarılması istenen id listesi (uniq). */
  removeIds: string[];

  constructor(
    model: Tselection,
    addIds?: string[] | string,
    removeIds?: string[] | string,
    label?: string
  );

  /** Uygula (redo). */
  do(): void;

  /** Geri al. */
  undo(): void;

  /** History için diff temsilini döndürür. */
  toPatch(): { type: 'selection'; add: string[]; remove: string[] };

  /**
   * Ardışık selection komutlarını birleştir.
   * Aynı model'e aitse add/remove kümelerini günceller ve true döndürür.
   * Aksi halde false (merge edilmedi).
   */
  mergeWith(next: TselectionChange): boolean;
}

/* ==========================================================================
 *  Tselection  (runtime seçim modeli)
 * ========================================================================== */

/**
 * Tselection
 * ----------
 * Yüksek seviyeli seçim modeli.
 *
 * Kullanım örneği:
 *
 *   const sel = new Tselection({
 *     mode: 'multiple',
 *     idOf: el => el.id,
 *     getById: id => document.getElementById(id),
 *     history: app.history
 *   });
 *
 *   sel.on('change', e => {
 *     // e.added / e.removed / e.list / e.ids
 *     redrawSelectionOverlay(e.ids);
 *   });
 *
 *   // tek seçim
 *   sel.set([node]);
 *
 *   // toggle (multi)
 *   sel.toggle(node, { multi:true });
 *
 *   // dikdörtgen ile seçim
 *   sel.selectInRect(viewportRect, candidates, { partially:true });
 *
 *   // bbox al
 *   const box = sel.bbox();
 *   if (box) drawMarquee(box);
 *
 * History entegrasyonu:
 *   sel.bindHistory(history);
 *   sel.toggle(node, { multi:true, label:'select:toggle' });
 *   // history.exec(new TselectionChange(...))
 * Böylece undo/redo ile seçim geri alınabilir. fileciteturn128file0
 */
export class Tselection extends (Tevents as { new(...args:any[]): any }) {
  /** 'single' veya 'multiple'. */
  mode: 'single' | 'multiple';

  /** Internal set (seçili item referansları). */
  protected _set: Set<any>;

  /** Ek olarak seçim sırasını koruyan liste. */
  protected _order: any[];

  /** Anchor item (klavyeli shift-range seçiminde başlangıç). */
  protected _anchor: any | null;

  /** idOf() fn. */
  protected _idOf: (item: any) => string | null;

  /** Id → item çözümleyici (opsiyonel). */
  getById: ((id: string) => any) | null;

  /** BBox çıkarıcı fn. */
  getRect: (item: any) => { left:number; top:number; width:number; height:number } | null;

  /** ThistoryManager benzeri. */
  history: any;

  constructor(opts?: TselectionOpts);

  /* ----- Durum sorguları / okuma ----- */

  /** Bu item şu anda seçili mi? */
  has(item: any): boolean;

  /** Kaç tane seçili var? */
  size(): number;

  /** Seçili item'lerin kopya listesi. */
  list(): any[];

  /** list() alias'ı (Interact uyumluluğu). */
  items(): any[];

  /** list() alias'ı (geçmiş API uyumluluğu). */
  selected(): any[];

  /** Seçili item id'lerinin listesi. */
  selectedIds(): string[];

  /** Anchor (range seçim başlangıcı). */
  anchor(): any | null;

  /** Anchor'ı ayarla (change event: 'anchor'). chainable. */
  setAnchor(item: any | null): this;

  /** History referansını sonradan bağla/değiştir. chainable. */
  bindHistory(h: any): this;

  /* ----- Düşük seviye uygulama (history yokken direkt uygular) ----- */

  /**
   * apply({add,remove})
   * -------------------
   * @param items {add?:any[], remove?:any[]}
   * @param opts  {silent?:boolean}
   *
   * İç set/_order üzerinde değişimi uygular.
   * mode==='single' ise her zaman en son eklenen tek öğe kalır.
   * Değişim varsa 'change' event'i yayar.
   *
   * @returns { added:any[], removed:any[] }
   */
  apply(
    items?: TselectionApplyDiff,
    opts?: { silent?: boolean }
  ): { added: any[]; removed: any[] };

  /**
   * applyIds({add,remove})
   * ----------------------
   * add/remove dizileri id string'lerinden oluşur.
   * getById(...) ile item çözülür, sonra apply(...) çağrılır.
   */
  applyIds(
    ids?: { add?: string[]; remove?: string[] },
    opts?: { silent?: boolean }
  ): { added: any[]; removed: any[] };

  /* ----- Yüksek seviye API (history aware) ----- */

  /**
   * add(item)
   * ---------
   * Tek bir öğeyi ekler.
   * History varsa TselectionChange ile exec eder.
   * chainable.
   */
  add(item: any, opts?: { label?: string; tryMerge?: boolean }): this;

  /**
   * remove(item)
   * ------------
   * Tek bir öğeyi seçili setinden çıkarır.
   * History aware. chainable.
   */
  remove(item: any, opts?: { label?: string; tryMerge?: boolean }): this;

  /**
   * toggle(item,{multi,range,add,append})
   * -------------------------------------
   * Interact uyumluluğu.
   * - multi/range/add/append true ise "üyelik toggle"
   * - aksi halde tek seçim (selectOnly)
   * chainable.
   */
  toggle(
    item: any,
    opts?: { multi?: boolean; range?: boolean; add?: boolean; append?: boolean; label?: string; tryMerge?: boolean }
  ): this;

  /**
   * set(items)
   * ----------
   * Seçimi tam olarak bu items dizisine eşitler.
   * chainable.
   */
  set(
    items: any[],
    opts?: { label?: string; tryMerge?: boolean }
  ): this;

  /** clear() → hiçbir şey seçili kalmasın. chainable. */
  clear(opts?: { label?: string; tryMerge?: boolean }): this;

  /** selectOnly(item) → sadece bu item seçilsin. chainable. */
  selectOnly(
    item: any,
    opts?: { label?: string; tryMerge?: boolean }
  ): this;

  /**
   * selectByPredicate(fn, items)
   * ----------------------------
   * Verilen candidate listesinde fn(item) true diyorsa seç.
   */
  selectByPredicate(
    fn: (item: any) => boolean,
    items: any[],
    opts?: { label?: string; tryMerge?: boolean }
  ): this;

  /**
   * selectInRect(rect,candidates,{partially?,rectOf?,label?})
   * ---------------------------------------------------------
   * Ekrandaki dikdörtgen (ör. marquee) ile kesişen candidate öğeleri
   * seçer. getRect(...) ile her öğenin {left,top,width,height} bilgisi
   * alınır ve çakışma testi yapılır (partially=true ise kısmi temas yeter).
   */
  selectInRect(
    rect: TrectLike,
    candidates: any[],
    opts?: { partially?: boolean; rectOf?: (item:any)=>TrectLike|null; label?: string }
  ): this;

  /**
   * bbox()
   * ------
   * Seçili her öğenin getRect(...) sonucunu union'layarak tek bir
   * bounding box döndürür. Seçim boşsa null döner.
   */
  bbox(): TselectionBBox | null;

  /* ----- History internal ----- */

  /**
   * _commit(diff,{label?,tryMerge?})
   * --------------------------------
   * İç kullanım. diff={add:[...],remove:[...]}
   * History varsa history.exec(new TselectionChange(...)).
   * Yoksa apply(...) direkt.
   * Her zaman this döndürür (chainable).
   */
  protected _commit(
    diff: { add?: any[]; remove?: any[] },
    opts?: { label?: string; tryMerge?: boolean }
  ): this;

  /* ----- Serialize / legacy uyumluluk ----- */

  /** Hafif snapshot; revive sırasında yeniden kurulabilir. */
  toMinJSON(): any;

  /** Daha okunabilir debug snapshot. */
  toJSON(): any;

  /** Revive sonrası hook (şu an no-op). */
  afterRevive(ctx: any): void;

  /** getIds() eski API alias'ı → selectedIds() */
  getIds(): string[];

  /** isEmpty() eski API alias'ı → size()===0 */
  isEmpty(): boolean;

  /** key 'kind' alanı legacy kodlar için saklanır. chainable. */
  setKind(kind: string): this;

  /**
   * rectSelect(ids,{mode?,emit?})
   * -----------------------------
   * (eski API desteği)
   * id dizisine göre seçim uygular.
   * mode='replace' | 'add' | 'remove' | 'toggle'
   * emit=false ise 'change' event'i bastırılabilir.
   */
  rectSelect(
    ids: string[],
    opts?: { mode?: 'replace'|'add'|'remove'|'toggle'; emit?: boolean }
  ): { added: any[]; removed: any[] };
}

/**
 * Varsayılan export runtime modülde `export default Tselection` olduğundan
 * burada doğrudan sınıf export edilir. fileciteturn128file0
 */
declare const _default: typeof Tselection;
export default _default;

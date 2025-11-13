/**
 * ThistoryManager.d.ts
 * ---------------------------------------------------------------------------
 * Undo/redo komut geçmişi yöneticisi + otomatik DOM değişim takibi katmanı.
 *
 * Bu dosya ThistoryManager.js'nin (core12 birleşik sürüm: ThistoryManager + Thistory)
 * public yüzeyini tipler ve ayrıntılı olarak belgeler. fileciteturn12file0
 *
 * YAPI NEDİR?
 * -----------
 * Aşağıdaki katmanlar birlikte çalışır:
 *
 * 1. Tcommand (ve alt sınıfları)
 *    - Tek bir eylemi temsil eder: property değiştir, DOM'a stil yaz,
 *      node ekle/taşı/sil, vb. Her komut `do()` / `undo()` / `redo()`
 *      implement eder. Ayrıca `mergeWith()` desteği ile "aynı şeyi tekrar
 *      yaptıysan tek komutta birleştir" optimizasyonu vardır. fileciteturn12file0
 *
 * 2. TcommandHistory
 *    - Stack tabanlı bir undo/redo geçmişidir. `exec(cmd)` çağrısında
 *      komutun `do()`su çağrılır ve komut stack'e itilir. `undo()` o komutun
 *      `undo()`sunu çalıştırır, `redo()` tekrar `do()` çalıştırır.
 *      Zaman damgası ve mergeWindowMs ile "kısa süre içinde gelen aynı tür
 *      değişikliği tek komutta birleştir" (tryMerge) davranışı desteklenir. fileciteturn12file0
 *
 * 3. ThistoryManager (Tevents'ten extend eder)
 *    - Uygulama seviyesinde tek entry point'tir.
 *    - Komutları çalıştırır / grupla / merge et / undo / redo yapar.
 *    - İsteğe bağlı diff/serializer entegrasyonu sağlar; commit başına
 *      snapshot çıkarabilir (diffMode 'diff'/'full').
 *    - DOM shortcut metotları (insert/remove/move/style/attr/rect/...) ile
 *      sahnedeki gerçek HTMLElement'ler üzerinde işlem yaparken aynı anda
 *      geri alınabilir komutlar üretir. fileciteturn12file0
 *    - `bindInteract()` ile hareket/resize etkileşimi bittikten sonra tek bir
 *      "move"/"resize" commit'i olarak kaydeder. fileciteturn12file0
 *    - addTrack()/removeTrack() ile MutationObserver / ResizeObserver tabanlı
 *      otomatik izlemeyi açabilir; DOM değişikliklerini canlı komutlara çevirip
 *      history'ye push eder. fileciteturn12file0
 *    - attachEventTracking() ile EventTarget.prototype.addEventListener ve
 *      removeEventListener'i patch'leyip event listener ekleme/çıkarma
 *      eylemlerini de history'ye komut olarak yansıtabilir. fileciteturn12file0
 *
 * Temel akış:
 *   const hm = new ThistoryManager({ root: canvasEl, serializer: Tserializer });
 *   hm.execProp(shape, ['style','left'], 120, 'move');   // kayıt + merge
 *   hm.undo();                                          // geri al
 *   hm.redo();                                          // ileri al
 *   hm.batch('insertMany', (h) => { ...h.insert(...); ... });
 *
 * NOT (sınırlama):
 * - Aşağıdaki tipler, runtime kodunda kullanılan bazı internal alanları
 *   (ör. WeakMap iç yapıları, MutationObserver kayıtları, vb.) sadeleştirilmiş
 *   olarak temsil eder. Bunlar public API değil ama belgede anlaşılır olsun
 *   diye işaretlenir. fileciteturn12file0
 */

import type { Tevents } from './Tevents.js';

/* ==========================================================================
 *  KOMUT TABANI VE ALT SINIFLAR
 * ========================================================================== */

/**
 * Tekil geri-alınabilir eylem.
 *
 * Özellikler:
 *  - label : bu komutu tanımlayan kısa isim (örn. 'move', 'style', 'attr')
 *  - ts    : zaman damgası (ms). mergeWindowMs karşılaştırmaları için kullanılır.
 *
 * Metotlar:
 *  - do()       : eylemi uygular
 *  - undo()     : eylemi geri alır
 *  - redo()     : (varsayılan) tekrar do() çağırır
 *  - mergeWith(other)
 *      Aynı tip iki komutu tek komutta birleştirme imkanı. true dönerse
 *      other artık stack'e ayrı bir entry olarak girmez. Bu özellikle
 *      ardışık stil/konum değişimlerini tek satırda tutmak için kullanılır. fileciteturn12file0
 *  - toPatch()
 *      commit payload'ı için geriye hafif bir "patch" nesnesi döndürür
 *      ({type:'dom-style', style:{...}} gibi) ya da null döner.
 *  - isNoop()
 *      Komutun aslında anlamlı bir değişiklik yapmadığını bildirir.
 */
export class Tcommand {
  label: string;
  ts: number;
  constructor(opts?: { label?: string });
  do(): void;
  undo(): void;
  redo(): void;
  mergeWith(other: any): boolean;
  toPatch(): any;
  isNoop(): boolean;
}

/**
 * Çoklu komutu tek bir grup olarak tutan komut.
 * undo() tüm alt komutları tersten çalıştırır; redo() sırayla tekrar uygular.
 * mergeWith(), eğer aynı tipte başka bir TcompositeCommand gelirse
 * cmd'lerini birleştirip tek commit gibi davranabilir. fileciteturn12file0
 */
export class TcompositeCommand extends Tcommand {
  /** Alt komut listesi. Boşsa isNoop() → true olur. */
  cmds: Tcommand[];
  constructor(cmds?: Tcommand[], opts?: { label?: string });
  /** Boş olmayan bir alt komut ekler (noop komutlar atlanır). chainable. */
  add(cmd: Tcommand): this;
  do(): void;
  undo(): void;
  redo(): void;
  mergeWith(other: any): boolean;
  toPatch(): any;
  isNoop(): boolean;
}

/**
 * Nesne üzerinde tek bir property'yi (veya path ile iç property'yi)
 * değiştiren komut.
 *
 * - target : değiştireceğimiz obje
 * - path   : string ("style.left") ya da ['style','left'] gibi bir yol
 * - value  : yeni değer
 *
 * Komut ilk çalıştırıldığında eski değeri kaydeder ve undo() sırasında
 * geri yazar. Birden fazla ardışık property yazımı aynı hedef ve aynı path
 * için geldiyse mergeWith() son gelen değeri günceller, tek komut olarak kalır. fileciteturn12file0
 */
export class TpropCommand extends Tcommand {
  t: any;
  p: string | string[] | any;
  v: any;
  protected _had: boolean;
  protected _prev: any;
  constructor(target: any, path: string | string[] | any, value: any, label?: string);
  /** Eski değeri elle prime etmek istersen (performans/özel durum). */
  prime(prev: any): this;
  do(): void;
  undo(): void;
  mergeWith(other: any): boolean;
  toPatch(): any;
}

/**
 * Bir dizide splice yapan komut.
 * - arr          : hedef dizi
 * - index        : ekleme/silme başlangıç index'i
 * - deleteCount  : kaç öğe silinecek
 * - items        : eklenecek öğeler
 *
 * undo(), diziye geri dönmek için ters işlemi uygular.
 * mergeWith(), ardışık eklemeleri (deleteCount=0 koşuluyla) tek genişletilmiş
 * ekleme olarak birleştirebilir. fileciteturn12file0
 */
export class TarraySpliceCommand extends Tcommand {
  arr: any[];
  index: number;
  deleteCount: number;
  items: any[];
  protected _removed: any[] | null;
  constructor(arr: any[], index: number, deleteCount: number, items?: any[] | any, label?: string);
  do(): void;
  undo(): void;
  toPatch(): any;
  mergeWith(next: any): boolean;
}

/**
 * Bir HTMLElement'in inline style'ını patch eden komut.
 * - newS : uygulanacak stil objesi ({ left:'10px', top:'20px', ... })
 * - oldS : undo() için yedeklenen önceki stil snapshot'ı
 *
 * mergeWith() aynı elemana ait ardışık stil patch'lerini tek komutta
 * birleştirir. fileciteturn12file0
 */
export class TdomStyleCommand extends Tcommand {
  el: any;
  newS: Record<string, any>;
  oldS: Record<string, any>;
  constructor(el: any, styleObj?: Record<string, any>, prevStyleObj?: Record<string, any> | null, label?: string);
  protected _apply(S: Record<string, any>): void;
  do(): void;
  undo(): void;
  mergeWith(other: any): boolean;
  toPatch(): any;
}

/**
 * Bir HTMLElement'in attribute'larını patch eden komut.
 * - newA : { 'data-x':123, id:'foo', ... } gibi yeni değerler
 * - oldA : undo() için önceki değerler
 *
 * mergeWith() aynı elemana ait ardışık attr patch'lerini tek komuta katabilir. fileciteturn12file0
 */
export class TdomAttrCommand extends Tcommand {
  el: any;
  newA: Record<string, any>;
  oldA: Record<string, any>;
  constructor(el: any, attrs?: Record<string, any>, prevAttrs?: Record<string, any> | null, label?: string);
  protected _apply(A: Record<string, any>): void;
  do(): void;
  undo(): void;
  mergeWith(other: any): boolean;
  toPatch(): any;
}

/**
 * Bir HTMLElement'in dataset'ini (el.dataset[key]) patch eden komut.
 * - newD : { foo:'bar', ... }
 * - oldD : undo() için önceki dataset snapshot'ı
 *
 * mergeWith() aynı elemana ait ardışık dataset patch'lerini tek komuta
 * katabilir. fileciteturn12file0
 */
export class TdomDatasetCommand extends Tcommand {
  el: any;
  newD: Record<string, any>;
  oldD: Record<string, any>;
  constructor(el: any, patch?: Record<string, any>, prev?: Record<string, any> | null, label?: string);
  protected _apply(D: Record<string, any>): void;
  do(): void;
  undo(): void;
  mergeWith(other: any): boolean;
  toPatch(): any;
}

/**
 * Bir DOM node'unu parent içine ekleyen komut (insertBefore mantığı).
 * undo(), node'u eski yerine geri takar veya tamamen çıkarır. fileciteturn12file0
 */
export class TdomInsertCommand extends Tcommand {
  p: any;
  n: any;
  b: any;
  protected _op: any;
  protected _on: any;
  constructor(parent: any, node: any, before?: any | null, label?: string);
  do(): void;
  undo(): void;
  toPatch(): any;
}

/**
 * Bir DOM node'unu sahneden kaldıran komut.
 * undo(), node'u orijinal parent'ına aynı sibling konumuna geri koyar. fileciteturn12file0
 */
export class TdomRemoveCommand extends Tcommand {
  n: any;
  protected _p: any;
  protected _next: any;
  constructor(node: any, label?: string);
  do(): void;
  undo(): void;
  toPatch(): any;
}

/**
 * Bir DOM node'unu farklı bir parent içine taşımak için komut.
 * undo(), node'u eski parent/sibling konumuna geri koyar.
 * mergeWith(), aynı node için ardışık move'ları tek komutta birleştirir. fileciteturn12file0
 */
export class TdomMoveCommand extends Tcommand {
  n: any;
  p: any;
  b: any;
  protected _op: any;
  protected _on: any;
  constructor(node: any, newParent: any, before?: any | null, label?: string);
  do(): void;
  undo(): void;
  mergeWith(other: any): boolean;
  toPatch(): any;
}

/**
 * Bir HTMLElement'in konum/boyut bilgisini (left/top/width/height)
 * stil olarak uygular. Bu, hem inline style patch'i yaratır hem de
 * ThistoryManager.rect/size gibi operasyonlarda "tek transaction" olarak
 * saklanır. fileciteturn12file0
 */
export class TdomSizeCommand extends Tcommand {
  el: any;
  old: { left?: number; top?: number; width?: number; height?: number } | null;
  new: { left?: number; top?: number; width?: number; height?: number } | null;
  constructor(
    el: any,
    oldRect: any,
    newRect: { left?: number; top?: number; width?: number; height?: number } | any,
    label?: string
  );
  protected _apply(r: { left?: number; top?: number; width?: number; height?: number } | null): void;
  do(): void;
  undo(): void;
  mergeWith(other: any): boolean;
  toPatch(): any;
}

/* ==========================================================================
 *  TcommandHistory
 * ========================================================================== */

/**
 * Undo/redo stack yöneticisi. Tek başına kullanılabilir ama genelde
 * ThistoryManager içinden erişilir (`this.history`). fileciteturn12file0
 *
 * Özellikler:
 *   - limit          : geçmişte tutulacak maximum komut sayısı
 *   - mergeWindowMs  : ardışık komutları birleştirmek için zaman penceresi (ms)
 *   - _stack[]       : {cmd, ts} kayıtları
 *   - _index         : geçerli konum (undo/redo pointer)
 *
 * Davranış:
 *   - exec(cmd,{tryMerge}) → cmd.do() + push/merge
 *   - undo() → en üstteki komutun undo()
 *   - redo() → bir ileri komutun do()
 */
export class TcommandHistory {
  limit: number;
  mergeWindowMs: number;
  protected _stack: Array<{ cmd: Tcommand; ts: number }>;
  protected _index: number;
  constructor(limit?: number, mergeWindowMs?: number);
  /** Tüm geçmişi sil. index=-1 olur. */
  clear(): void;
  /** Undo yapılabilir mi? */
  canUndo(): boolean;
  /** Redo yapılabilir mi? */
  canRedo(): boolean;
  /** Geçerli stack boyutu (readonly). */
  get size(): number;
  /** Aktif index (son çalışmış komutun indeksi). */
  get index(): number;
  /** Şu anda en üstte duran kaydı döndürür. */
  top(): { cmd: Tcommand; ts: number } | null;
  /**
   * Eğer en son komut ile verilen komut mergeWith() yapabiliyorsa
   * ve mergeWindowMs sınırı aşılmadıysa merge eder.
   */
  tryMerge(cmd: Tcommand): boolean;
  /** Stack'e yeni bir komut it ve index'i güncelle. */
  push(cmd: Tcommand): void;
  /**
   * Komutu çalıştır + push. tryMerge=true ise mümkünse bir önceki ile merge edilir.
   */
  exec(cmd: Tcommand, opts?: { tryMerge?: boolean }): void;
  /** Undo uygula, başarılıysa true. */
  undo(): boolean;
  /** Redo uygula, başarılıysa true. */
  redo(): boolean;
}

/* ==========================================================================
 *  ThistoryManager
 * ========================================================================== */

/**
 * ThistoryManager, TcommandHistory üzerine ekstra katman sağlar:
 *
 * - Komut çalıştırma / gruplayarak çalıştırma
 * - undo / redo
 * - "diffMode" ile commit payload üretme:
 *     • 'none'  : payload = cmd.toPatch()
 *     • 'diff'  : serializer.serialize(root) ile fark snapshot'ı
 *     • 'full'  : serializer.stringify(root) ile tam snapshot
 *   Her commit'te 'commit' event'i emit edilir ve payload bu event ile yayılır. fileciteturn12file0
 *
 * - DOM helper'ları (insert/remove/move/style/attr/dataset/rect/size/etc.)
 *   otomatik olarak uygun Tdom*/TpropCommand komutlarını üretir ve exec eder. fileciteturn12file0
 *
 * - bindInteract(interact):
 *   Tinteract benzeri bir controller'dan 'move:start' / 'move:end' /
 *   'resize:start' / 'resize:end' eventlerini dinler. Drag/resize süresince
 *   başlangıç geometrisini kaydeder ve bitince tek bir history commit'i
 *   (örn. 'move' veya 'resize') olarak kaydeder. fileciteturn12file0
 *
 * - addTrack(target, opts):
 *   Bir HTMLElement'i MutationObserver ve/veya ResizeObserver ile izler.
 *   Stil/attr/çocuk yapısı değiştikçe otomatik olarak history.exec(...) ile
 *   komut push edilir. Bu sayede kullanıcı manuel DOM edit yapsa bile
 *   (ör. inspector tarzı) geri alınabilir hale gelir. fileciteturn12file0
 *
 * - attachEventTracking():
 *   EventTarget.prototype.addEventListener / removeEventListener patch'lenerek,
 *   yeni listener ekleme/çıkarma eylemleri bile komut olarak history'ye
 *   kaydedilebilir (label:'event@add','event@remove'). fileciteturn12file0
 *
 * ThistoryManager, Tevents'ten extend ettiği için:
 *   - this.emit('push',{cmd})
 *   - this.on('commit', handler)
 *   gibi event tabanlı reaksiyonlar mümkündür. fileciteturn12file0
 */

export type ThistoryManagerDiffMode = 'none' | 'diff' | 'full';

export interface ThistoryManagerInitOpts {
  /** History açık mı başlasın? (default true) */
  enabled?: boolean;
  /** Stack limiti. TcommandHistory.limit olarak geçer. (default 1000) */
  limit?: number;
  /** Ardışık merge zaman penceresi (ms). (default 160) */
  mergeWindowMs?: number;
  /**
   * Serializer nesnesi.
   * Beklenen yüzey kabaca:
   *   serialize(root,{space,ignoreProps,updateBaseline}) → diff snapshot
   *   stringify(root,{space}) → full snapshot (string/json)
   * Bu serializer snapshotDiff/snapshotFull / diffMode için kullanılır. fileciteturn12file0
   */
  serializer?: any;
  /**
   * Uygulamanın "root" objesi ya da DOM kökü.
   * diffMode 'diff' veya 'full' ise snapshot bu root üzerinden alınır. fileciteturn12file0
   */
  root?: any;
  /**
   * 'none' | 'diff' | 'full'
   * Commit sonrası payload nasıl üretilecek?
   */
  diffMode?: ThistoryManagerDiffMode;
  /**
   * snapshotDiff çağrısında serializer'a iletilen ignoreProps.
   * Belirli alanları diff dışında tutmak için kullanılır. fileciteturn12file0
   */
  ignoreProps?: any;
}

export class ThistoryManager extends Tevents {
  /** History açık mı? */
  enabled: boolean;

  /** Komut geçmişi yöneticisi. */
  history: TcommandHistory;

  /** DI ile geçen serializer/ref; diffMode için kullanılır. */
  serializer: any;

  /** Snapshot alınırken baz kabul edilen kök node/model. */
  root: any;

  /** 'none' | 'diff' | 'full' */
  diffMode: ThistoryManagerDiffMode;

  /** snapshotDiff çağrısına ignoreProps olarak geçilir. */
  ignoreProps: any;

  /** Aktif açık composite gruplar (beginGroup/endGroup). */
  groups: TcompositeCommand[];

  constructor(opts?: ThistoryManagerInitOpts);

  /* ----------------------------------------------------------------------
   * Durum kontrolü
   * ------------------------------------------------------------------- */

  /** enabled bayrağını değiştirir ve 'enabled' event'i yayar. chainable. */
  setEnabled(v: boolean): this;

  /** toggle() = setEnabled(!enabled). chainable. */
  toggle(): this;

  /** History stack'i temizler ve 'history:clear' event'i yayar. chainable. */
  clear(): this;

  /** history.canUndo() passthrough. */
  canUndo(): boolean;

  /** history.canRedo() passthrough. */
  canRedo(): boolean;

  /** history.size passthrough (geçmişte kaç commit var). */
  get size(): number;

  /** history.index passthrough (undo pointer). */
  get index(): number;

  /* ----------------------------------------------------------------------
   * Gruplama / transaction
   * ------------------------------------------------------------------- */

  /**
   * Yeni bir composite grup başlatır.
   * Sonraki exec() çağrıları tek bir TcompositeCommand içine .add() ile
   * eklenecektir.
   *
   * 'group:begin' event'i emit edilir.
   * Dönen değer bu yeni grup komutudur.
   */
  beginGroup(label?: string): TcompositeCommand;

  /**
   * Son açık grubu kapatır. commit=true ise:
   *   - grup boş değilse history.push(grup) yapılır
   *   - 'history:exec' + 'push' event'leri yayılır
   *   - ayrıca _postCommitPayload ile 'commit' event'i yayılır
   *
   * 'group:end' event'i emit edilir.
   */
  endGroup(commit?: boolean): TcompositeCommand | null;

  /**
   * Aktif grubu iptal eder (undo() çağırır, history'ye push etmez).
   * 'group:end' event'i emit edilir.
   */
  cancelGroup(): TcompositeCommand | null;

  /** beginGroup alias'ı. */
  begin(label?: string): TcompositeCommand;

  /** endGroup alias'ı. labelOrCommit=true → commit et. */
  end(labelOrCommit?: boolean | string): TcompositeCommand | null;

  /** cancelGroup alias'ı. */
  cancel(): TcompositeCommand | null;

  /* ----------------------------------------------------------------------
   * Komut yürütme
   * ------------------------------------------------------------------- */

  /**
   * Bir komutu çalıştırır ve history'ye ekler.
   *
   * Eğer aktif bir grup varsa:
   *   - cmd.do() hemen çalışır
   *   - grup.add(cmd) ile o açık composite'e eklenir
   *   - history.push() çağrılmaz (grup kapanınca yapılacak)
   *
   * Eğer aktif grup yoksa:
   *   - tryMerge=true ise mevcut top() ile mergeWith() denenir
   *   - aksi halde cmd.do() ve history.push(cmd)
   *
   * Her push ardından:
   *   - 'history:exec' event'i emit
   *   - 'push' event'i emit
   *   - _postCommitPayload() ile 'commit' event'i emit
   *
   * chainable döner. fileciteturn12file0
   */
  exec(cmd: Tcommand, opts?: { tryMerge?: boolean }): this;

  /**
   * Birden fazla komutu sırayla exec eder (hepsi aynı opts ile).
   * chainable döner.
   */
  execMany(cmds: Tcommand[], opts?: { tryMerge?: boolean }): this;

  /**
   * Küçük bir convenience: otomatik beginGroup/endGroup yapan blok.
   *
   *   hm.batch('insertMany', (h) => {
   *     h.insert(parent, node1);
   *     h.insert(parent, node2);
   *   });
   *
   * Dönen değer kapatılan composite command'dir.
   */
  batch(label: string | undefined, fn: (hm: this) => any): TcompositeCommand;

  /**
   * Hedef objede bir property/path set eden TpropCommand üretir
   * ve exec eder (tryMerge:true). chainable.
   */
  execProp(target: any, path: string | string[] | any, value: any, label?: string): this;

  /**
   * Undo uygular. Başarılıysa:
   *   - 'history:undo' ve 'undo' event'leri emit edilir.
   * Geri dönüş true/false.
   */
  undo(): boolean;

  /**
   * Redo uygular. Başarılıysa:
   *   - 'history:redo' ve 'redo' event'leri emit edilir.
   * Geri dönüş true/false.
   */
  redo(): boolean;

  /* ----------------------------------------------------------------------
   * Snapshot API
   * ------------------------------------------------------------------- */

  /**
   * Serializer.serialize(root,{space,ignoreProps,updateBaseline:true})
   * çağırarak sadece farkı (diff) JSON friendly bir yapı olarak döndürür.
   * diffMode 'diff' olduğunda commit payload'ı buna dayanır. fileciteturn12file0
   */
  snapshotDiff(opts?: { space?: number; updateBaseline?: boolean }): any | null;

  /**
   * Serializer.stringify(root,{space}) çağırarak root'un tam halini
   * (örn. full JSON dump) döndürür. diffMode 'full' olduğunda commit
   * payload'ı buna dayanır. fileciteturn12file0
   */
  snapshotFull(opts?: { space?: number }): any | null;

  /* ----------------------------------------------------------------------
   * DOM KISAYOLLARI
   * ------------------------------------------------------------------- */

  /**
   * Internal yardımcı: node ya da {el} objesi verildiğinde gerçek HTMLElement'i
   * döndürür. (Telement, {el}, {htmlObject}, direkt HTMLElement ...)
   * Public API değil ama tipliyoruz. fileciteturn12file0
   */
  protected _el(x: any): any;

  /**
   * parent içine node yerleştirir (before referansından önce ise oraya,
   * yoksa appendChild gibi). TdomInsertCommand exec eder.
   * label varsayılanı 'insert'.
   */
  insert(parent: any, node: any, before?: any | null, label?: string): this;

  /**
   * node'u DOM'dan kaldırır. TdomRemoveCommand exec eder.
   * label varsayılanı 'remove'.
   */
  remove(node: any, label?: string): this;

  /**
   * node'u newParent altına (before varsa onun öncesine) taşır.
   * TdomMoveCommand exec eder (tryMerge:true). label varsayılanı 'move'.
   */
  move(node: any, newParent: any, before?: any | null, label?: string): this;

  /**
   * target.style'e patch uygular. TdomStyleCommand exec eder (tryMerge:true).
   * patch: { left:'10px', top:'20px', ... }
   * label varsayılanı 'style'.
   */
  style(target: any, patch?: Record<string, any>, label?: string): this;

  /**
   * target attribute patch. TdomAttrCommand exec eder (tryMerge:true).
   * attrs: { id:'foo', 'data-x':123, ... }
   * label varsayılanı 'attr'.
   */
  attr(target: any, attrs?: Record<string, any>, label?: string): this;

  /**
   * target.dataset patch. TdomDatasetCommand exec eder (tryMerge:true).
   * data: { foo:'bar', ... }
   * label varsayılanı 'dataset'.
   */
  dataset(target: any, data?: Record<string, any>, label?: string): this;

  /**
   * target.textContent değerini ayarlar ve bunu geri alınabilir yapmak için
   * TpropCommand + TdomAttrCommand karması (className benzeri pattern)
   * kullanır. label varsayılanı 'text'. fileciteturn12file0
   */
  text(target: any, textValue: any, label?: string): this;

  /**
   * className'i komple değiştirir ve eski class'ı geri alabilmek için
   * TdomAttrCommand exec eder (tryMerge:true).
   * label varsayılanı 'className'.
   */
  className(target: any, next: any, label?: string): this;

  /** classAdd: tek bir class ekleyip className() üstünden kaydeder. */
  classAdd(target: any, name: string, label?: string): this;

  /** classRemove: tek bir class silip className() üstünden kaydeder. */
  classRemove(target: any, name: string, label?: string): this;

  /** classToggle: bir class'ı ekle/çıkar, istenirse force ile. */
  classToggle(target: any, name: string, force?: boolean | null, label?: string): this;

  /**
   * Konum + boyut patch'i (left/top/width/height gibi sayısal px değerleri).
   * Hem inline style patch'i hem TdomSizeCommand üretir ve tek seferde
   * execMany([...]) ile kaydeder. label varsayılanı 'rect'. fileciteturn12file0
   */
  rect(
    target: any,
    patch?: { left?: number; top?: number; width?: number; height?: number },
    label?: string
  ): this;

  /**
   * Sadece width/height patch eder. TdomStyleCommand + TdomSizeCommand
   * birlikte execMany([...]). label varsayılanı 'size'. fileciteturn12file0
   */
  size(
    target: any,
    patch?: { width?: number; height?: number },
    label?: string
  ): this;

  /**
   * Generic prop setter shortcut. TpropCommand exec eder (tryMerge:true).
   * pathArray, string yol veya ['style','left'] gibi bir dizi olabilir.
   * label varsayılanı 'prop'.
   */
  prop(
    target: any,
    pathArray: string | string[] | any,
    next: any,
    label?: string
  ): this;

  /**
   * Bir "interact" controller'ını (örn. sürükle/yeniden boyutlandır)
   * history ile entegre eder.
   *
   * Akış:
   *   - move:start / resize:start → mevcut tüm hedef node'ların rect'i kaydedilir
   *   - move:end   / resize:end   → yeni rect ile eski rect kıyaslanır,
   *                                değişenler için rect(...) çağrılarak
   *                                'move' veya 'resize' adlı tek group commit
   *                                oluşturulur. fileciteturn12file0
   *
   * Dönüş: this (chainable).
   */
  bindInteract(interact: {
    on(ev: 'move:start' | 'move:end' | 'resize:start' | 'resize:end', fn: (data: any) => void): any;
  }): this;

  /* ----------------------------------------------------------------------
   * OBSERVER / TRACKING API (prototype üzerinden eklenir)
   * ------------------------------------------------------------------- */

  /**
   * addTrack() ile eklenen tüm observer'ları durdurur (ResizeObserver /
   * MutationObserver disconnect). 'observe:suspend' event'i emit edilir.
   * true döner. fileciteturn12file0
   */
  suspendObservers(): boolean;

  /**
   * Daha önce suspend edilmiş observer'ları yeniden aktif eder (observe çağrıları).
   * 'observe:resume' event'i emit edilir. true döner. fileciteturn12file0
   */
  resumeObservers(): boolean;

  /**
   * Bir hedef elementi (veya {el}/{htmlObject}) izle. Değişiklikler otomatik
   * olarak history'ye komut olarak işlenir.
   *
   * opts:
   *   - trackStyle     : inline style değişimini kaydet (default true)
   *   - trackResize    : ResizeObserver ile boyut/konum değişimini kaydet (default true)
   *   - trackChildren  : childList mutasyonlarını kaydet (default false)
   *   - trackAttr      : attribute değişimini kaydet (default false)
   *   - throttleMs     : observer callback throttle süresi (default 50ms)
   *   - onlyAttr       : sadece bu attribute'ları izle (string[])
   *   - ignoreAttr     : bu attribute'ları yok say (string[] veya RegExp)
   *   - subtree        : MutationObserver'da subtree:true kullan (default false)
   *
   * Dönüş: true ise track başarıyla eklendi, false ise el bulunamadı. fileciteturn12file0
   */
  addTrack(
    target: any,
    opts?: {
      trackStyle?: boolean;
      trackResize?: boolean;
      trackChildren?: boolean;
      trackAttr?: boolean;
      throttleMs?: number;
      onlyAttr?: string[];
      ignoreAttr?: string[] | RegExp;
      subtree?: boolean;
      [key: string]: any;
    }
  ): boolean;

  /**
   * addTrack() ile eklenen observer'ları sök. 'track:remove' event'i emit edilir.
   * true/false döner. fileciteturn12file0
   */
  removeTrack(target: any): boolean;

  /**
   * EventTarget.prototype.addEventListener / removeEventListener patch'leyerek
   * her listener ekleme/çıkarma işlemini history.exec(...) ile kaydetmeye başlar.
   * Bu sayede event wiring bile undo/redo ile izlenebilir. 'eventTracking:on'
   * event'i emit edilir. true/false döner. fileciteturn12file0
   *
   * NOT: Orijinal prototip referansları tutulmadığı için detachEventTracking()
   * basitçe sadece "flag kapandı" bildirir; tam geri alma için ortamın
   * tazelenmesi gerekebilir. fileciteturn12file0
   */
  attachEventTracking(): boolean;

  /**
   * attachEventTracking() sonrası tracking'i kapatır.
   * 'eventTracking:off' event'i emit edilir. true/false döner. fileciteturn12file0
   */
  detachEventTracking(): boolean;
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

declare const _default: typeof ThistoryManager;
export default _default;

export {
  Tcommand,
  TcompositeCommand,
  TpropCommand,
  TarraySpliceCommand,
  TdomStyleCommand,
  TdomAttrCommand,
  TdomDatasetCommand,
  TdomInsertCommand,
  TdomRemoveCommand,
  TdomMoveCommand,
  TdomSizeCommand,
  TcommandHistory,
  ThistoryManager,
};

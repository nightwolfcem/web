/**
 * Tlayer.d.ts
 * ---------------------------------------------------------------------------
 * Layer ağacı + history entegre CRUD komutları.
 *
 * Bu modül üç ana şeyi sağlar:
 *
 * 1. class Tlayer
 *    - Tek bir düğümü (node) temsil eder: parent, children, görünürlük,
 *      kilitli mi, z-order, serbest data payload vs.
 *    - Çocuğu ekleme/çıkarma/sıralama, Z yükseltme/indirme, bbox seçim,
 *      alt slot yönetimi (createSubLayers) gibi sahne düzenleme işlerini yapar.
 *      fileciteturn126file1
 *
 * 2. Komut sınıfları (TlayerAdd, TlayerRemove, ...)
 *    - ThistoryManager ile uyumlu undo/redo komut objeleri.
 *      history.exec(cmd,{label,tryMerge}) ile kullanılmak üzere
 *      Tcommand tabanlıdır. fileciteturn126file1
 *
 * 3. class Tlayers
 *    - Kök Tlayer'ı tutar ve ağaç üzerinde CRUD yapar (create/remove/...).
 *    - Bu CRUD işlemlerini ister doğrudan uygular ister history.exec ile
 *      undo/redo'ya sarar.
 *      fileciteturn126file1
 *
 * Ayrıca createSubLayers(...) yardımcı fonksiyonu export edilir. fileciteturn126file1
 */

import type { Tevents } from './Tevents.js';
import type { Tcommand } from './Tcommand.js';

/* ==========================================================================
 *  Tlayer
 * ========================================================================== */

/**
 * TlayerInitProps
 * ----------------
 * Tlayer ctor'una geçilen başlangıç verisi. Koddaki constructor(props)
 * içinden name, visible, locked, z ve data okunuyor. id opsiyonel olarak
 * verilebiliyor ama runtime'da internal ensureId() zaten her düğüme
 * benzersiz bir id atıyor. fileciteturn126file1
 */
export interface TlayerInitProps {
  /** Başlık / kullanıcı adı (UI listesinde gösterilebilir). */
  name?: string;
  /** true → sahnede render edilsin mi? */
  visible?: boolean;
  /** true → kilitli / düzenlenemez / taşınamaz. */
  locked?: boolean;
  /** z-order değeri (sıralama için). */
  z?: number;
  /** Serbest payload (kullanıcı verisi). */
  data?: any;
  /** İsteğe bağlı başlangıç id'si. Yoksa otomatik atanır. */
  id?: string;
  /** İsteğe bağlı başlangıç çocuk listesi vs. (kod bazı alanları okuyor). */
  [key: string]: any;
}

/**
 * Tlayer
 * ------
 * Sahnedeki tek bir node. Hem mantıksal hiyerarşi (parent/children) tutar,
 * hem de UI düzenleme operasyonlarını kolaylaştıran metodlar sağlar:
 * insert, reorder, bringToFront, hitTest vb. fileciteturn126file1
 *
 * Bir Tlayer genelde şöyle oluşur:
 *
 *   const node = new Tlayer({ name:'Rect 1', visible:true, /* order via parent.reorder(...) */ });
 *   parent.insert(node, null);
 *
 * veya Tlayers.create(...) ile otomatik id + history kaydı ile: bkz Tlayers. fileciteturn126file1
 */
export interface TlayerOptions {
  id?: string | null;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  data?: any;
  el?: Element | null;
  host?: Element | null;
  container?: Element | null;
  parent?: any;
  tag?: string;
  layerName?: string;
}

export class Tlayer extends (Tevents as {
    constructor(opts?: TlayerOptions);
    constructor(tag: string, opts?: TlayerOptions); new(...args:any[]): any }) {
  /** Benzersiz id (ensureId(...) ile atanır). */
  id: string;
  /** Kullanıcı dostu isim. */
  name: string;
  /** Görünürlük bayrağı. */
  visible: boolean;
  /** Kilit bayrağı (true ise taşınamaz / düzenlenemez). */
  locked: boolean;
  /** Z sırası (sahnede üstte/ altta çizim için). *//** Serbest payload. */
  data: any;
  /** Üst düğüm. root için null. */
  parent: Tlayer | null;
  /** Çocuk liste. */
  children: Tlayer[];

  constructor(props?: TlayerInitProps);

  /**
   * Bu düğüm kök mü? parent yoksa true döner.
   */
  isRoot(): boolean;

  /**
   * Bu düğümün parent.children içindeki index'i.
   * parent yoksa -1 döner.
   */
  index(): number;

  /**
   * append(child)
   * -------------
   * @param child  Eklenecek Tlayer
   * @returns this
   *
   * child.parent varsa önce eski parent.remove(child) yapılır,
   * sonra this.insert(child, sonIndex) çağrılır.
   * 'add' event'i emit edilir {parent, child, index}. fileciteturn126file1
   */
  append(child: Tlayer): this;

  /**
   * prepend(child)
   * --------------
   * @param child  Eklenecek Tlayer
   * @returns this
   *
   * this.insert(child, 0) shortcut'ıdır.
   */
  prepend(child: Tlayer): this;

  /**
   * insert(child, atIndex?)
   * -----------------------
   * @param child    Taşınacak/eklencek düğüm
   * @param atIndex  Hedef index (null ise sona eklenir)
   * @returns this
   *
   * - child zaten başka parent altındaysa oradan çıkarılır
   * - benzersiz id garantiye alınır
   * - this.children içine splice ile yerleştirilir
   * - 'add' event'i emit edilir { parent:this, child, index:i }.
   */
  insert(child: Tlayer, atIndex?: number | null): this;

  /**
   * remove(child)
   * -------------
   * @param child  Silinecek/çıkarılacak çocuk
   * @returns this
   *
   * Çocuğu this.children'dan atar, child.parent=null yapar,
   * 'remove' event'i emit eder { parent:this, child, index }. fileciteturn126file1
   */
  remove(child: Tlayer): this;

  /**
   * reorder(child, newIndex)
   * ------------------------
   * @param child     Hareket ettirilecek çocuk
   * @param newIndex  Hedef index
   * @returns this
   *
   * Çocuğu listeden çıkarıp yeni pozisyona tekrar ekler.
   * 'reorder' event'i emit eder { parent:this, child, from, to }. fileciteturn126file1
   */
  reorder(child: Tlayer, newIndex: number): this;

  /**
   * setProps(patch)
   * ---------------
   * @param patch  { name?, visible?, locked?, z?, data? }
   * @returns this
   *
   * Bu node'un temel alanlarını günceller ve 'props' event'i emit eder
   * { node:this, prev, next }. Tlayers.setProps(...) bu metodu history.exec
   * içinde kullanır ki undo/redo mümkün olsun. fileciteturn126file1
   */
  setProps(patch?: Partial<TlayerInitProps>): this;

  /**
   * walk(fn)
   * --------
   * Depth-first gezer. Önce kendini fn(this) ile çağırır, sonra tüm
   * alt çocuklara iner.
   *
   * @param fn (node: Tlayer) => void
   */
  walk(fn: (node: Tlayer, depth?: number) => void): void;

  /**
   * find(pred)
   * ----------
   * @param pred (node)=>boolean
   * @returns İlk eşleşen node veya null
   *
   * Kendinden başlar (pred(this)), sonra çocuklarda derin arama yapar.
   */
  find(pred: (node: Tlayer) => boolean): Tlayer | null;

  /**
   * findById(id)
   * ------------
   * @returns id eşleşen ilk düğüm (derin arama) veya null.
   */
  findById(id: string): Tlayer | null;

  /**
   * path()
   * ------
   * @returns Bu düğüme gelene kadar parent zincirindeki id'lerin dizisi.
   *          root→...→this şeklinde.
   */
  path(): string[];

  /**
   * bringToFront()
   * --------------
   * Kardeş listesinde bu düğümü en sona (en öne) alır. (parent.reorder)
   * @returns this
   */
  bringToFront(): this;

  /**
   * sendToBack()
   * ------------
   * Kardeş listesinde bu düğümü başa alır.
   * @returns this
   */
  sendToBack(): this;

  /**
   * raise(step=1) / lower(step=1)
   * -----------------------------
   * Kardeşler arasında index'i step kadar ileri/geri iter.
   * Örnek: node.raise() bir adım öne getirir.
   * @returns this
   */
  raise(step?: number): this;
  lower(step?: number): this;

  /**
   * setZ(z)
   * -------
   * @param z yeni z-order değeri
   * @returns this
   *
   * this.z güncellenir ve 'zchange' event'i emit edilir { node:this, z }.
   *//**
   * createSubLayers(order)
   * ----------------------
   * Bu node için içte "slot" div'leri yaratır / günceller. Amaç:
   * background, base, content, overlay, selection gibi alt katman
   * DOM container'larını sabit bir sırada yönetmek.
   *
   * - Yoksa host DOM'u oluşturur (class 't-layer').
   * - order verilmezse varsayılan sıralamayı kullanır
   *   ['background','base','content','overlay','selection'].
   * - Her isim için .t-layer-slot.t-layer-{name} şeklinde bir div yaratır,
   *   position:absolute; left/top/right/bottom:0 vs. uygular.
   * - host.appendChild(...) ile DOM sırasını bu listeye göre zorlar.
   *
   * @param order string[] gibi slot isimleri sırası.
   * @returns this
   *
   * Bu API özellikle overlay, selection highlight, dragPreview gibi
   * üst üste binen UI katmanlarını yönetmek için kullanılıyor. fileciteturn126file1
   */
  createSubLayers(order?: string[]): this;

  /**
   * hitTest(x,y)
   * ------------
   * @param x viewport X
   * @param y viewport Y
   * @returns En üstte vurulan child veya null
   *
   * Çocukları ters sırayla dolaşır (son çocuk en üst kabul edilir) ve
   * her child.hitTest(...) veya child.rect ({x,y,w,h}) üzerinden
   * çarpışma testi yapar. İlk eşleşeni döndürür. fileciteturn126file1
   */
  hitTest(
    x: number,
    y: number
  ): any /* genelde Tlayer child veya domain objesi */;

  /**
   * ensureChildren()
   * ----------------
   * İç children dizisini garanti eder, yoksa [] yapar ve onu döndürür.
   * @returns Tlayer[] (this.children)
   */
  ensureChildren(): Tlayer[];

  /**
   * addChild(child, index?)
   * -----------------------
   * @param child  Eklemek istediğin alt nesne (genelde component benzeri)
   * @param index  (ops.) belirli bir sıraya koy
   * @returns this
   *
   * Bu metot, orijinal Tlayer ağacına ek olarak komponent benzeri
   * "child" yapıları da yönetebilmek için eklenmiş "appendChild" türü
   * yardımcıdır. Eğer child.mount(...) varsa ve bu layer'ın el'i varsa
   * direkt DOM'a mount eder. fileciteturn126file1
   */
  addChild(child: any, index?: number | null): this;

  /**
   * removeChild(child)
   * ------------------
   * @param child kaldırılacak alt nesne
   * @returns this
   *
   * Eğer child.unmount() varsa çağrılır, sonra children[]'dan silinir. fileciteturn126file1
   */
  removeChild(child: any): this;

  /**
   * clear()
   * -------
   * Tüm alt çocukları (component tarzı) kaldırır. Her biri için
   * child.unmount() çağrılmaya çalışılır.
   * @returns this
   */
  clear(): this;

  /**
   * moveChild(child, newIndex)
   * --------------------------
   * @param child
   * @param newIndex hedef sıra
   * @returns this
   *
   * children[] dizisi yeniden sıralanır ve eğer DOM'da zaten mount'luysa
   * gerçek DOM child sırası da güncellenir (insertBefore). fileciteturn126file1
   */
  moveChild(child: any, newIndex: number): this;

  /**
   * getById(id)
   * -----------
   * @returns Bu layer'ın component-children dizisinde (ve derininde)
   *          id eşleşen nesne varsa onu döndürür, yoksa null.
   */
  getById(id: string): any | null;

  /**
   * each(fn,{deep=true})
   * --------------------
   * @param fn   callback(child) -> false dönerse durur
   * @param deep true ise recursive olarak alt çocuklarda da dolaşır
   * @returns this
   *
   * Bu API component alt-ağacını gezmek için kullanılır (Tlayer'in
   * kendisinden farklı olarak "display object children" gibi görülebilir). fileciteturn126file1
   */
  each(
    fn: (child: any) => void | boolean,
    opts?: { deep?: boolean }
  ): this;

  /**
   * selectionAABB(selection)
   * ------------------------
   * @param selection  Tselection benzeri; selection.list() ile id listesi verir
   * @returns          {x,y,w,h} benzeri birleşik bounding box ya da null.
   *
   * Seçili objelerin bounding box'larını toplayıp tek bir union box döndürür.
   * Bu, Tinteract.groupBox çizimi gibi "seçimi çerçevele" UI'lerinde kullanılır. fileciteturn126file1
   */
  selectionAABB(selection: any): { x: number; y: number; w: number; h: number } | null;

  /**
   * toMinJSON()
   * -----------
   * Küçük bir snapshot döndürür:
   *   { type:'Tlayers', args:[ { root:this.root } ] }
   * Kodda Tlayers sınıfı ile uyumlu bir serializer formatı döndürülüyor. fileciteturn126file1
   */
  toMinJSON(): any;

  /**
   * toJSON()
   * --------
   * Daha okunabilir debug çıktısı döndürür:
   *   { type:'Tlayers', args:[ { root:this.root } ] }
   * (Not: kaynakta class ismi/namespace üzerinden derive ediliyor.) fileciteturn126file1
   */
  toJSON(): any;

  /**
   * fromJSON(doc)
   * -------------
   * @static
   * @param doc Serileştirilmiş node bilgisi
   * @returns   Yeni Tlayer ağacı (çocuklar dahil recursively).
   *
   * Kaynak dosyada iki farklı fromJSON tanımı var; en son tanım
   * Tlayer.fromJSON(doc) → tek bir Tlayer düğümü inşa ediyor,
   * children alanını da recursive olarak dolduruyor. fileciteturn126file1
   */
  static fromJSON(doc: any): Tlayer;
}

/* ==========================================================================
 *  HISTORY KOMUT SINIFLARI
 * ========================================================================== */

/**
 * Aşağıdaki komut sınıfları Tcommand tabanlıdır ve ThistoryManager.exec ile
 * kullanılır. Hepsi do()/undo() ve toPatch() içerir. Bazılarında mergeWith()
 * de vardır (ör. ardışık property değişimlerini tek entry'de birleştirmek). fileciteturn126file1
 */

/** layer:add → parent.insert(child,index) / undo: eski parent/index'e geri al. */
export interface TlayerOptions {
  id?: string | null;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  data?: any;
  el?: Element | null;
  host?: Element | null;
  container?: Element | null;
  parent?: any;
  tag?: string;
  layerName?: string;
}

export class TlayerAdd extends (Tcommand as { new(...args:any[]): any }) {
  parent: Tlayer;
  child: Tlayer;
  index: number | null;
  constructor(parent: Tlayer, child: Tlayer, index?: number | null, label?: string);
  do(): void;
  undo(): void;
  toPatch(): { type:'layer-add'; parent:string|null; child:string|null; index:number|null };
}

/** layer:remove → parent.remove(child) / undo: insert eski index'e. */
export interface TlayerOptions {
  id?: string | null;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  data?: any;
  el?: Element | null;
  host?: Element | null;
  container?: Element | null;
  parent?: any;
  tag?: string;
  layerName?: string;
}

export class TlayerRemove extends (Tcommand as { new(...args:any[]): any }) {
  parent: Tlayer;
  child: Tlayer;
  constructor(parent: Tlayer, child: Tlayer, label?: string);
  do(): void;
  undo(): void;
  toPatch(): { type:'layer-remove'; parent:string|null; child:string|null };
}

/** layer:reparent → child yeni parent/index'e taşınır, undo eski parent/index. */
export interface TlayerOptions {
  id?: string | null;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  data?: any;
  el?: Element | null;
  host?: Element | null;
  container?: Element | null;
  parent?: any;
  tag?: string;
  layerName?: string;
}

export class TlayerReparent extends (Tcommand as { new(...args:any[]): any }) {
  child: Tlayer;
  newParent: Tlayer;
  index: number | null;
  constructor(child: Tlayer, newParent: Tlayer, index?: number | null, label?: string);
  do(): void;
  undo(): void;
  toPatch(): { type:'layer-reparent'; child:string|null; parent:string|null; index:number|null };
}

/** layer:reorder → parent.reorder(child,newIndex) / undo eski index. */
export interface TlayerOptions {
  id?: string | null;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  data?: any;
  el?: Element | null;
  host?: Element | null;
  container?: Element | null;
  parent?: any;
  tag?: string;
  layerName?: string;
}

export class TlayerReorder extends (Tcommand as { new(...args:any[]): any }) {
  parent: Tlayer;
  child: Tlayer;
  newIndex: number;
  constructor(parent: Tlayer, child: Tlayer, newIndex: number, label?: string);
  do(): void;
  undo(): void;
  toPatch(): { type:'layer-reorder'; parent:string|null; child:string|null; to:number };
}

/**
 * layer:props → node.setProps(patch)
 * mergeWith(next) aynı node ise patch'leri birleştirir
 * (örn. inspector live edit sırasında sürekli küçük değişiklikleri
 * tek history entry'sine toplamak). fileciteturn126file1
 */
export interface TlayerOptions {
  id?: string | null;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  data?: any;
  el?: Element | null;
  host?: Element | null;
  container?: Element | null;
  parent?: any;
  tag?: string;
  layerName?: string;
}

export class TlayerSetProps extends (Tcommand as { new(...args:any[]): any }) {
  node: Tlayer;
  patch: Record<string, any>;
  constructor(node: Tlayer, patch: Record<string, any>, label?: string);
  do(): void;
  undo(): void;
  toPatch(): { type:'layer-props'; id:string|null; patch:Record<string, any> };
  mergeWith(n: TlayerSetProps): boolean;
}

/* ==========================================================================
 *  TLayers (AĞAÇ YÖNETİCİSİ)
 * ========================================================================== */

/**
 * TlayersInitOpts
 * ---------------
 * Koddaki ctor signature:
 *   new Tlayers(root?, { history }?)
 * Burada root Tlayer değilse otomatik `new Tlayer({name:'root'})`
 * oluşturuluyor. ensureId(root) çağrılıyor. history opsiyonel. fileciteturn126file1
 */
export interface TlayersInitOpts {
  history?: any;
}

/**
 * Tlayers
 * -------
 * Bir Tlayer ağacını (root dahil) yönetir:
 * - create / remove / reparent / reorder / setProps
 * - her işlem için ister doğrudan uygular ister history.exec(...) ile
 *   undo/redo'ya sarar
 * - id → node map tutar (this._index) ki hızlı erişim olsun
 *
 * Bu sınıf editördeki "model store" gibidir. Inspector, Interact, vb.
 * modüller genelde Tlayers örneğine konuşur. fileciteturn126file1
 */
export interface TlayerOptions {
  id?: string | null;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  data?: any;
  el?: Element | null;
  host?: Element | null;
  container?: Element | null;
  parent?: any;
  tag?: string;
  layerName?: string;
}

export class Tlayers extends (Tevents as { new(...args:any[]): any }) {
  /** Kök düğüm. */
  root: Tlayer;
  /** Undo/redo yöneticisi (opsiyonel). */
  history: any;
  /** id -> node map'i. reindex() ile güncellenir. */
  protected _index: Map<string, Tlayer>;

  constructor(root?: Tlayer | Partial<TlayerInitProps> | null, opts?: TlayersInitOpts);

  /**
   * setHistory(h)
   * -------------
   * History bağlamını sonradan değiştirmek için.
   * chainable.
   */
  setHistory(h: any): this;

  /**
   * reindex()
   * ---------
   * root.walk(...) ile tüm düğümleri dolaşır ve this._index'i
   * (id → node) tekrar kurar.
   * @returns this
   */
  reindex(): this;

  /**
   * get(id)
   * -------
   * @returns id eşleşen node veya null.
   * O(1) erişim için this._index map'ini kullanır.
   */
  get(id: string): Tlayer | null;

  /**
   * find(pred)
   * ----------
   * @param pred (node)=>boolean
   * @returns İlk eşleşen düğüm ya da null
   * root.find(pred) shortcut'ıdır.
   */
  find(pred: (node: Tlayer) => boolean): Tlayer | null;

  /**
   * create(props, parent?, index?, {label?,tryMerge?})
   * -------------------------------------------------
   * @param props      TlayerInitProps
   * @param parent     Varsayılan this.root
   * @param index      İsteğe bağlı insert index
   * @param options    { label?:string, tryMerge?:boolean }
   * @returns          Yeni Tlayer düğümü
   *
   * Eğer this.history varsa history.exec(new TlayerAdd(...)),
   * yoksa direkt parent.insert(...).
   * Sonra _index map'ine node eklenir ve 'create' event'i emit edilir
   * { node, parent, index }. fileciteturn126file1
   */
  create(
    props?: TlayerInitProps,
    parent?: Tlayer,
    index?: number | null,
    options?: { label?: string; tryMerge?: boolean }
  ): Tlayer;

  /**
   * remove(node,{label?,tryMerge?})
   * -------------------------------
   * @returns true → kaldırıldı, false → yok sayıldı (root silinemez)
   *
   * history varsa TlayerRemove komutu exec edilir.
   * Yoksa node.parent.remove(node) yapılır.
   * Sonra _index map'inden silinir ve 'remove' event'i emit edilir. fileciteturn126file1
   */
  remove(
    node: Tlayer | null,
    options?: { label?: string; tryMerge?: boolean }
  ): boolean;

  /**
   * reparent(node,newParent,index?,{label?,tryMerge?})
   * -------------------------------------------------
   * Bir düğümü başka parent altına taşır.
   * history varsa TlayerReparent, yoksa newParent.insert(node,index).
   * 'reparent' event'i emit edilir { node,newParent,index }. fileciteturn126file1
   */
  reparent(
    node: Tlayer | null,
    newParent: Tlayer | null,
    index?: number | null,
    options?: { label?: string; tryMerge?: boolean }
  ): boolean;

  /**
   * reorder(node,newIndex,{label?,tryMerge?})
   * ----------------------------------------
   * Aynı parent içinde node'un sırasını değiştirir.
   * history varsa TlayerReorder, yoksa parent.reorder(node,newIndex).
   * 'reorder' event'i emit edilir { node,parent,to:newIndex }. fileciteturn126file1
   */
  reorder(
    node: Tlayer | null,
    newIndex: number,
    options?: { label?: string; tryMerge?: boolean }
  ): boolean;

  /**
   * setProps(node,patch,{label?,tryMerge?})
   * --------------------------------------
   * node.setProps(patch) işlemini history-aware şekilde yapar.
   *
   * history varsa TlayerSetProps komutu exec edilir (mergeWith desteği
   * sayesinde inspector live edit sırasında ardışık ufak değişiklikler
   * tek history entry'sine birleştirilebilir). Yoksa node.setProps(patch)
   * direkt çağrılır.
   * 'props' event'i emit edilir { node, patch }. fileciteturn126file1
   */
  setProps(
    node: Tlayer | null,
    patch: Record<string, any>,
    options?: { label?: string; tryMerge?: boolean }
  ): boolean;

  /**
   * walk(fn)
   * --------
   * root.walk(fn) kısayolu. chainable.
   */
  walk(fn: (node: Tlayer) => void): this;

  /**
   * flatten()
   * ---------
   * Tüm ağacı tek bir diziye düzer (DFS sırası).
   * @returns Tlayer[]
   */
  flatten(): Tlayer[];

  /**
   * pathOf(node)
   * ------------
   * @returns node.path() → ["rootId","childId",...]
   */
  pathOf(node: Tlayer | null): string[];

  /**
   * toMinJSON() / toJSON()
   * ----------------------
   * Seri hale getirme yardımcıları. Debug / persist için hafif snapshot
   * verirler; özellikle toJSON(), kök id ve toplam düğüm sayısı gibi
   * bilgiler içerir. fileciteturn126file1
   */
  toMinJSON(): any;
  toJSON(): any;
}

/* ==========================================================================
 *  YARDIMCI EXPORT
 * ========================================================================== */

/**
 * createSubLayers(target, order)
 * ------------------------------
 * @param target Bir Tlayer veya doğrudan bir DOM container olabilir.
 * @param order  İstenen sub-layer sırası (örn. ['background','content','overlay'])
 * @returns      Eğer target bir Tlayer ise layer.createSubLayers(order);
 *               değilse yeni bir Tlayer yaratılır, host olarak sağlanan
 *               DOM'a bağlanır ve onun createSubLayers(order) çağrılır.
 *
 * Bu helper, "hemen bu DOM için overlay/content/selection slotlarını hazırla"
 * gibi hızlı bir kurulum sağlar. fileciteturn126file1
 */
export function createSubLayers(
  target: any,
  order?: string[]
): Tlayer;

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

/**
 * Varsayılan export toplu isimler döner:
 *   { Tlayer, Tlayers, TlayerAdd, TlayerRemove, ... }
 * Bu, orijinal modülün
 *   export default { Tlayer, Tlayers, ... }
 * yapısına denk gelir. fileciteturn126file1
 */
declare const _default: {
  Tlayer: typeof Tlayer;
  Tlayers: typeof Tlayers;
  TlayerAdd: typeof TlayerAdd;
  TlayerRemove: typeof TlayerRemove;
  TlayerReparent: typeof TlayerReparent;
  TlayerReorder: typeof TlayerReorder;
  TlayerSetProps: typeof TlayerSetProps;
};

export default _default;

/**
 * Tpersist.d.ts
 * ---------------------------------------------------------------------------
 * Kalıcı depolama / snapshot yönetimi katmanı.
 *
 * Hedefi:
 *  - Bir uygulamanın/Canvas'ın anlık durumunu (model) JSON-friendly bir
 *    "doc" olarak serileştirmek (serializer.toMinDoc / toDoc),
 *  - Bunu localStorage veya IndexedDB'ye koymak,
 *  - Geri yüklerken serializer.fromMinDoc / fromDoc ile canlı objeye
 *    geri kurmak,
 *  - ThistoryManager.commit eventlerini dinleyip autosave yapmak,
 *  - JSON export/import (dosyaya indir / dosyadan geri al)
 *  - Şema versiyonları arasında migrate edebilmek. fileciteturn127file2
 *
 * Runtime dosyada CLASS(...extends Teevents) ile tanımlanır.
 * Yani event emitter gibi davranır ve şu event'leri yayar:
 *
 *  - 'save'   { key, meta }                → save() sonrası
 *  - 'load'   { key, meta }                → load() sonrası (revive başarılıysa)
 *  - 'delete' { key }                      → delete() sonrası
 *  - 'error'  { op, error, key? }          → herhangi bir hata
 *  - 'autosave:on'  { name }               → autosaveOn() çağrılınca
 *  - 'autosave:off'                        → autosaveOff() çağrılınca fileciteturn127file2
 *
 * Notlar:
 *  - Varsayılan serializer = yeni Tserializer() örneği.
 *  - storage 'local' (localStorage) veya 'idb' (IndexedDB).
 *  - Snapshot yapısı { __meta:{ts,...}, doc:{...} } şeklindedir.
 */

import type { Tevents } from './Tevents.js';

/**
 * Kurucu opsiyonları
 *
 * ns           : Namespace/prefix. Her kaydın anahtarı `${ns}:${name}`
 * storage      : 'local' | 'idb'
 * idbName      : IndexedDB DB adı (storage='idb' ise)
 * idbStore     : IndexedDB object store adı
 * minimize     : serializer.toMinDoc kullan (daha hafif snapshot)
 * history      : ThistoryManager benzeri; autosaveOn için dinlenir
 * autosave     : (şu an için yalnızca opsiyonel fikirsel bayrak;
 *                 gerçek autosave'i autosaveOn ile açarsın)
 * debounceMs   : autosave debounce süresi (ms)
 * S            : custom serializer override (toMinDoc/fromMinDoc gibi)
 */
export interface TpersistInitOpts {
  ns?: string;
  storage?: 'local' | 'idb';
  idbName?: string;
  idbStore?: string;
  minimize?: boolean;
  history?: any;
  autosave?: boolean;
  debounceMs?: number;
  S?: any;
}

/**
 * load() için opsiyonlar.
 *
 * revive : true ise geri dönen şey canlı model objesi olur
 *          (serializer.fromMinDoc / fromDoc çağrılır).
 *          false ise ham payload ({__meta,doc}) döner.
 *
 * ctx    : revive sırasında serializer'a geçilecek ek context.
 */
export interface TpersistLoadOpts {
  revive?: boolean;
  ctx?: any;
}

/**
 * importFromFile() için opsiyonlar (load ile aynı semantik).
 */
export interface TpersistImportFileOpts {
  revive?: boolean;
  ctx?: any;
}

/**
 * autosaveOn() için opsiyonlar.
 *
 * name    : kaydedilecek kayıt ismi ('autosave' varsayılan)
 * source  : kaydedilecek model objesi sabit ise bunu ver.
 *           Vermezsen event.payloadRoot içinden alınmaya çalışılır.
 */
export interface TpersistAutosaveOpts {
  name?: string;
  source?: any;
}

/**
 * snapshot() çıktısı.
 *
 * __meta.ts : snapshot zamanı (Date.now())
 * __meta.*  : snapshot çağrısında verdiğin meta alanları
 * doc       : serializer.toMinDoc(...) / toDoc(...) çıktısı
 */
export interface TpersistSnapshot<T = any> {
  __meta: {
    ts: number;
    [k: string]: any;
  };
  doc: T;
}

/**
 * Tpersist
 * --------
 *
 * Temel kullanım:
 *
 *   const store = new Tpersist({ ns:'myApp', storage:'local', history });
 *
 *   // Manuel kaydet
 *   await store.save('doc1', appRoot, { version: 3 });
 *
 *   // Geri yükle
 *   const restored = await store.load('doc1'); // serializer.fromMinDoc ile revive eder
 *
 *   // Autosave aç (history.commit eventlerini dinle)
 *   store.autosaveOn(history, { name:'autosave', source: appRoot });
 *
 *   // Dışa aktar
 *   store.exportToFile('doc1', appRoot, { filename:'scene.json' });
 *
 *   // JSON string → canlı model
 *   const model = store.fromText(textDump);
 *
 *   // Şema versiyonu
 *   store.setSchema(2)
 *        .registerMigration(1,2, data => patchData(data));
 *
 *   const migrated = store.migrate(oldMinDoc, 1, 2);
 */
export class Tpersist extends (Tevents as { new(...args:any[]): any }) {
  /** Namespace/prefix. */
  ns: string;

  /** 'local' veya 'idb'. */
  storage: 'local' | 'idb';

  /** IndexedDB DB adı (storage==='idb'). */
  idbName: string;

  /** IndexedDB objectStore adı. */
  idbStore: string;

  /** toMinDoc kullanılsın mı. */
  minimize: boolean;

  /** History manager referansı (autosave için). */
  history: any;

  /** Serializer nesnesi (varsayılan: yeni Tserializer()). */
  serializer: any;

  /** Autosave açık mı (autosaveOn/autosaveOff yönetir). */
  protected _autosaveOn: boolean;

  /** Geçerli şema versiyonu (opsiyonel). */
  schemaVersion?: number;

  constructor(opts?: TpersistInitOpts);

  /* ----------------------------------------------------------------------
   * Konfigürasyon mutator'ları (chainable)
   * ------------------------------------------------------------------- */

  /** History referansını değiştir. chainable. */
  setHistory(h: any): this;

  /** Serializer override et. chainable. */
  setSerializer(S: any): this;

  /** Depolama modunu değiştir ('local' | 'idb'). chainable. */
  setStorage(kind: 'local' | 'idb'): this;

  /** Namespace değiştir. chainable. */
  setNamespace(ns: string): this;

  /* ----------------------------------------------------------------------
   * Snapshot
   * ------------------------------------------------------------------- */

  /**
   * Verilen model objesini serializer ile hafif bir belgeye çevirir.
   *
   * @param obj   Kaynak model (ör. uygulama root state)
   * @param meta  Ek meta (ör. { version:3 })
   * @returns     { __meta:{ts,...meta}, doc:{...} } veya null hata durumunda
   *
   * Hata oluşursa 'error' event'i yayılır {op:'snapshot',error}.
   */
  snapshot<T=any>(obj: T, meta?: Record<string, any>): TpersistSnapshot | null;

  /* ----------------------------------------------------------------------
   * Kaydet / Yükle / Sil / Listele
   * ------------------------------------------------------------------- */

  /**
   * save(name,obj,meta)
   * -------------------
   * @param name  Kayıt adı (key ns:name ile saklanır)
   * @param obj   Kaydedilecek model
   * @param meta  Ek metadata (snapshot içine konur)
   * @returns     Promise<boolean> (başarılı mı)
   *
   * storage==='local' → localStorage.setItem
   * storage==='idb'   → IndexedDB objectStore.put
   *
   * Başarılıysa 'save' event'i yayılır {key,meta}.
   * Hata varsa 'error' event'i yayılır {op:'save',error,key}. fileciteturn127file2
   */
  save<T=any>(
    name: string,
    obj: T,
    meta?: Record<string, any>
  ): Promise<boolean>;

  /**
   * load(name,{revive,ctx})
   * -----------------------
   * @param name   Kayıt adı
   * @param opts   revive?:boolean, ctx?:any
   * @returns      Promise<obj|null>
   *
   * storage==='local' → localStorage.getItem
   * storage==='idb'   → IndexedDB get
   *
   * Eğer revive===true ise serializer.fromMinDoc / fromDoc ile
   * canlı modele dönüştürülür, sonra 'load' event'i yayılır.
   * Hata varsa 'error' event'i yayılır {op:'load'|'revive',error,key}.
   */
  load<T=any>(
    name: string,
    opts?: TpersistLoadOpts
  ): Promise<T | null>;

  /**
   * delete(name)
   * ------------
   * Anahtarı storage'dan kaldırır.
   * storage==='local' → localStorage.removeItem
   * storage==='idb'   → IndexedDB delete
   * Başarılıysa 'delete' event'i yayılır {key}.
   * Hata varsa 'error' event'i yayılır {op:'delete',error,key}.
   */
  delete(name: string): Promise<boolean>;

  /**
   * list()
   * ------
   * Namespace eşleşen tüm kayıt adlarını döndürür.
   * localStorage'da ns: prefix'ini tarar,
   * IndexedDB'de objectStore içindeki tüm key'leri gezerek filtreler.
   */
  list(): Promise<string[]>;

  /* ----------------------------------------------------------------------
   * Dosyaya aktar / dosyadan al
   * ------------------------------------------------------------------- */

  /**
   * exportToFile(name,obj,{filename?,meta?})
   * ----------------------------------------
   * Snapshot çıkarır ve bunu bir Blob linki ile indirilebilir hale getirip
   * otomatik tıklatır. (tarayıcıda <a download> hilesi)
   *
   * @returns boolean (indirildi mi)
   */
  exportToFile<T=any>(
    name: string,
    obj: T,
    opts?: { filename?: string | null; meta?: Record<string, any> }
  ): boolean;

  /**
   * importFromFile(file,{revive,ctx})
   * ---------------------------------
   * @param file  File (input[type=file].files[0] vb)
   * @returns     Promise<model|null>
   *
   * Dosyanın JSON'unu okuyup serializer.fromMinDoc / fromDoc ile
   * canlı modele çevirir (revive=true ise). Hata varsa null döner. fileciteturn127file2
   */
  importFromFile(
    file: File,
    opts?: TpersistImportFileOpts
  ): Promise<any>;

  /* ----------------------------------------------------------------------
   * Autosave
   * ------------------------------------------------------------------- */

  /**
   * autosaveOn(history,{name='autosave',source})
   * -------------------------------------------
   * History manager'ın 'commit' event'ini dinler ve her commit sonrası
   * debounced şekilde save(name, source || e.payloadRoot) çağırır.
   *
   * @param history  ThistoryManager benzeri; .on('commit',fn) olmalı
   * @param opts     { name?:string, source?:any }
   * @returns        boolean (açıldı mı)
   *
   * Ayrıca 'autosave:on' event'i yayılır {name}.
   */
  autosaveOn(
    history: any,
    opts?: TpersistAutosaveOpts
  ): boolean;

  /**
   * autosaveOff()
   * -------------
   * autosaveOn ile eklenmiş commit dinleyicisini kaldırır.
   * 'autosave:off' event'i yayılır.
   * @returns boolean (kapatıldı mı)
   */
  autosaveOff(): boolean;

  /* ----------------------------------------------------------------------
   * Serializer helpers (JSON <-> canlı model)
   * ------------------------------------------------------------------- */

  /**
   * exportJSON(model, ctx)
   * ----------------------
   * @returns serializer.toJSON/ toJSON_withEvents çıktısı
   *          (fall back: shallow clone)
   *
   * ctx.captureEvents true ise event bilgilerini de dahil edebilir.
   */
  exportJSON(
    model: any,
    ctx?: { captureEvents?: boolean }
  ): any;

  /**
   * importJSON(data, ctx)
   * ---------------------
   * @returns serializer.fromJSON / fromJSON_withEvents çıktısı
   *          (fall back: gelen data)
   */
  importJSON(
    data: any,
    ctx?: Record<string, any>
  ): any;

  /**
   * saveToStorage(key,model,ctx,storage?)
   * -------------------------------------
   * Basit helper: model'i exportJSON ile serileştirip JSON.stringify
   * eder ve verilen storage nesnesine yazar. (default: window.localStorage)
   * @returns boolean başarılı mı
   */
  saveToStorage(
    key: string,
    model: any,
    ctx?: { captureEvents?: boolean },
    storage?: Storage
  ): boolean;

  /**
   * loadFromStorage(key,ctx,storage?)
   * ---------------------------------
   * saveToStorage ile konulmuş veriyi geri okur ve importJSON ile
   * canlı modele çevirir.
   * @returns model | null
   */
  loadFromStorage(
    key: string,
    ctx?: Record<string, any>,
    storage?: Storage
  ): any | null;

  /**
   * toBlob(model,ctx)
   * -----------------
   * exportJSON → JSON.stringify → Blob('application/json').
   * Tarayıcıya dosya olarak sunmak için kullanışlı.
   */
  toBlob(
    model: any,
    ctx?: { captureEvents?: boolean }
  ): Blob | null;

  /**
   * fromText(text,ctx)
   * ------------------
   * Tersine işlem: metinsel JSON → importJSON.
   */
  fromText(
    text: string,
    ctx?: Record<string, any>
  ): any;

  /* ----------------------------------------------------------------------
   * Schema / Migration
   * ------------------------------------------------------------------- */

  /**
   * setSchema(v)
   * ------------
   * @param v pozitif integer versiyon
   * @returns this (chainable)
   *
   * Şu anki schemaVersion alanını ayarlar. Migration için referans. fileciteturn127file2
   */
  setSchema(v: number): this;

  /**
   * registerMigration(from,to,fn)
   * -----------------------------
   * @param from  başlangıç versiyonu (integer)
   * @param to    hedef versiyon (integer)
   * @param fn    (data:any)=>any dönüşümü. data → sonraki adıma hazır
   * @returns this (chainable)
   *
   * Bu fonksiyonları migrate() sırasında sırayla çağırır.
   * İçeride this.migrations adında bir Map tutulur. (runtime'da) fileciteturn127file2
   */
  registerMigration(
    from: number,
    to: number,
    fn: (data: any) => any
  ): this;

  /**
   * migrate(min,from,to)
   * --------------------
   * @param min   eski snapshot doc'u (toMinDoc çıktısı gibi hafif obje)
   * @param from  mevcut versiyon
   * @param to    hedef versiyon
   * @returns     dönüştürülmüş snapshot doc'u
   *
   * from→to yönünde her adım için (ör. 1->2, 2->3 ...) kayıtlı
   * migration fonksiyonlarını uygular. from > to durumunu da destekler
   * (geri migration). Versiyonlar eşitse dokunmadan geri döner. fileciteturn127file2
   */
  migrate(
    min: any,
    from: number,
    to: number
  ): any;

  /* ----------------------------------------------------------------------
   * Serialize / Debug
   * ------------------------------------------------------------------- */

  /**
   * toMinJSON()
   * -----------
   * Debug/persist amaçlı küçük bir durum snapshot'ı döndürür:
   * { type:'Tpersist', args:[ { storage, idbName, ... } ] }
   */
  toMinJSON(): any;

  /**
   * toJSON()
   * --------
   * Daha okunabilir durum bilgisi döndürür:
   * { type:'ns:Tpersist', storage:'local', autosave:true, ... }
   */
  toJSON(): any;
}

/**
 * Runtime modülde `export default Tpersist` yapıldığı için burada
 * default export doğrudan sınıfın kendisidir. fileciteturn127file2
 */
declare const _default: typeof Tpersist;
export default _default;

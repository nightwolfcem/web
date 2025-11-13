/**
 * Tclipboard.d.ts
 * ---------------------------------------------------------------------------
 * "Kopyala / Kes / Yapıştır" köprüsü.
 *
 * Bu servis üç farklı dünyayı tek çatıya toplar:
 *   1. Layer tabanlı kopyalama  (Tlayer / Tlayers ağaçları)
 *   2. DOM tabanlı kopyalama    (HTMLElement outerHTML + undoable insert/remove)
 *   3. Serializer tabanlı kopya (model/doc minified snapshot)
 *
 * Ayrıca:
 *   - Seçimden kopyala / yeni elemanları layer'a yapıştır (copySelection/pasteInto)
 *   - OS clipboard ile JSON-string bridge (writeOS/readOS)
 *   - İç buffer bilgisini sorgula (info)
 *   - Genel serialize/deserialize helper'ları (model <-> minJSON)
 *
 * Runtime tarafında sınıf Tevents'ten extend edilir, yani .emit(), .on(),
 * .once(), .off() gibi event yayma/yakalama davranışı vardır.
 *
 * Not: Bu .d.ts dosyasında Tlayer / Tlayers / Tselection / ThistoryManager /
 * Tserializer gibi bağımlı sınıfların gerçek tipleri henüz elimizde olmadığı
 * için çoğu property `any` olarak işaretlenmiştir. İlgili modüller
 * (Tlayer.d.ts, Tselection.d.ts, Tserializer.d.ts, ThistoryManager.d.ts ...)
 * geldiğinde bu alanlar daraltılabilir.
 */

/* ==========================================================================
 *  YARDIMCI / INTERNAL TIPLER
 * ========================================================================== */

/** Layer ağacının tek bir düğümünün minimal snapshot'ı. */
export interface TclipboardLayerNodeSnapshot {
  /** Layer adı (genelde kullanıcıya görünen isim). */
  name: string;
  /** Görünürlük bayrağı. */
  visible: boolean;
  /** Kilitli mi (düzenlenemez mi). */
  locked: boolean;
  /** Z-order bilgisi (sayı olarak). */
  z: number;
  /** Serbest veri alanı; layer.data'nın kopyası. */
  data: any;
  /** Çocuk layer snapshot'ları. */
  children: TclipboardLayerNodeSnapshot[];
}

/**
 * İç buffer yapısı. clipboard.buffer her zaman bu şekildedir.
 * type:
 *   - 'layers' : payload layer snapshot ormanı (TclipboardLayerNodeSnapshot[])
 *   - 'dom'    : payload string[] olarak outerHTML dump'ları
 *   - 'doc'    : payload serializer'dan çıkmış minified doc/model
 */
export interface TclipboardBuffer {
  /** 'layers' | 'dom' | 'doc' */
  type: string;
  /** Taşınan payload. */
  payload: any;
  /** Kopyalanan eleman sayısı (biliniyorsa). */
  count?: number;
  /** Zaman damgası (Date.now()). */
  ts?: number;
  [key: string]: any;
}

/** cut/paste operasyonlarında history ile batch'lenebilen komutlar için opsiyon. */
export interface TclipboardHistoryLike {
  begin?(label: string): void;
  end?(label: string): void;
  exec?(cmd: any, opts?: any): any;
}

/** Layer yönetimi API'si (Tlayers/Tlayer manager benzeri). */
export interface TclipboardLayersLike {
  /** Kök layer (pasteLayers parent default'u olarak kullanılır). */
  root?: any;
  /** Yeni node oluşturup ağaç içine koyar. */
  create?(cfg: any, parent?: any, index?: number | null, opts?: any): any;
  /** Bir node'u ağaçtan kaldırır. */
  remove?(node: any, opts?: any): any;
}

/** Selection yöneticisi (Tselection). */
export interface TclipboardSelectionLike {
  /** Yeni seçim set et. */
  set?(items: any): any;
  /** Seçim listesi oku. (projede hem .items hem .list() varyantı var) */
  items?: any[];
  list?(): any[];
}

/** Serializer arabirimi (Tserializer). */
export interface TclipboardSerializerLike {
  /**
   * Modeli minimal JSON'a çevirir.
   * - toMinJSON_withEvents(model,{captureEvents}) varsa onu kullanır
   * - yoksa toMinJSON(model)
   * - yoksa toJSON(model)
   */
  toMinJSON_withEvents?(model: any, opts?: any): any;
  toMinJSON?(model: any, opts?: any): any;
  toJSON?(model: any, opts?: any): any;

  /**
   * Minimal JSON'dan modeli geri kurar.
   * - fromMinJSON_withEvents(min,ctx)
   * - yoksa fromMinJSON(min,ctx)
   * - yoksa fromJSON(min,ctx)
   */
  fromMinJSON_withEvents?(min: any, ctx?: any): any;
  fromMinJSON?(min: any, ctx?: any): any;
  fromJSON?(min: any, ctx?: any): any;

  /** Doc-level snapshotlar icin: toMinDoc(), fromMinDoc(), ... opsiyonel. */
  toMinDoc?(obj: any, opts?: any): any;
  toDoc?(obj: any): any;
  fromMinDoc?(doc: any, ctx?: any): any;
  fromDoc?(doc: any, ctx?: any): any;
}

/** Tclipboard constructor opsiyonları. */
export interface TclipboardInitOpts {
  /** Undo/redo yöneticisi. (opsiyonel) */
  history?: TclipboardHistoryLike | any;
  /** Layer manager / layer ağacı. (opsiyonel) */
  layers?: TclipboardLayersLike | any;
  /** Selection yöneticisi. (opsiyonel) */
  selection?: TclipboardSelectionLike | any;
  /** Serializer / model snapshot köprüsü. (opsiyonel) */
  serializer?: TclipboardSerializerLike | any;
  [key: string]: any;
}

/* ==========================================================================
 *  ANA SINIF
 * ========================================================================== */

/**
 * Tclipboard
 * ---------------------------------------------------------------------------
 * Bir Tapp instance'ının içine servis olarak enjekte edilebilen clipboard
 * yöneticisi. Tevents'ten extend ettiği için event yayar:
 *   - 'copy'  : { type:'layers'|'dom'|'doc', count:number }
 *   - 'cut'   : { type:'layers'|'dom', count:number }
 *   - 'paste' : { type:'layers'|'dom'|'doc', count:number }
 *   - 'error' : { op:string, error:any }
 *   - 'os:write': { ok:boolean }
 */
export class Tclipboard /* extends Tevents */ {
  /** Undo/redo yöneticisi. */
  history: TclipboardHistoryLike | any;
  /** Layer manager / ağacı. */
  layers: TclipboardLayersLike | any;
  /** Selection yöneticisi. */
  selection: TclipboardSelectionLike | any;
  /** Serializer. */
  serializer: TclipboardSerializerLike | any;

  /**
   * Internal buffer:
   *   { type:'layers'|'dom'|'doc', payload:any, count?:number, ts:number }
   */
  buffer: TclipboardBuffer | null;

  /**
   * @param opts
   *  - history: ThistoryManager benzeri (opsiyonel)
   *  - layers:  Tlayers / Tlayer manager (opsiyonel)
   *  - selection: Tselection (opsiyonel)
   *  - serializer: Tserializer (opsiyonel)
   */
  constructor(opts?: TclipboardInitOpts);

  /* ----------------------------------------------------------------------
   * COPY (yalnız kopyala, dokunmadan bırak)
   * ------------------------------------------------------------------- */

  /**
   * Layer düğümlerinden (veya layer düğümü listesinden) snapshot alır ve
   * buffer içine {type:'layers', payload:[...]} yazar.
   *
   * @param nodes Tek bir layer node ya da array.
   * @returns true → başarılı kopyalandı. false → layers yok veya boş.
   */
  copyLayers(nodes: any | any[]): boolean;

  /**
   * Verilen DOM node(lar)ını outerHTML olarak alır, buffer'a {type:'dom'}
   * olarak yazar.
   *
   * @param nodes HTMLElement | array | wrapper ({el,...}).
   * @returns true → başarılı. false → DOM yok.
   */
  copyDOM(nodes: any | any[]): boolean;

  /**
   * serializer üstünden bir model / doc objesini minimal snapshot'a çevirip
   * buffer'a {type:'doc'} olarak koyar.
   *
   * @param obj Model / doc.
   * @returns true → başarılı. false → serializer yok ya da snapshot alınamadı.
   */
  copyDoc(obj: any): boolean;

  /* ----------------------------------------------------------------------
   * CUT (kopyala + kaynaktan kaldır)
   * ------------------------------------------------------------------- */

  /**
   * copyLayers() yapar, sonra nodes'ları layer manager üzerinden siler.
   * History varsa begin('layer:cut')/end('layer:cut') ile batch'lenir.
   *
   * @param nodes layer node veya array.
   * @returns true → kesildi. false → başarısız.
   */
  cutLayers(nodes: any | any[]): boolean;

  /**
   * copyDOM() yapar, sonra DOM node'larını kaldırır.
   * Eğer history varsa her kaldırma _DomRemove komutu olarak exec() edilir,
   * yoksa direkt parentNode.removeChild yapılır.
   *
   * @param nodes HTMLElement veya wrapper listesi.
   * @returns true → kesildi. false → başarısız.
   */
  cutDOM(nodes: any | any[]): boolean;

  /* ----------------------------------------------------------------------
   * PASTE (buffer'daki veriyi yeni kopya olarak ekle)
   * ------------------------------------------------------------------- */

  /**
   * Buffer.type === 'layers' ise:
   *   - snapshot'ı layer manager'a geri yazar (yeni düğümler oluşturur)
   *   - offsetZ ile yeni Z değerlerine ofset uygular
   *   - selectAfter=true ise yeni yarattığı düğümleri selection.set() ile seçer
   *   - history varsa begin('layer:paste') / end('layer:paste') ile batch'ler
   *
   * @param opts.parent      Yapıştırma hedefi parent layer. Varsayılan mgr.root.
   * @param opts.offsetZ     Z-order ofseti.
   * @param opts.selectAfter Yapıştırılanları otomatik seç.
   * @returns Oluşturulan yeni layer düğümleri dizisi.
   */
  pasteLayers(opts?: {
    parent?: any;
    offsetZ?: number;
    selectAfter?: boolean;
  }): any[];

  /**
   * Buffer.type === 'dom' ise:
   *   - buffer.payload içindeki outerHTML stringlerini klonlar
   *   - parent içine (before referansından önce) ekler
   *   - history varsa her eklemeyi _DomInsert komutuyla exec() eder
   *   - selectAfter=true ise selection.set([...]) çağırır
   *
   * @param opts.parent      Hedef parent DOM (varsayılan document.body)
   * @param opts.before      Referans DOM node'u (opsiyonel).
   * @param opts.selectAfter Yapıştırılanları seç.
   * @returns Oluşturulan yeni HTMLElement dizisi.
   */
  pasteDOM(opts?: {
    parent?: any;
    before?: any;
    selectAfter?: boolean;
  }): any[];

  /**
   * Buffer.type === 'doc' ise serializer.fromMinDoc(...) ya da fromDoc(...)
   * ile modeli geri kurar.
   *
   * @param opts.ctx Opsiyonel context objesi (ör. { app, layer, ...}).
   * @returns Yeni model nesnesi veya null.
   */
  pasteDoc(opts?: { ctx?: any }): any | null;

  /* ----------------------------------------------------------------------
   * OS CLIPBOARD KÖPRÜSÜ
   * ------------------------------------------------------------------- */

  /**
   * İç buffer'ı {type,payload} şeklinde JSON.stringify edip string döndürür.
   * Bu değer navigator.clipboard için kullanılabilir.
   */
  toText(): string;

  /**
   * Daha önce toText() ile alınmış string'i geri buffer'a yükler.
   * Geçerli bir JSON değilse false döner.
   */
  fromText(txt: any): boolean;

  /**
   * navigator.clipboard.writeText(...) üzerinden buffer'ı OS clipboard'a yazar.
   * Başarılıysa true döndürür. Ayrıca 'os:write' event'i yayar.
   */
  writeOS(): Promise<boolean>;

  /**
   * navigator.clipboard.readText(...) üzerinden OS clipboard'u okuyup
   * fromText(...) ile buffer'a set eder.
   */
  readOS(): Promise<boolean>;

  /* ----------------------------------------------------------------------
   * DURUM / SERIHAL / INFO
   * ------------------------------------------------------------------- */

  /** Buffer hakkında özet bilgi: {has, type, count, ts}. */
  info(): {
    has: boolean;
    type: string | null;
    count: number | null;
    ts: number | null;
  };

  /**
   * Minimum JSON temsili. Serializer benzeri yapılar için ortak format:
   * { type:'Tclipboard', args:[ { meta } ] }
   */
  toMinJSON(): {
    type: string;
    args: [ { meta: ReturnType<Tclipboard['info']> } ];
  };

  /** Daha açıklayıcı JSON temsili. */
  toJSON(): {
    type: string;
    meta: ReturnType<Tclipboard['info']>;
    [key: string]: any;
  };

  /* ----------------------------------------------------------------------
   * CEM-SPEC DATA BAG / SELECTION BRIDGE
   * ------------------------------------------------------------------- */

  /**
   * Serbest tipli küçük data-store. type string key'i altında payload saklar.
   * Zincirleme (this) döndürür.
   */
  setData(type: string, payload: any): this;

  /** setData ile saklanan payload'ı geri döndürür. */
  getData(type: string): any;

  /**
   * Aktif selection'daki elemanları serialize edip dahili data-store'a koyar.
   * Bu, layer/editör ortamında kullanıcı seçimini copy'lemek için kullanılır.
   *
   * @param layer      Ana layer veya container. layer.children[] üzerinden
   *                   id → node eşlemesi yapılır.
   * @param selection  Seçim yöneticisi (Tselection). selection.items veya
   *                   selection.list() üzerinden id listesi okunur.
   * @param opts.captureEvents true ise serializer.toMinJSON_withEvents()
   *                   tercih edilir.
   * @returns          Kopyalanan minified modellerin dizisi.
   */
  copySelection(
    layer: any,
    selection: TclipboardSelectionLike | any,
    opts?: { captureEvents?: boolean }
  ): any[];

  /**
   * copySelection() ile saklanan veriyi tekrar layer içine geri yazar.
   *
   * @param layer   Hedef layer/container. Eğer reattach=true ise
   *                layer.addChild(el) çağrılabilir.
   * @param opts.reattach  true → oluşturulan node'u otomatik olarak layer'a ekle.
   * @param opts.onCreate  (min) => node  -> custom oluşturucu.
   * @returns        Oluşturulan/eklenen yeni node dizisi.
   */
  pasteInto(
    layer: any,
    opts?: {
      reattach?: boolean;
      onCreate?: (min: any) => any;
    }
  ): any[];

  /**
   * Verilen modeli serializer ile (varsa event'ler dahil) minified JSON'a
   * çevirir. Serializer yoksa best-effort shallow clone döndürür.
   */
  serialize(model: any, opts?: { captureEvents?: boolean }): any;

  /**
   * serialize() ile üretilmiş (veya benzeri) minified JSON'dan modeli geri
   * kurar. Serializer yoksa gelen min'i direkt döndürür.
   */
  deserialize(min: any, ctx?: any): any;
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

/**
 * Dosya sonundaki runtime export'u:
 *   export default { Tclipboard };
 *
 * Bu yüzden default export, { Tclipboard } şeklinde tek obje olacak şekilde
 * tiplenmiştir.
 */
declare const _default: {
  Tclipboard: typeof Tclipboard;
};

export default _default;

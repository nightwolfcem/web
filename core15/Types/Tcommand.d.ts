/**
 * Tcommand.d.ts
 * ---------------------------------------------------------------------------
 * Komut sistemi (Cem-spec).
 *
 * Bu dosya üç ana sınıfı tipler:
 *   - Tcommand   : soyut taban komut
 *   - TsetProp   : hedef objede bir path altındaki alanı değiştir (undoable)
 *   - Tbatch     : birden fazla komutu tek transaction olarak çalıştır
 *
 * Ortak özellikler:
 *   • Her komut do(ctx) / undo(ctx) / redo(ctx) taşır.
 *   • History ile entegre edilebilir (undo/redo stack’e girer).
 *   • Min-JSON serializer ile dışarı taşınabilir ve geri yüklenebilir.
 *
 * Bu tipler ThistoryManager benzeri bir history katmanıyla beraber kullanılır.
 * History tarafı burada sadece ihtiyaç duyulan yüzeyle soyutlandı
 * (TcommandHistoryLike), böylece Tcommand kodu gerçek ThistoryManager’e
 * kilitlenmez.
 *
 * Not:
 * Runtime tarafında sınıflar CLASS(...) ile üretiliyor ve
 *   export const Tcommand = CLASS(class Tcommand {...})
 * patterniyle dışa veriliyor. d.ts tarafında normal class deklarasyonu
 * kullanıyoruz ki IntelliSense düzgün çalışsın.
 */

/* ==========================================================================
 *  YARDIMCI TIPLER
 * ========================================================================== */

/**
 * History katmanının Tcommand tarafından kullanılan minimum yüzeyi.
 *
 * Gerçek ThistoryManager bundan çok daha zengin olabilir (undo/redo stack,
 * batch begin/end, vs.). Ama komut katmanı açısından gereken şey sadece
 * push(doFn, undoFn, meta?). Tclipboard gibi yerler de bu yüzeyi tüketir.
 */
export interface TcommandHistoryLike {
  /**
   * Undo/redo stack'e yeni bir adım ekler.
   *
   * @param doFn   İlk uygulama veya redo sırasında çağrılır.
   * @param undoFn Undo çağrısında state'i geri almak için çağrılır.
   * @param meta   { type:'command', label:string, tag:any, ... } gibi
   *               açıklayıcı bilgiler taşıyabilir.
   */
  push?(doFn: () => any, undoFn: () => any, meta?: any): any;
}

/**
 * applyWithHistory() içine verilen action nesnesi.
 * Bu genelde küçük inline komuttur.
 */
export interface TcommandInlineAction {
  /** İleri yönde uygula. */
  do(): any;
  /** Geri al. Opsiyonel olabilir. */
  undo?(): any;
}

/**
 * Komut çalışma bağlamı. Komutlar ctx.resolve(id) ile hedef objeyi
 * bulabilir (ör. id → sahnedeki node, model vs.).
 */
export interface TcommandCtx {
  /**
   * Verilen targetId'yi gerçek objeye çeviren resolver.
   * Örn: ctx.resolve('layer:123') → gerçek layer objesi.
   */
  resolve?(id: any): any;
  [key: string]: any;
}

/**
 * Komut meta bilgisi. Her komutta label/time/group/tag alanları tutulur ve
 * serializer çıktısına da gömülür.
 */
export interface TcommandMeta {
  /** Undo yığınında görülecek etiket. Varsayılan sınıf adı veya özel label. */
  label?: string | null;
  /** Zaman damgası (ms). Varsayılan Date.now(). */
  time?: number;
  /** Transaction / batch grubu. Aynı group değerine sahip komutlar merge edilebilir. */
  group?: any;
  /** Serbest tag alanı. İsteğe bağlı semantic/türü işaretlemek için. */
  tag?: any;
  /** Opsiyonel ID (history inspector, debug vs. için). */
  id?: any;
}

/* ==========================================================================
 *  Tcommand  (TABAN KOMUT)
 * ========================================================================== */

/**
 * Temel/soyut komut sınıfı.
 *
 * - do(ctx)    : komutu ilk kez çalıştır
 * - undo(ctx)  : geri al
 * - redo(ctx)  : varsayılan olarak this.do(ctx)
 *
 * - canMerge(prev) / merge(prev):
 *   Ardışık komutları tek satırda birleştirmek için kullanılır.
 *
 * - toMinJSON() / fromMinJSON():
 *   Minified JSON serializer formatı. { c:'Tcommand', a:[ {...meta} ] }
 *
 * - applyWithHistory(action, meta?):
 *   Küçük inline bir {do,undo} eylemini çalıştırır ve varsa history.push()
 *   ile undo/redo stack'e ekler. Bu Tcommand örneğinin label/tag alanını da
 *   günceller.
 */
export class Tcommand {
  /** Undo/redo stack’te görünecek başlık. */
  label: string | null;
  /** Zaman damgası. */
  time: number;
  /** Transaction kimliği / gruplayıcı. */
  group: any;
  /** Serbest kategori/tag bilgisi. */
  tag: any;
  /** Opsiyonel debug/inspector ID. */
  id?: any;

  /** History benzeri obje (ThistoryManager vb.). */
  history?: TcommandHistoryLike | any;
  /** Alternatif isimler için tolerans (historyManager / hm). */
  historyManager?: TcommandHistoryLike | any;
  hm?: TcommandHistoryLike | any;

  constructor(meta?: TcommandMeta);

  /**
   * Komutu uygula. Alt sınıflar override eder.
   */
  do(ctx?: TcommandCtx): any;

  /**
   * Komutu geri al. Alt sınıflar override eder.
   */
  undo(ctx?: TcommandCtx): any;

  /**
   * Varsayılan olarak yeniden uygular (this.do(ctx)).
   */
  redo(ctx?: TcommandCtx): any;

  /**
   * Bu komutun, kendinden hemen önceki komutla birleştirilebilip
   * birleştirilemeyeceğini söyler.
   *
   * Örnek: TsetProp iki kez aynı hedef & aynı path için çalıştıysa tek
   * komutta birleştirilebilir.
   */
  canMerge(prev: any): boolean;

  /**
   * İki komutu tek komutta toplar ve yeni komutu döner.
   * Varsayılan taban implementasyonu this döndürür.
   */
  merge(prev: any): this;

  /**
   * Serializer (Min-JSON) çıktısı:
   * { c:'Tcommand',
   *   a:[ { id, label, time, group, tag } ]
   * }
   */
  toMinJSON(): {
    c: 'Tcommand';
    a: [{
      id: any;
      label: string | null;
      time: number;
      group: any;
      tag: any;
    }];
  };

  /**
   * Min-JSON'dan komut üretir. Normalde sadece meta bilgilerini geri kurar.
   */
  static fromMinJSON(doc: any, ctx?: any): Tcommand;

  /**
   * label setter (chainable).
   */
  setLabel(l: any): this;

  /**
   * tag setter (chainable).
   */
  setTag(t: any): this;

  /**
   * Küçük inline bir eylemi uygular ve eğer history varsa undo/redo stack'e
   * ekler.
   *
   * - action.do() anında çağrılır.
   * - history.push(doFn, undoFn, {type:'command', label:this.label, tag:this.tag})
   *   yapılmaya çalışılır.
   *
   * meta.label / meta.tag verilirse bu komutun label ve tag alanları
   * güncellenir.
   */
  applyWithHistory(
    action: TcommandInlineAction,
    meta?: TcommandMeta
  ): this;
}

/* ==========================================================================
 *  TsetProp  (BIR NESNENIN PROPERTY'SINI DEGISTIR)
 * ========================================================================== */

/**
 * Bir hedef objenin belirli bir yolundaki (path) property'yi değiştirir
 * ve geri alınabilir şekilde saklar.
 *
 * Kullanım şekli (runtime):
 *
 *   const cmd = new TsetProp(targetId, 'style.color', undefined, '#ff0');
 *   cmd.do(ctx);   // rengi '#ff0' yap
 *   cmd.undo(ctx); // geri al
 *
 * Önemli noktalar:
 * - `targetId`: ctx.resolve(targetId) ile gerçek objeye ulaşılır.
 * - `path`: 'a.b.c' veya ['a','b','c'] olabilir. İç içe alan açma/kapatma
 *   _setByPath(...) ile yapılır.
 * - prevValue ilk anda undefined verildiyse, `do()` ilk çalıştığında hedefteki
 *   eski değer otomatik olarak capture edilir. Böylece undo() gerçek eski
 *   değeri geri koyabilir.
 * - Ardışık aynı hedef+path için yapılan değişiklikler canMerge()/merge()
 *   ile tek komutta birleştirilebilir.
 */
export class TsetProp extends Tcommand {
  /** ctx.resolve(targetId) ile çözülecek hedef kimliği. */
  targetId: any;
  /** Nokta-yol ['style','color'] gibi path dizisi. */
  path: string[];
  /** Önceki değer (undo için saklanır). Lazy capture olabilir. */
  prevValue: any;
  /** Yeni değer. */
  nextValue: any;
  /** prevValue otomatik yakalanmış mı? */
  protected _captured: boolean;

  constructor(
    targetId: any,
    path: string | string[],
    prevValue: any,
    nextValue: any,
    meta?: TcommandMeta
  );

  /**
   * Hedef objeyi ctx.resolve(targetId) ile bulur.
   * Eğer prevValue daha önce yakalanmadıysa ilk çalıştırmada capture eder,
   * sonra yeni değeri yazar.
   */
  do(ctx?: TcommandCtx): any;

  /**
   * Hedef objeyi ctx.resolve(targetId) ile bulur ve eski değeri geri yazar.
   */
  undo(ctx?: TcommandCtx): any;

  /**
   * Aynı hedef ve aynı path için gelen ardışık TsetProp komutları tek
   * komutta birleştirilebilir mi?
   */
  canMerge(prev: any): boolean;

  /**
   * İki ardışık TsetProp'u tek TsetProp'a indirger.
   * prev.prevValue korunur; this.nextValue son değer olur.
   */
  merge(prev: any): TsetProp;

  /**
   * Manual squash helper:
   *   a.squashWith(b) → aynı hedef & path ise tek TsetProp döner,
   *   yoksa null.
   *
   * Bu, Tbatch.squash() içinde ardışık set'leri sıkıştırmak için kullanılır.
   */
  squashWith(other: any): TsetProp | null;

  /**
   * Min-JSON formatı:
   * { c:'TsetProp',
   *   a:[ targetId, path[], prevValue, nextValue, {meta...} ]
   * }
   */
  toMinJSON(): {
    c: 'TsetProp';
    a: [
      any,
      string[],
      any,
      any,
      {
        id: any;
        label: string | null;
        time: number;
        group: any;
        tag: any;
      }
    ];
  };

  /**
   * Min-JSON'dan geri yükleme.
   */
  static fromMinJSON(doc: any, ctx?: any): TsetProp;
}

/* ==========================================================================
 *  Tbatch  (BIRDEN COK KOMUTU TEK TRANSACTION GIBI CALISTIR)
 * ========================================================================== */

/**
 * Bir komut listesi. do() çağrıldığında hepsini sırayla uygular;
 * undo() çağrıldığında ters sırayla geri alır.
 *
 * Ek özellikler:
 * - flatten(): İç içe Tbatch'leri düzleştirir.
 * - squash():  Ardışık TsetProp'ları squashWith() kullanarak tekilleştirir.
 * - canMerge(prev)/merge(prev): Aynı group ile ardışık batch'ler birleştirilebilir.
 *
 * Serializer desteği:
 * Tbatch.toMinJSON() dizideki her alt komutu kendi toMinJSON() çıktısıyla
 * yazar. fromMinJSON() ise komut tipine göre TsetProp/Tbatch/Tcommand
 * oluşturarak geri çevirir.
 */
export class Tbatch extends Tcommand {
  /** Çalıştırılacak komutlar dizisi. */
  commands: any[];

  constructor(commands?: any[], meta?: TcommandMeta);

  /**
   * Komutları sırayla uygular: cmd.do(ctx).
   */
  do(ctx?: TcommandCtx): any;

  /**
   * Komutları tersten geri alır: last.undo(ctx) ... first.undo(ctx).
   */
  undo(ctx?: TcommandCtx): any;

  /**
   * İç içe batch yapısını düzleştirir (nested Tbatch içindeki commands'i
   * bu batch'in içine açar).
   */
  flatten(): this;

  /**
   * Ardışık komutları sıkıştırır.
   * Özellikle TsetProp.squashWith() ile aynı hedef/path üst üste gelen
   * güncellemeleri tek bir TsetProp'a indirger.
   */
  squash(): this;

  /**
   * İki Tbatch aynı group değerine sahipse birleştirilebilir kabul edilir.
   */
  canMerge(prev: any): boolean;

  /**
   * İki batch'i tek batch'e birleştirir (commands concat + meta merge).
   */
  merge(prev: any): Tbatch;

  /**
   * Min-JSON formatı:
   * { c:'Tbatch',
   *   a:[
   *     [ cmd.toMinJSON(), cmd2.toMinJSON(), ... ],
   *     {meta...}
   *   ]
   * }
   */
  toMinJSON(): {
    c: 'Tbatch';
    a: [
      any[], // her eleman alt komutların toMinJSON() çıktısı
      {
        id: any;
        label: string | null;
        time: number;
        group: any;
        tag: any;
      }
    ];
  };

  /**
   * Min-JSON'dan geri yükler.
   * Not: fromMinJSON komut tipini d.c alanına bakarak ayırır ('TsetProp',
   * 'Tbatch', diğerleri 'Tcommand').
   */
  static fromMinJSON(doc: any, ctx?: any): Tbatch;
}

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

/**
 * Runtime tarafında:
 *   export default { Tcommand, TsetProp, Tbatch }
 *
 * olduğu için default export burada aynı shape ile tipleniyor.
 */
declare const _default: {
  Tcommand: typeof Tcommand;
  TsetProp: typeof TsetProp;
  Tbatch: typeof Tbatch;
};

export default _default;

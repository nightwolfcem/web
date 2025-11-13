/**
 * enums.d.ts
 * ---------------------------------------------------------------------------
 * Bitmask tabanli enum (createEnum) ve tekil secim ordinal (createOrd)
 * fabrikalarinin tip tanimi.
 *
 * createEnum → E... tarzinda bitmask flag setleri uretir.
 * createOrd  → O... tarzinda tekil secim ordinal setleri uretir.
 *
 * Iki fabrikadan cikan obje:
 *   - Tanimli etiketleri (labels) dogrudan property olarak tasir
 *   - .of(), .from(), .bindTo(), .bind() gibi yardimcilar saglar
 *   - .fromMinJSON() / instance.toMinJSON() ile min serializer desteği verir
 *
 * Ayrica her fabrikanin instance'i (E.of(), O.of()) Proxy tabanlidir ve
 * fluent API sunar. Bu proxy'ler asagidaki TenumInstance / TordInstance
 * arayuzleri ile tariflenmistir.
 */

/* ==========================================================================
 *  GENERIC DESTEK TIPLERI
 * ========================================================================== */

/**
 * Bitmask flag instance'i. createEnum(...).of() ile uretilir.
 * Bu nesne fluent calisir: .set(), .on(), .off(), .toggle() hep kendisini
 * geri dondurur; ayrica dogrudan sayi gibi (valueOf) ya da string gibi
 * (toString) davranabilir.
 */
export interface TenumInstance<Flags extends string> {
  /** Aktif bitmask degeri (numeric). */
  value: number;
  /** Aktif bitmask degeri (numeric). */
  mask: number;

  /** Akilli set. String ('left+top'), sayi, array, obje {left:true,...} kabul eder. */
  set(v: any): TenumInstance<Flags>;
  /** Maskeyi dogrudan sayisal olarak ata. */
  setMask(m: number): TenumInstance<Flags>;

  /** Tum verilen flag(ler) dahil mi? */
  has(x: any): boolean;
  /** En az bir verilen flag var mi? */
  hasAny(x: any): boolean;
  /** hasAny ile esit alias. */
  includes(x: any): boolean;

  /** Belirtilen flag'i ac. */
  on(k: Flags): TenumInstance<Flags>;
  /** Belirtilen flag'i kapat. */
  off(k: Flags): TenumInstance<Flags>;
  /** Belirtilen flag'i toggle et. */
  toggle(k: Flags): TenumInstance<Flags>;

  /** "left+top" gibi birlestirilmis string dondurur veya 'none'. */
  toString(): string;
  /** Sayisal maskeyi dondurur. */
  valueOf(): number;

  /** { Tenum: <mask> } formatinda min serializer. */
  toMinJSON(): { Tenum: number };
  /** { Tenum: <mask> } ile ayni anlami tasir. */
  toJSON(): { Tenum: number };

  /**
   * Dinamik flag alanlari:
   *   inst.resizable === true → o flag aktif
   *   inst.resizable = false  → o flag kaldirilir
   */
  [K in Flags]: boolean;

  /** Ek/dinamik alanlar icin gevsek index. */
  [key: string]: any;
}

/**
 * Bitmask enum tanimi. createEnum() sonucunda elde edilen ana obje.
 * Bu obje hem sabit numeric flag degerlerini tasir, hem de yardimci
 * olusturucular (of, from, empty...) saglar.
 */
export interface TenumDef<Flags extends string> {
  /** Enumun insan okunabilir adi. */
  readonly name: string;

  /** Orijinal tanim sirasi. */
  readonly labels: Flags[];

  /** Her flag icin numeric bit degeri. */
  readonly bitMap: Record<Flags, number> & Record<string, number>;

  /** Verilen flags/sayilar/objelerden tek bir toplu mask uret. */
  maskOf(...keys: any[]): number;

  /** Verilen flags'i aktif olarak tutan yeni bir instance olustur. */
  of(...keys: any[]): TenumInstance<Flags>;

  /** Bos (0 / none) instance olustur. */
  empty(): TenumInstance<Flags>;

  /** Girilen degeri akilli sekilde yorumlayip instance olustur. */
  from(v: any): TenumInstance<Flags>;

  /** {Tenum:number} benzeri min json'dan instance olustur. */
  fromMinJSON(j: any): TenumInstance<Flags>;

  /** "[Enum EelementStatus]" gibi aciklama string'i. */
  toString(): string;

  /**
   * Bir objeye reaktif property baglar.
   * obj[prop] okundugunda TenumInstance donecek; atama (obj[prop] = 'left')
   * otomatik inst.set() olarak yorumlanir.
   */
  bindTo<T extends object>(obj: T, prop: string, initial?: any): TenumInstance<Flags>;

  /** bindTo ile ayni davranis, kisayol. */
  bind<T extends object>(obj: T, prop: string, initial?: any): TenumInstance<Flags>;

  /**
   * Her flag ismi numeric deger olarak ayrica property'dir.
   * EelementStatus.resizable → sayisal mask degeri.
   */
  [K in Flags]: number;
}

/**
 * Ordinal instance'i. createOrd(...).of() ile uretilir.
 * Bu nesne tekil bir string degeri tasir (ör. 'center'). .next() / .prev()
 * ile siradaki etikete gecilebilir.
 */
export interface TordInstance<Labels extends string> {
  /** Su anki secili label. */
  value: Labels;

  /** Akilli set. String, index sayisi veya {Tord:index} kabul eder. */
  set(v: any): TordInstance<Labels>;

  /** Siradaki label'a gecer. wrap=true ise en sondan basa sarar. */
  next(opts?: { wrap?: boolean }): TordInstance<Labels>;

  /** Bir onceki label'a gecer. wrap=true ise bastan sona sarar. */
  prev(opts?: { wrap?: boolean }): TordInstance<Labels>;

  /** Aktif label'i string olarak dondurur. */
  toString(): Labels;

  /** Aktif label'in ordinal index'ini verir. */
  valueOf(): number;

  /** { Tord: <index> } serializer. */
  toMinJSON(): { Tord: number };
  /** { Tord: <index> } ile ayni anlami tasir. */
  toJSON(): { Tord: number };

  /**
   * Dinamik boolean alanlar:
   *   inst.center === true → aktif deger 'center'
   *   inst.center = true   → aktif degeri 'center' yap
   */
  [K in Labels]: boolean;

  /** Ek/dinamik alanlar icin gevsek index. */
  [key: string]: any;
}

/**
 * Ordinal tanimi. createOrd() sonucunda elde edilen ana obje.
 * Bu obje hem sabit string degerleri tasir, hem de of()/from()/empty()
 * gibi yardimcilar saglar.
 */
export interface TordDef<Labels extends string> {
  /** Ordinalin insan okunabilir adi. */
  readonly name: string;

  /** Orijinal tanim sirasi. */
  readonly labels: Labels[];

  /** Verilen label ile yeni instance olustur. */
  of(key: Labels): TordInstance<Labels>;

  /** Girilen degeri akilli sekilde yorumlayip instance olustur. */
  from(v: any): TordInstance<Labels>;

  /** {Tord:index} benzeri min json'dan instance olustur. */
  fromMinJSON(j: any): TordInstance<Labels>;

  /** Varsayilan (genelde ilk label veya 'none') instance olustur. */
  empty(): TordInstance<Labels>;

  /** "[Ord Olayers]" gibi aciklama string'i. */
  toString(): string;

  /**
   * Bir objeye reaktif property baglar.
   * obj[prop] okundugunda TordInstance donecek; atama otomatik inst.set()
   * olarak yorumlanir.
   */
  bindTo<T extends object>(obj: T, prop: string, initial?: any): TordInstance<Labels>;

  /** bindTo ile ayni davranis, kisayol. */
  bind<T extends object>(obj: T, prop: string, initial?: any): TordInstance<Labels>;

  /**
   * Her label ayrica property olarak kendi adini tasir.
   * Olayers.overlay → 'overlay'
   */
  [K in Labels]: Labels;
}

/* ==========================================================================
 *  FABRIKA FONKSIYONLARI (MODUL PUBLIC API)
 * ========================================================================== */

/**
 * Bitmask tabanli enum olusturur.
 *
 * @param name  Enum'un adi (debug/log icin kullanilir).
 * @param defs  Flag listesi. Array<string>, "left right top" string'i
 *              veya { left:1, right:2, ... } gibi numeric map olarak
 *              gecerli kabul edilir.
 * @param opts  Davranis secenekleri:
 *              - joiner / sep  : toString() icin kullanilan birlestirici
 *              - alias / aliases: flag ad(lar)ina alternatif isimler
 *              - noneZero      : 'none' icin 0 bit'i zorla
 * @returns     TenumDef<Flags>
 */
export function createEnum<Flags extends string>(
  name: string,
  defs: ReadonlyArray<Flags> | Record<Flags, number> | string,
  opts?: {
    joiner?: string;
    sep?: string;
    alias?: Record<string, string>;
    aliases?: Record<string, string>;
    noneZero?: boolean;
    [key: string]: any;
  }
): TenumDef<Flags>;

/**
 * Tekil secim ordinal olusturur.
 *
 * @param name  Ordinalin adi (debug/log icin kullanilir).
 * @param defs  Label listesi. Array<string>, "left right top" string'i
 *              veya { left:0, right:1, ... } gibi key seti kabul edilir.
 * @returns     TordDef<Labels>
 */
export function createOrd<Labels extends string>(
  name: string,
  defs: ReadonlyArray<Labels> | Record<Labels, any> | string
): TordDef<Labels>;

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

declare const _default: {
  createEnum: typeof createEnum;
  createOrd: typeof createOrd;
};

export default _default;

/**
 * const.enums.d.ts
 * ---------------------------------------------------------------------------
 * Bu dosya core12 icindeki tum enum / ord yapilarinin kesin ve ayrintili
 * tip tanimidir. createEnum (bitmask sayisal flag setleri) ve createOrd
 * (sirali sabit kume) ciktisini tamamen belgeler.
 *
 * NOT (sınırlama): Burada numeric degerler (ör. bitmask 1,2,4...) tam olarak
 * yazilmiyor cunku elimizde run-time deger tablolarinin sayisal karsiliklari
 * yok. Ancak her alan icin anlami, kullanim yeri ve secim/secilim mantigi
 * ayrintili olarak aciklandi. Bu alanlar zaten projede runtime'da uretiliyor.
 *
 * Bu d.ts su sekilde kullanilir:
 * - E... ile baslayan nesneler bitmask / flag enum'dur (multi-select).
 * - O... ile baslayan nesneler ordinal / sirali dizilimdir (tekil secim).
 * - Tum T* tip alias'lari string literal union / semantic union verir.
 * - Her export edilen sabit (E..., O...) ayni isimli interface'i uygular.
 * - default export sik kullanilan enum/ord setlerini tek obje halinde sunar.
 *
 * Bu dosya manuel olarak uretilmistir; core12'nin kamu API'sinin parcasidir.
 * Class/serializer/history/pointer/katman sistemleri buradaki sabitlere
 * bagimlidir. Ozellikle:
 *   - Telement.status   → EelementStatus
 *   - ThistoryManager   → EhistoryTrack
 *   - Tinteract / drag  → OdragMode, OpointerMode, Eaxis, Egesture
 *   - Katman sirasi     → Olayers
 *   - UI hizalama       → Ealign, OalignH, OalignV
 *   - Tipografi / stil  → EtextStyle, OfontWeight, OtextAlign
 *
 * Bu d.ts tum modullerin referans alacagi tek dogru kaynak olarak
 * kullanilmalidir.
 */

/* ==========================================================================
 *  GENEL YARDIMCI ARAYUZLER
 * ========================================================================== */

/**
 * Bitmask/flag tabanli enum icin temel interface.
 * Ornek: EelementStatus.resizable | EelementStatus.movable gibi birden
 * fazla flag birlikte tutulabilir.
 */
export interface TflagEnum<Flags extends string> {
  /**
   * Her flag anahtari icin sayisal flag degeri (power-of-two / bitmask).
   * "none" genellikle 0 olur.
   */
  [flag in Flags]: number;

  /**
   * Serbest erisim: runtime'da enum nesnesi yardimci fonksiyonlar da tasiyabilir
   * (or: has(mask, flag), of([...])) gibi util fonksiyonlar.
   */
  [key: string]: any;
}

/**
 * Sirali / ordinal sabit kume icin temel interface.
 * Ornek: OdragMode.transfer === 'transfer', Olayers.overlay === 'overlay'.
 *
 * Bu tur yapilarda tek bir deger secilir. Ek olarak runtime objesi su
 * yardimcilara sahiptir:
 * - list: Tum anahtarlarin orijinal tanim sirasina gore dizisi.
 * - indexOf(value): Verilen degerin sira index'ini dondurur.
 * - at(index): Sira index'ine gore degeri dondurur.
 */
export interface TordBase<V extends string | number> {
  /**
   * Sabitin adina karsilik gelen string/number deger.
   * Ornek: OfontWeight.bold === 700 gibi sayisal mapler de mumkundur.
   */
  [key: string]: V | any;

  /**
   * Tum degerleri tanimlandiklari dogal sirada donduren readonly dizi.
   */
  readonly list: readonly V[];

  /**
   * Verilen degerin (ör. 'drag', 'overlay', 700) bu ordinal icindeki
   * sirali index'ini dondurur. Yoksa -1 donebilir.
   */
  indexOf(value: V): number;

  /**
   * Siradaki index'e gore degeri dondurur. Bounds disinda undefined donebilir.
   */
  at(index: number): V | undefined;
}

/* ==========================================================================
 *  ZAMAN / TAKVIM ENUM'LARI
 * ========================================================================== */

/**
 * Ay adlari (Gregorian). Bu union tip ay isimlerini string literal olarak
 * kod icinde guvenli sekilde kullanmana izin verir.
 */
export type Tmonth =
  | 'January' | 'February' | 'March' | 'April' | 'May' | 'June'
  | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';

/**
 * Ay ordinali. Ornek kullanim:
 *   Omonth.January    → 'January'
 *   Omonth.indexOf('March') → 2 (siralama ornegidir)
 */
export interface OmonthType extends TordBase<Tmonth> {
  January: Tmonth;
  February: Tmonth;
  March: Tmonth;
  April: Tmonth;
  May: Tmonth;
  June: Tmonth;
  July: Tmonth;
  August: Tmonth;
  September: Tmonth;
  October: Tmonth;
  November: Tmonth;
  December: Tmonth;
}

export const Omonth: OmonthType;

/**
 * Hafta gunleri (Pazar bazli). UI takvimleri, timeline ruler vb. icin kullanilir.
 */
export type Tday =
  | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday'
  | 'Thursday' | 'Friday' | 'Saturday';

/**
 * Gun ordinali. Ornek:
 *   Oday.Sunday   → 'Sunday'
 *   Oday.indexOf('Wednesday') → haftadaki index.
 */
export interface OdayType extends TordBase<Tday> {
  Sunday: Tday;
  Monday: Tday;
  Tuesday: Tday;
  Wednesday: Tday;
  Thursday: Tday;
  Friday: Tday;
  Saturday: Tday;
}

export const Oday: OdayType;

/* ==========================================================================
 *  POINTER / ETKILESIM MODLARI
 * ========================================================================== */

/**
 * Drag isleminin amaci:
 * - 'none'     : aktif drag modu yok
 * - 'copy'     : bir kopya uretilip hedefe birakilacak
 * - 'remove'   : tasinan nesne kaldirilacak / cop mantigi
 * - 'transfer' : baska bir konteynira tasinacak (cut+paste)
 */
export type TdragMode = 'none' | 'copy' | 'remove' | 'transfer';

export interface OdragModeType extends TordBase<TdragMode> {
  /** Etkin drag modu yok / pasif. */
  none: TdragMode;
  /** Drag sonucunda hedefte yeni bir kopya olusur. */
  copy: TdragMode;
  /** Drag sonrasi kaynak nesne kaldirilir. */
  remove: TdragMode;
  /** Nesne baska bir kapsayiciya tasinir. */
  transfer: TdragMode;
}

export const OdragMode: OdragModeType;

/**
 * Fare tuslari. Browser MouseEvent.button semantigiyle paralel tutulur.
 */
export type TmouseButton = 'none' | 'left' | 'middle' | 'right' | 'back' | 'forward';

export interface ObuttonType extends TordBase<TmouseButton> {
  /** hicbir buton (genelde -1) */
  none: TmouseButton;
  /** sol buton (0) */
  left: TmouseButton;
  /** orta teker butonu (1) */
  middle: TmouseButton;
  /** sag buton (2) */
  right: TmouseButton;
  /** mouse geri butonu (3) */
  back: TmouseButton;
  /** mouse ileri butonu (4) */
  forward: TmouseButton;
}

export const Obutton: ObuttonType;

/**
 * Tarayici PointerEvent.pointerType ile esitlenir.
 */
export type TpointerType = 'mouse' | 'pen' | 'touch';

export interface OpointerTypeType extends TordBase<TpointerType> {
  mouse: TpointerType;
  pen: TpointerType;
  touch: TpointerType;
}

export const OpointerType: OpointerTypeType;

/**
 * Pointer davranis seviyesi:
 * - 'none'  : etkileşim kapali
 * - 'basic' : temel tikla/sec / surukle
 * - 'full'  : gelismis secim, marquee, multi-select vb.
 *
 * Bu mod Tinteract / TpointerController tarafindan kullanilir ve UI'nin
 * hangi jestleri kabul edecegini belirler.
 */
export type TpointerMode = 'none' | 'basic' | 'full';

export interface OpointerModeType extends TordBase<TpointerMode> {
  /** Pointer input kapali / yok gibi davran. */
  none: TpointerMode;
  /** Basit tikla, basit surukle, temel secim. */
  basic: TpointerMode;
  /** Tam etkileşim: marquee, multi-select, ileri seviye drag/drop. */
  full: TpointerMode;
}

export const OpointerMode: OpointerModeType;

/**
 * EpointerMode = OpointerMode alias'i.
 * Proje icinde hala "EpointerMode" ismiyle referans edilen yerler icin
 * uyumluluk/ergonomi saglar. Bu ayni objeyi isaret eder.
 */
export const EpointerMode: OpointerModeType;

/* ==========================================================================
 *  KATMAN / LAYER SIRALAMASI
 * ========================================================================== */

/**
 * Render katmanlari. Bu siralama arayuzde hangi DOM'un ustte/ altta oldugunu
 * ifade eder. not: Z-order esasen DOM order'ina baglanir; burada ise
 * semantik siralama tutulur. Onemli ilkeler:
 *  - 'content' tiklanabilir.
 *  - 'overlay' ve 'selection' tipik olarak click-through (pointerEvents: none).
 */
export type Tlayers =
  | 'background'
  | 'base'
  | 'content'
  | 'tools'
  | 'widget'
  | 'mainMenu'
  | 'dropdown'
  | 'tooltip'
  | 'contextMenu'
  | 'popup'
  | 'windows'
  | 'overlay'
  | 'modal'
  | 'selection'
  | 'dragPreview'
  | 'notification'
  | 'guide'
  | 'dialog';

export interface OlayersType extends TordBase<Tlayers> {
  /** Cok geride kalan genel arka plan. */
  background: Tlayers;
  /** Uygulama kokleri / temel paneller. */
  base: Tlayers;
  /** Ana icerik; kullanici aslen bunu duzenler. */
  content: Tlayers;
  /** Cizim araclari / secim araclari gibi tool katmani. */
  tools: Tlayers;
  widget: Tlayers;
  mainMenu: Tlayers;
  dropdown: Tlayers;
  tooltip: Tlayers;
  contextMenu: Tlayers;
  popup: Tlayers;
  /** Birden cok pencere/floatable panel. */
  windows: Tlayers;
  /** Icerigi gosteren fakat tiklamaya kapali overlay. */
  overlay: Tlayers;
  /** Modal kilitleme / blur arkaplan vb. */
  modal: Tlayers;
  /** Secili ogeleri highlight eden layer. (pointerEvents: none) */
  selection: Tlayers;
  /** Sürükleme esnasindaki hayalet/preview. */
  dragPreview: Tlayers;
  /** Toast / uyarilar. */
  notification: Tlayers;
  /** Hizalama kilavuzlari, olcu cizgileri. */
  guide: Tlayers;
  /** Dialog / confirm pencereleri. */
  dialog: Tlayers;
}

export const Olayers: OlayersType;

/* ==========================================================================
 *  WINDOW DURUM / CAPTION BUTTON ENUM'LARI (BITMASK)
 * ========================================================================== */

/**
 * Pencere gorunurluk / state bilgisi. Bitmask olarak tutulur.
 * Ornek flagler: show, showmodal, minimize, maximize, active, hide ...
 */
export type TwindowStatus =
  | 'none'
  | 'show'
  | 'showmodal'
  | 'hide'
  | 'active'
  | 'minimize'
  | 'maximize';

export interface EwindowStatusType extends TflagEnum<TwindowStatus> {
  /** hic bir durum / 0 */
  none: number;
  /** normal goster */
  show: number;
  /** modal olarak goster */
  showmodal: number;
  /** gizle */
  hide: number;
  /** odakli / aktif */
  active: number;
  /** simge durumuna kucult */
  minimize: number;
  /** tam ekran / buyut */
  maximize: number;
}

export const EwindowStatus: EwindowStatusType;

/**
 * Caption bar uzerindeki buton tipleri (x, -, kare vs.). Bitmask gibi
 * kullanilabildigi icin TflagEnum tabanli tutuluyor.
 */
export type TcaptionButton =
  | 'none'
  | 'close'
  | 'maximize'
  | 'minimize'
  | 'restore'
  | 'help';

export interface EcaptionButtonType extends TflagEnum<TcaptionButton> {
  /** hic bir buton */
  none: number;
  /** kapat (X) */
  close: number;
  /** buyut / maximize */
  maximize: number;
  /** kucult / minimize */
  minimize: number;
  /** onceki boyuta dondur */
  restore: number;
  /** yardim / ? butonu */
  help: number;
}

export const EcaptionButton: EcaptionButtonType;

/* ==========================================================================
 *  ELEMENT STATUS / BORDER / ALIGN (BITMASK VE ORD)
 * ========================================================================== */

/**
 * Telement uzerindeki etkileşimsel yetenekler.
 * Bu alanlar genelde bir bitmask olarak tutulur; yani bir ogede hem
 * movable hem resizable ayni anda aktif olabilir.
 *
 * - 'resizable'   : kenarlardan boyutlandirilabilir
 * - 'movable'     : tasinabilir (drag ederek koordinat degisir)
 * - 'draggable'   : disari/ici suruklenebilir kaynak ogedir
 * - 'insideDrag'  : icine surukleme kabul eden hedef ogedir
 * - 'dockable'    : dock/yerlestirme mantigi destekler
 * - 'scrollable'  : ic icerigi scroll edilebilir
 * - 'selectable'  : secilebilir
 * - 'lockable'    : kilitlenebilir
 * - 'disabled'    : devredisi / etkilesime kapalidir
 * - 'visible'     : gorunur durumda mi
 */
export type TelementStatus =
  | 'none'
  | 'resizable'
  | 'movable'
  | 'draggable'
  | 'insideDrag'
  | 'dockable'
  | 'scrollable'
  | 'selectable'
  | 'locked'
  | 'disabled'
  | 'visible';

export interface EelementStatusType extends TflagEnum<TelementStatus> {
  none: number;
  resizable: number;
  movable: number;
  draggable: number;
  insideDrag: number;
  dockable: number;
  scrollable: number;
  selectable: number;
  locked: number;
  disabled: number;
  visible: number;
}

export const EelementStatus: EelementStatusType;

/**
 * Kenar/kose secimleri. Resize tutamacinda veya cizim islemlerinde
 * kullanilabilir. Bitmask kullanimi yaygindir (left|top gibi).
 */
export type Tborder =
  | 'none'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'leftTop'
  | 'leftBottom'
  | 'rightTop'
  | 'rightBottom'
  | 'topBottom'
  | 'leftRight'
  | 'all';

export interface EborderType extends TflagEnum<Tborder> {
  none: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  leftTop: number;
  leftBottom: number;
  rightTop: number;
  rightBottom: number;
  topBottom: number;
  leftRight: number;
  all: number;
}

export const Eborder: EborderType;

/**
 * Genel hizalama / yerlesim davranisi. Bitmask gibi da kullanilabilir
 * (ornegin hStretch + vStretch benzeri durumlar) ama projede genelde
 * tekil veya az sayida birlikte yorumlanir:
 * - 'client'  : tum alani kapla (client area)
 * - 'offset'  : parent'a gore offset'li konum
 * - 'hStretch': yatay yayil
 * - 'vStretch': dikey yayil
 */
export type Talign =
  | 'none'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'center'
  | 'middle'
  | 'inner'
  | 'outer'
  | 'client'
  | 'offset'
  | 'hStretch'
  | 'vStretch';

export interface EalignType extends TflagEnum<Talign> {
  none: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  center: number;
  middle: number;
  inner: number;
  outer: number;
  client: number;
  offset: number;
  hStretch: number;
  vStretch: number;
}

export const Ealign: EalignType;

/**
 * Flex/grup icerisinde yatay dizilim presetleri icin ordinal.
 * 'spaceBetween' / 'spaceAround' / 'spaceEvenly' gibi degerler CSS
 * justify-* semantigine cok yakindir.
 */
export type TalignH =
  | 'none'
  | 'left'
  | 'center'
  | 'right'
  | 'spaceBetween'
  | 'spaceAround'
  | 'spaceEvenly';

export interface OalignHType extends TordBase<TalignH> {
  none: TalignH;
  left: TalignH;
  center: TalignH;
  right: TalignH;
  spaceBetween: TalignH;
  spaceAround: TalignH;
  spaceEvenly: TalignH;
}

export const OalignH: OalignHType;

/**
 * Dikey dizilim presetleri. CSS align-items / align-content benzeri.
 */
export type TalignV = 'none' | 'top' | 'middle' | 'bottom' | 'stretch';

export interface OalignVType extends TordBase<TalignV> {
  none: TalignV;
  top: TalignV;
  middle: TalignV;
  bottom: TalignV;
  stretch: TalignV;
}

export const OalignV: OalignVType;

/* ==========================================================================
 *  DISPLAY / POSITION / OVERFLOW
 * ========================================================================== */

/**
 * CSS display degerleri icin ordinal. layout engine / inspector panel vs.
 */
export type Tdisplay =
  | 'none'
  | 'block'
  | 'inline'
  | 'inline-block'
  | 'flex'
  | 'grid'
  | 'contents';

export interface OdisplayType extends TordBase<Tdisplay> {
  none: Tdisplay;
  block: Tdisplay;
  inline: Tdisplay;
  'inline-block': Tdisplay;
  flex: Tdisplay;
  grid: Tdisplay;
  contents: Tdisplay;
}

export const Odisplay: OdisplayType;

/**
 * CSS position degerleri icin ordinal.
 */
export type Tposition = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';

export interface OpositionType extends TordBase<Tposition> {
  static: Tposition;
  relative: Tposition;
  absolute: Tposition;
  fixed: Tposition;
  sticky: Tposition;
}

export const Oposition: OpositionType;

/**
 * Overflow ekseni: x/y/both gibi scroll icin aktif eksenler.
 * Bu bir bitmask olarak tutulur. 'both' tipik olarak x|y anlamina gelir.
 */
export type ToverflowAxis = 'none' | 'x' | 'y' | 'both';

export interface EoverflowAxisType extends TflagEnum<ToverflowAxis> {
  none: number;
  x: number;
  y: number;
  both: number;
}

export const EoverflowAxis: EoverflowAxisType;

/**
 * CSS overflow davranislari. Inspector panelde kullaniciya secim icin gosterilir.
 */
export type ToverflowMode = 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto';

export interface OoverflowModeType extends TordBase<ToverflowMode> {
  visible: ToverflowMode;
  hidden: ToverflowMode;
  clip: ToverflowMode;
  scroll: ToverflowMode;
  auto: ToverflowMode;
}

export const OoverflowMode: OoverflowModeType;

/* ==========================================================================
 *  METIN STILI / TIPOGRAFI / RENK / BLEND
 * ========================================================================== */

/**
 * Metne uygulanan stiller. Bitmask olarak kullanilabilir.
 * - 'bold'/'italic'/'underline'/'strike'
 * - 'uppercase' : buyuk harfe zorlama
 * - 'smallcaps' : kucuk buyuk harf varyasyonu
 */
export type TtextStyle =
  | 'none'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'uppercase'
  | 'smallcaps';

export interface EtextStyleType extends TflagEnum<TtextStyle> {
  none: number;
  bold: number;
  italic: number;
  underline: number;
  strike: number;
  uppercase: number;
  smallcaps: number;
}

export const EtextStyle: EtextStyleType;

/**
 * Metin hizalama presetleri. CSS text-align ile benzer.
 */
export type TtextAlign = 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';

export interface OtextAlignType extends TordBase<TtextAlign> {
  left: TtextAlign;
  right: TtextAlign;
  center: TtextAlign;
  justify: TtextAlign;
  start: TtextAlign;
  end: TtextAlign;
}

export const OtextAlign: OtextAlignType;

/**
 * Yazı kalınlık skalası. OfontWeight.bold gibi alanlar numeric karsilik
 * dondurebilir (ornegin 700). Inspector panelde dropdown olarak kullanilir.
 */
export type TfontWeight =
  | 'thin'
  | 'extraLight'
  | 'light'
  | 'normal'
  | 'medium'
  | 'semiBold'
  | 'bold'
  | 'extraBold'
  | 'black';

export interface OfontWeightType extends TordBase<TfontWeight> {
  thin: TfontWeight;        // ~100
  extraLight: TfontWeight;  // ~200
  light: TfontWeight;       // ~300
  normal: TfontWeight;      // ~400
  medium: TfontWeight;      // ~500
  semiBold: TfontWeight;    // ~600
  bold: TfontWeight;        // ~700
  extraBold: TfontWeight;   // ~800
  black: TfontWeight;       // ~900
}

export const OfontWeight: OfontWeightType;

/**
 * CSS mix-blend-mode degerleri.
 */
export type TblendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface OblendModeType extends TordBase<TblendMode> {
  normal: TblendMode;
  multiply: TblendMode;
  screen: TblendMode;
  overlay: TblendMode;
  darken: TblendMode;
  lighten: TblendMode;
  'color-dodge': TblendMode;
  'color-burn': TblendMode;
  difference: TblendMode;
  exclusion: TblendMode;
  hue: TblendMode;
  saturation: TblendMode;
  color: TblendMode;
  luminosity: TblendMode;
}

export const OblendMode: OblendModeType;

/* ==========================================================================
 *  OLCU BIRIMLERI / ANIMASYON
 * ========================================================================== */

/**
 * Uzunluk / boyut birimleri. Inspector panelde width/height/top/left icin
 * dropdown.
 */
export type Tunit = 'px' | '%' | 'em' | 'rem' | 'vw' | 'vh' | 'fr';

export interface OunitType extends TordBase<Tunit> {
  px: Tunit;
  '%': Tunit;
  em: Tunit;
  rem: Tunit;
  vw: Tunit;
  vh: Tunit;
  fr: Tunit;
}

export const Ounit: OunitType;

/**
 * Transition timing-function presetleri.
 */
export type Teasing = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface OeasingType extends TordBase<Teasing> {
  linear: Teasing;
  ease: Teasing;
  'ease-in': Teasing;
  'ease-out': Teasing;
  'ease-in-out': Teasing;
}

export const Oeasing: OeasingType;

/**
 * Animasyon suresi presetleri. Bu genelde ms karsiliklariyla yorumlanir:
 * - instant : 0ms civari
 * - fast    : ~150ms
 * - normal  : ~300ms
 * - slow    : ~600ms
 */
export type Tduration = 'instant' | 'fast' | 'normal' | 'slow';

export interface OdurationType extends TordBase<Tduration> {
  instant: Tduration;
  fast: Tduration;
  normal: Tduration;
  slow: Tduration;
}

export const Oduration: OdurationType;

/**
 * Popover / tooltip konumlandirma presetleri.
 * 'bottom-start', 'right-end' vb. gibi CSS tarafli veya geometry hesaplayici
 * util fonksiyonlarinda kullanilir.
 */
export type Tplacement =
  | 'top' | 'top-start' | 'top-end'
  | 'right' | 'right-start' | 'right-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'
  | 'center';

export interface OplacementType extends TordBase<Tplacement> {
  'top': Tplacement;
  'top-start': Tplacement;
  'top-end': Tplacement;
  'right': Tplacement;
  'right-start': Tplacement;
  'right-end': Tplacement;
  'bottom': Tplacement;
  'bottom-start': Tplacement;
  'bottom-end': Tplacement;
  'left': Tplacement;
  'left-start': Tplacement;
  'left-end': Tplacement;
  'center': Tplacement;
}

export const Oplacement: OplacementType;

/* ==========================================================================
 *  HISTORY / UNDO-REDO TRACK MASKESI (BITMASK)
 * ========================================================================== */

/**
 * ThistoryManager tarafindan izlenecek DOM degisiklikleri.
 * Bu bir bitmask:
 * - 'attr'     : attribute degisikliklerini kaydet
 * - 'style'    : inline style degisikliklerini kaydet
 * - 'children' : cocuk ekleme/silme/sirala degisikliklerini kaydet
 * - 'all'      : tumunu kapsayan kisa yol
 */
export type ThistoryTrack = 'none' | 'attr' | 'style' | 'children' | 'all';

export interface EhistoryTrackType extends TflagEnum<ThistoryTrack> {
  none: number;
  attr: number;
  style: number;
  children: number;
  all: number;
}

export const EhistoryTrack: EhistoryTrackType;

/* ==========================================================================
 *  EK BLOK: Eksen / Gesture / ViewAction / ResizeHandle / HitArea / KeyMod
 * ========================================================================== */

/**
 * Eksensel kisit. Drag/resize esnasinda hangi eksenlerin aktif oldugunu
 * belirtmek icin bitmask olarak kullanilir:
 * - 'x'    : sadece yatay hareket/degisim
 * - 'y'    : sadece dikey hareket/degisim
 * - 'both' : serbest, hem x hem y
 */
export type Taxis = 'none' | 'x' | 'y' | 'both';

export interface EaxisType extends TflagEnum<Taxis> {
  none: number;
  x: number;
  y: number;
  both: number;
}

export const Eaxis: EaxisType;

/**
 * Jest / gesture tipi. Pointer controller bu bilgiyi event akisi icin kullanir:
 * - 'tap', 'doubleTap', 'longPress' : tik/uzun basma senaryolari
 * - 'drag'                          : surukleme eylemi
 * - 'pinch'                         : pinch/zoom jesti (touch)
 * - 'wheel'                         : mouse wheel jesti
 */
export type Tgesture =
  | 'none'
  | 'tap'
  | 'doubleTap'
  | 'longPress'
  | 'drag'
  | 'pinch'
  | 'wheel';

export interface EgestureType extends TflagEnum<Tgesture> {
  none: number;
  tap: number;
  doubleTap: number;
  longPress: number;
  drag: number;
  pinch: number;
  wheel: number;
}

export const Egesture: EgestureType;

/**
 * View uzerinde yapilan eylemler. Kamera/pan/zoom gibi.
 * Genelde canvas/viewport kontrolcusu tarafindan izlenir.
 */
export type TviewAction = 'none' | 'pan' | 'zoom' | 'rotate';

export interface EviewActionType extends TflagEnum<TviewAction> {
  none: number;
  pan: number;
  zoom: number;
  rotate: number;
}

export const EviewAction: EviewActionType;

/**
 * Resize tutamacinin konumu. Bu ordinal tek secimlidir, cunku ayni anda
 * hem 'n' hem 's' handle'inda olmanin anlami yoktur.
 * - 'n','ne','e','se','s','sw','w','nw' : klasik kutu kosesi/kenari
 * - 'center'                            : govde ortasi (move handle gibi)
 */
export type TresizeHandle =
  | 'n' | 'ne' | 'e' | 'se'
  | 's' | 'sw' | 'w' | 'nw'
  | 'center';

export interface OresizeHandleType extends TordBase<TresizeHandle> {
  n: TresizeHandle;
  ne: TresizeHandle;
  e: TresizeHandle;
  se: TresizeHandle;
  s: TresizeHandle;
  sw: TresizeHandle;
  w: TresizeHandle;
  nw: TresizeHandle;
  center: TresizeHandle;
}

export const OresizeHandle: OresizeHandleType;

/**
 * Hit test bolgesi. Bitmask olarak tutulabilir:
 * - 'content' : icerik bolgesi
 * - 'padding' : padding alani
 * - 'border'  : border cizgisi
 * - 'margin'  : margin alani (dis bosluk)
 */
export type ThitArea = 'none' | 'content' | 'padding' | 'border' | 'margin';

export interface EhitAreaType extends TflagEnum<ThitArea> {
  none: number;
  content: number;
  padding: number;
  border: number;
  margin: number;
}

export const EhitArea: EhitAreaType;

/**
 * Klavye modifier tuslari. Bu da bitmask:
 * - 'shift' : Shift tusu basili
 * - 'ctrl'  : Control tusu basili
 * - 'alt'   : Alt tusu basili
 * - 'meta'  : Sistem modifier'i (Cmd / Win key)
 */
export type TkeyMod = 'none' | 'shift' | 'ctrl' | 'alt' | 'meta';

export interface EkeyModType extends TflagEnum<TkeyMod> {
  none: number;
  shift: number;
  ctrl: number;
  alt: number;
  meta: number;
}

export const EkeyMod: EkeyModType;

/* ==========================================================================
 *  OVERFLOW / TEXTALIGN / BLEND / UNIT / EASING / DURATION / PLACEMENT EXPORTLARI
 *  (Bu kisim uste dagitildi ama default export icin burada not tutuluyor.)
 * ========================================================================== */

/* ==========================================================================
 *  DEFAULT EXPORT
 * ========================================================================== */

/**
 * Sik kullanilan enum / ord nesnelerini tek obje halinde disari verir.
 * Bu obje icinden import edilen degerler runtime'da ayni referanslari tasir
 * (yani kopya degil). Genelde UI editor modullerinde tek seferde injekte
 * edilir (ör. property panel dropdown'lari).
 */
declare const _default: {
  Omonth: typeof Omonth;
  Oday: typeof Oday;
  OdragMode: typeof OdragMode;
  Obutton: typeof Obutton;
  OpointerType: typeof OpointerType;
  Olayers: typeof Olayers;
  EwindowStatus: typeof EwindowStatus;
  EcaptionButton: typeof EcaptionButton;
  EelementStatus: typeof EelementStatus;
  Eborder: typeof Eborder;
  Ealign: typeof Ealign;
  OalignH: typeof OalignH;
  OalignV: typeof OalignV;
  Odisplay: typeof Odisplay;
  Oposition: typeof Oposition;
  EoverflowAxis: typeof EoverflowAxis;
  OoverflowMode: typeof OoverflowMode;
  EtextStyle: typeof EtextStyle;
  OtextAlign: typeof OtextAlign;
  OfontWeight: typeof OfontWeight;
  OblendMode: typeof OblendMode;
  Ounit: typeof Ounit;
  Oeasing: typeof Oeasing;
  Oduration: typeof Oduration;
  Oplacement: typeof Oplacement;
  EhistoryTrack: typeof EhistoryTrack;
  OpointerMode: typeof OpointerMode;
  EpointerMode: typeof EpointerMode;
  Eaxis: typeof Eaxis;
  Egesture: typeof Egesture;
  EviewAction: typeof EviewAction;
  OresizeHandle: typeof OresizeHandle;
  EhitArea: typeof EhitArea;
  EkeyMod: typeof EkeyMod;
};

export default _default;

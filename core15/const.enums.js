'use strict';
// const.enums.js — Cem-spec unified (deep-clean)
// const.enums.js — sınıfsız düzen (E*/O* + bindTo)
import { createEnum, createOrd } from './enums.js';

/* ====== Tarih/Zaman ====== */
export const Omonth = createOrd('Tmonth',
  'January,February,March,April,May,June,July,August,September,October,November,December'
);
export const Oday = createOrd('Tday',
  'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'
);

/* ====== Etkileşim ====== */
export const OdragMode = createOrd('TdragMode', 'none,copy,remove,transfer');
export const Obutton = createOrd('TmouseButton', { none:-1, left:0, middle:1, right:2, back:3, forward:4 });
export const OpointerType = createOrd('TpointerType', 'mouse,pen,touch');

/* ====== UI Katmanları ====== */
export const Olayers = createOrd('Tlayers',
  'background,base,content,tools,widget,mainMenu,dropdown,tooltip,contextMenu,popup,windows,overlay,modal,selection,dragPreview,notification,guide,dialog'
);

/* ====== Pencere/Çerçeve ====== */
export const EwindowStatus = createEnum('TwindowStatus',
  'none,show,showmodal,hide,active,minimize,maximize',
  { noneZero:true }
);
export const EcaptionButton = createEnum('TcaptionButton',
  'none,close,maximize,minimize,restore,help',
  { noneZero:true }
);

/* ====== Element Durumları ====== */
export const EelementStatus = createEnum('TelementStatus',
  'none,resizable,movable,rotatable,draggable,insideDrag,dockable,scrollable,selectable,locked,disabled,visible,pivotEditable,alignable,snapEnabled,groupable',
  { noneZero:true, aliases:{ dragable:'draggable' } } // 'dragable' uyumluluğu
);
/* ====== Kenarlık & Hizalama ====== */
export const Eborder = createEnum('Tborder', {
  none:0,
  left:1, right:2, top:4, bottom:8,
  leftTop: 1|4, leftBottom: 1|8, rightTop: 2|4, rightBottom: 2|8,
  topBottom: 4|8, leftRight: 1|2, all: 1|2|4|8
});
export const Ealign = createEnum('Talign',
  'none,left,right,top,bottom,center,middle,inner,outer,client,offset,hStretch,vStretch',
  { noneZero:true }
);
export const OalignH = createOrd('TalignH', 'none,left,center,right,spaceBetween,spaceAround,spaceEvenly');
export const OalignV = createOrd('TalignV', 'none,top,middle,bottom,stretch');

/* ====== Görünüm ====== */
export const Odisplay = createOrd('Tdisplay', 'none,block,inline,inline-block,flex,grid,contents');
export const Oposition = createOrd('Tposition', 'static,relative,absolute,fixed,sticky');

/* ====== Scroll & Overflow ====== */
export const EoverflowAxis = createEnum('ToverflowAxis', { none:0, x:1, y:2, both: 1|2 });
export const OoverflowMode = createOrd('ToverflowMode', 'visible,hidden,clip,scroll,auto');

/* ====== Stil & Tipografi ====== */
export const EtextStyle = createEnum('TtextStyle', {
  none:0,
  bold:1, italic:2, underline:4, strike:8,
  uppercase:16, smallcaps:32
});
export const OtextAlign = createOrd('TtextAlign', 'left,right,center,justify,start,end');
export const OfontWeight = createOrd('TfontWeight', {
  thin:100, extraLight:200, light:300, normal:400, medium:500,
  semiBold:600, bold:700, extraBold:800, black:900
});

/* ====== Renk & Efekt ====== */
export const OblendMode = createOrd('TblendMode',
  'normal,multiply,screen,overlay,darken,lighten,color-dodge,color-burn,difference,exclusion,hue,saturation,color,luminosity'
);

/* ====== Ölçü & Birim ====== */
export const Ounit = createOrd('Tunit', 'px,%,em,rem,vw,vh,fr');

/* ====== Animasyon ====== */
export const Oeasing = createOrd('Teasing', 'linear,ease,ease-in,ease-out,ease-in-out');
export const Oduration = createOrd('Tduration', { instant:0, fast:150, normal:300, slow:600 });

/* ====== Popover/Tooltip Konumları ====== */
export const Oplacement = createOrd('Tplacement',
  'top,top-start,top-end,right,right-start,right-end,bottom,bottom-start,bottom-end,left,left-start,left-end,center'
);

/* ====== History / Pointer Mode ====== */
export const EhistoryTrack = createEnum('ThistoryTrack', { none:0, attr:1, style:2, children:4, all:7 });
export const OpointerMode  = createOrd('TpointerMode', 'none,basic,full'); // uyum için:
export const EpointerMode  = OpointerMode;

export default {
  // Tarih/Zaman
  Omonth, Oday,
  // Etkileşim
  OdragMode, Obutton, OpointerType,
  // UI Katmanları
  Olayers,
  // Pencere/Çerçeve
  EwindowStatus, EcaptionButton,
  // Element
  EelementStatus,
  // Görünüm & Yerleşim
  Eborder, Ealign, OalignH, OalignV, Odisplay, Oposition,
  // Scroll & Overflow
  EoverflowAxis, OoverflowMode,
  // Stil & Tipografi
  EtextStyle, OtextAlign, OfontWeight,
  // Renk/Efekt
  OblendMode,
  // Ölçü
  Ounit,
  // Animasyon
  Oeasing, Oduration,
  // Popover
  Oplacement,
  // History / Pointer
  EhistoryTrack, OpointerMode, EpointerMode
};

/* ====== Ek — Genel Kullanım ====== */
export const Eaxis = createEnum('Taxis', { none:0, x:1, y:2, both: 1|2 });

/* İşaretlenebilir jestler (bitmask) */
export const Egesture = createEnum('Tgesture',
  'none,tap,doubleTap,longPress,drag,pinch,wheel',
  { noneZero:true }
);

/* Görünüm işlemleri (bitmask) */
export const EviewAction = createEnum('TviewAction',
  'none,pan,zoom,rotate',
  { noneZero:true }
);

/* Yeniden boyutlandırma tutamaçları (tekil) */
export const OresizeHandle = createOrd('TresizeHandle',
  'n,ne,e,se,s,sw,w,nw,center'
);

/* Hit alanı (bitmask) */
export const EhitArea = createEnum('ThitArea',
  'none,content,padding,border,margin',
  { noneZero:true }
);

/* Klavye modifiyerleri (bitmask, KMOD uyumlu) */
export const EkeyMod = createEnum('TkeyMod', { none:0, shift:1, ctrl:2, alt:4, meta:8 });

// Not: default export objesi değiştirilmedi; yeni sabitler named export olarak erişilebilir.

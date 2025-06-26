//import * as a from "../../ts/dom.d.ts";
/// <reference path="../../ts/dom.d.ts" />
/**stopPropagation() iç içe geçen elementlere yayılmayı engeller 
 * preventDefault() olayın varsayılan davranışını yapmasını engelleri mesela bir checkboxa tıklanınca tıklama eylemini gerçekleştirmez. Olay yayılımına devam eder. Eventin cancelable=true olmalıdır.
 * preventDefault aynı zamanda dispathEvent fonksiyonununda dönüş değerini false yapar.
 * stopImmediatePropagation() fonksiyonu evente bağlanan diğer dinleyicilerin erişimini engeller ve sonraki dinleyicilere aktarılmaz olay.
 */
/** 
 * sayfa yuklendiginde Dom(Html) yi 0 kabul et. Eger bir html nesnesi baska bir nesneye bagli ise (Telemente) id si "Telement-o elementten kactane var ise..."
 * seklinde olmalidir. sayfa tekrar yuklendikten sonra kayitli nesneler yuklenir ve  bu id li Html nesnelerine baglanir.
 * bu islemlerden sonra window degiskenleri bir listeye alinir. sayfa kaydedilecegi zaman
 * 
 * 
 * 
 */
//const { object } = require("underscore");

var $ = $ || void 0;
/* ============================================================
 * saveFile(name, data [, mime])
 * ------------------------------------------------------------
 *  name : "toolbar.json"  (indirilecek dosya adı)
 *  data : String  |  Blob |  Uint8Array
 *  mime : İsteğe bağlı  → varsayılan "application/json;charset=utf-8"
 * ---------------------------------------------------------- */
function saveFile(name, data, mime = 'application/json;charset=utf-8') {
  const blob = data instanceof Blob
    ? data
    : new Blob(
        [data instanceof Uint8Array ? data : String(data)],
        { type: mime }
      );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

/* ============================================================
 * openFile([accept])   →  Promise<string>
 * ------------------------------------------------------------
 *  accept : "application/json" | ".json,.txt" | "image/*" … 
 *           (input[type=file] accept özniteliği)
 * ---------------------------------------------------------- */
function openFile(accept = '.json,.txt') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    input.onchange = () => {
      const file = input.files[0];
      if (!file) {
        reject(new Error('Dosya seçilmedi.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
      reader.readAsText(file);
      input.remove();
    };

    document.body.appendChild(input);
    input.click();
  });
}

function getDeviceInfo() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    let os = "Unknown";
    let deviceType = "Unknown";
    let lineBreak = "\n"; // Varsayılan olarak Unix tarzı

    // İşletim Sistemi Tespiti
    if (/windows/.test(platform) || /win/.test(userAgent)) {
        os = "Windows";
        lineBreak = "\r\n"; // Windows için
        deviceType = "Masaüstü";
    } else if (/mac/.test(platform) || /mac/.test(userAgent)) {
        os = "macOS";
        lineBreak = "\n"; // macOS için
        deviceType = "Masaüstü veya Laptop";
    } else if (/android/.test(userAgent)) {
        os = "Android";
        lineBreak = "\n"; // Android için
        deviceType = /mobile/.test(userAgent) ? "Telefon" : "Tablet";
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
        os = "iOS";
        lineBreak = "\n"; // iOS için
        deviceType = /ipad/.test(userAgent) ? "Tablet" : "Telefon";
    } else if (/linux/.test(platform)) {
        os = "Linux";
        lineBreak = "\n"; // Linux için
        deviceType = "Masaüstü veya Laptop";
    } else if (/windows phone/.test(userAgent)) {
        os = "Windows Phone";
        lineBreak = "\r\n"; // Windows Phone için
        deviceType = "Telefon";
    }

    return {
        os,
        deviceType,
        lineBreak,
    };
}

// Kullanım
const deviceInfo = getDeviceInfo();
var OID = 0;
(() => {




    window.globs = {
        winprops: "0|window|self|document|name|location|customElements|history|navigation|locationbar|menubar|personalbar|scrollbars|statusbar|toolbar|status|closed|frames|length|top|opener|parent|frameElement|navigator|origin|external|screen|innerWidth|innerHeight|scrollX|pageXOffset|scrollY|pageYOffset|visualViewport|screenX|screenY|outerWidth|outerHeight|devicePixelRatio|clientInformation|screenLeft|screenTop|styleMedia|onsearch|isSecureContext|trustedTypes|performance|onappinstalled|onbeforeinstallprompt|crypto|indexedDB|sessionStorage|localStorage|onbeforexrselect|onabort|onbeforeinput|onbeforetoggle|onblur|oncancel|oncanplay|oncanplaythrough|onchange|onclick|onclose|oncontextlost|oncontextmenu|oncontextrestored|oncuechange|ondblclick|ondrag|ondragend|ondragenter|ondragleave|ondragover|ondragstart|ondrop|ondurationchange|onemptied|onended|onerror|onfocus|onformdata|oninput|oninvalid|onkeydown|onkeypress|onkeyup|onload|onloadeddata|onloadedmetadata|onloadstart|onmousedown|onmouseenter|onmouseleave|onmousemove|onmouseout|onmouseover|onmouseup|onmousewheel|onpause|onplay|onplaying|onprogress|onratechange|onreset|onresize|onscroll|onsecuritypolicyviolation|onseeked|onseeking|onselect|onslotchange|onstalled|onsubmit|onsuspend|ontimeupdate|ontoggle|onvolumechange|onwaiting|onwebkitanimationend|onwebkitanimationiteration|onwebkitanimationstart|onwebkittransitionend|onwheel|onauxclick|ongotpointercapture|onlostpointercapture|onpointerdown|onpointermove|onpointerrawupdate|onpointerup|onpointercancel|onpointerover|onpointerout|onpointerenter|onpointerleave|onselectstart|onselectionchange|onanimationend|onanimationiteration|onanimationstart|ontransitionrun|ontransitionstart|ontransitionend|ontransitioncancel|onafterprint|onbeforeprint|onbeforeunload|onhashchange|onlanguagechange|onmessage|onmessageerror|onoffline|ononline|onpagehide|onpageshow|onpopstate|onrejectionhandled|onstorage|onunhandledrejection|onunload|crossOriginIsolated|scheduler|alert|atob|blur|btoa|cancelAnimationFrame|cancelIdleCallback|captureEvents|clearInterval|clearTimeout|close|confirm|createImageBitmap|fetch|find|focus|getComputedStyle|getSelection|matchMedia|moveBy|moveTo|open|postMessage|print|prompt|queueMicrotask|releaseEvents|reportError|requestAnimationFrame|requestIdleCallback|resizeBy|resizeTo|scroll|scrollBy|scrollTo|setInterval|setTimeout|stop|structuredClone|webkitCancelAnimationFrame|webkitRequestAnimationFrame|chrome|fence|caches|cookieStore|ondevicemotion|ondeviceorientation|ondeviceorientationabsolute|launchQueue|sharedStorage|documentPictureInPicture|onbeforematch|getScreenDetails|queryLocalFonts|showDirectoryPicker|showOpenFilePicker|showSaveFilePicker|originAgentCluster|credentialless|speechSynthesis|oncontentvisibilityautostatechange|onscrollend|webkitRequestFileSystem|webkitResolveLocalFileSystemURL|JSCompiler_renameProperty",
        path: `${location.protocol}//${location.host}/www/cem/gridprj/`,
        events:
            "abort|afterprint|animationend|animationiteration|animationstart|beforeprint|beforeunload|blur|canplay|canplaythrough|change|click|contextmenu|copy|cut|dblclick|drag|dragend|dragenter|dragleave|dragover|dragstart|drop|durationchange|ended|error|focus|focusin|focusout|fullscreenchange|fullscreenerror|hashchange|input|invalid|keydown|keypress|keyup|load|loadeddata|loadedmetadata|loadstart|message|mousedown|mouseenter|mouseleave|mousemove|mouseover|mouseout|mouseup|mousewheel|offline|online|open|pagehide|pageshow|paste|pause|play|playing|popstate|progress|ratechange|resize|reset|scroll|search|seeked|seeking|select|show|stalled|storage|submit|suspend|timeupdate|toggle|touchcancel|touchend|touchmove|touchstart|transitionend|unload|volumechange|waiting|wheel",
        lengthUnits: {
            centimeters: "cm",
            millimeters: "mm",
            quarter_millimeters: "Q",
            inches: "in",
            picas: "pc",
            points: "pt",
            pixels: "px",
        },
        testMode: false,
        reg_exps: {
            class: /(class.[^}]*)}/gm,
            function: /(function .[^}]*)}/gm,
            var: 3,
            object: 4,
            quotes: /(["][^"]+["])|(['][^']+['])/gm,
            email: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        },
        resizeObserver: new ResizeObserver(entries => {
            for (const entry of entries) {
                const t = entry.target.owner;
                if (!t || !t.sizeHistory) continue; // Sadece sizeHistory açık olanlar için
                const rect = entry.target.getBoundingClientRect();
                const oldSize = entry.target._$oldsize || {
                    left: parseFloat(entry.target.style.left) || rect.left,
                    top: parseFloat(entry.target.style.top) || rect.top,
                    width: rect.width, height: rect.height
                };
                const newSize = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
                if (
                    oldSize.width !== newSize.width ||
                    oldSize.height !== newSize.height ||
                    oldSize.left !== newSize.left ||
                    oldSize.top !== newSize.top
                ) {
                    t.history?.execute(new SizeCommand(t, oldSize, newSize));
                    entry.target._$oldsize = { ...newSize };
                }
            }
        }),
        styleObserver: new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes" && mutation.attributeName === "style") {
                    const target = mutation.target;
                    if (!target.owner || !target.owner._styleHistoryEnabled) continue; // Sadece styleHistory aktifse
                    const style = target.style;
                    const styleText = style.cssText;
                    const oldStyleText = target._$oldstyle || styleText;
                    if (oldStyleText !== styleText) {
                        if (target.owner.history) {
                            target.owner.history.execute(
                                new StyleCommand(target.owner, oldStyleText, styleText)
                            );
                        }
                        target._$oldstyle = styleText;
                    }
                }
            }
        }),
        lengthUnitConvert(inputValue, inputUnit, outputUnit) {
            const intocm = (v, reverse = false) => (reverse ? v / 2.54 : v * 2.54);
            const mmtocm = (v, reverse = false) => (reverse ? v * 10 : v / 10);
            const Qtocm = (v, reverse = false) => (reverse ? v * 40 : v / 40);
            const pctocm = (v, reverse = false) =>
                reverse ? (v * 6) / 2.54 : (v / 6) * 2.54;
            const pttocm = (v, reverse = false) =>
                reverse ? (v * 72) / 2.54 : (v / 72) * 2.54;
            const pxtocm = (v, reverse = false) =>
                reverse ? (v * 96) / 2.54 : (v / 96) * 2.54;

            let val = typeof inputValue === "string"
                ? parseFloat(inputValue)
                : inputValue;
            let unit =
                typeof inputValue === "string"
                    ? inputValue.match(/[^\d.,\s]+/)[0]
                    : inputUnit;
            if (unit !== "cm") {
                val = eval(`${unit}tocm(${val})`);
            }
            if (outputUnit !== "cm") {
                val = eval(`${outputUnit}tocm(${val}, true)`);
            }
            return val;
        },

    };

    function extendsClass(...mixins) {
        // 1) Mevcut kodunla NewClass gövdesini üretip eval et
        let s, i, str = "";
        for (i = mixins.length - 1; i > 0; i--) {
            s = (arguments[i - 1] + "");
            if (!/constructor\s*\([^)]*\)\s*{\s*[^}]*\bsuper\b[^();]*/.test(s))
                s = s.replace(/(constructor\s*\([^)]*\)\s*{)/, "$1super();");
            str += (i == 1 ? "(" : "") + s.replace(RegExp(arguments[i - 1].name + "({|\\s.*{)?"), arguments[i - 1].name + " extends " + arguments[i].name + " {").replaceAll("//super", "super") + (i == 1 ? ")" : "");

        }
        const NewClass = eval(str);

        // 2) Wrapper sınıf
        const __Wrapped = class extends NewClass {
            constructor(...args) {
                super(...args);

                // --- $parents inşa ediliyor ---
                const parents = [];
                // 2.1) En alt sınıf (D)
                const Self = this.constructor;
                parents.push(Self);
                let inArray = function (name, array) {
                    let t;
                    for (let i = 0; i < array.length; i++) {
                        if (typeof array[i] === 'array') {
                            t = inArray(name, array[i]);
                            if (t)
                                return true;
                        }
                        else
                            if (array[i].name === name) {
                                return true;
                            }
                    }
                    return false;
                }
                // 2.2) Gerçek prototip zinciri (C, B, …)
                let proto = Object.getPrototypeOf(Self.prototype);
                while (proto && proto.constructor !== Object) {
                    const Ctor = proto.constructor;
                    if (!(parents.includes(Ctor) || mixins.includes(Ctor) || inArray(Ctor.name, mixins) || Ctor === __Wrapped)) {
                        parents.push(Ctor);
                    }
                    proto = Object.getPrototypeOf(proto);
                }

                // 2.3) Mixins dizisi (tek bir alt dizi)
                //     Burada yalnızca mixins argümanlarını koyuyoruz
                parents.push(mixins);

                this.$parents = parents;
            }
        };

        // 3) instanceof patch’i: önce native, sonra $parents’a bak
        function patchHasInstance(C) {
            Object.defineProperty(C, Symbol.hasInstance, {
                value(inst) {
                    // (a) native instanceof
                    if (Function.prototype[Symbol.hasInstance].call(this, inst)) {
                        return true;
                    }
                    // (b) güvenli $parents kontrolü
                    const pArr = inst?.$parents;
                    if (!Array.isArray(pArr)) return false;
                    return pArr.some(entry =>
                        entry === C
                        || (Array.isArray(entry) && entry.includes(C))
                    );
                },
                configurable: true
            });
        }

        // Mixin’ler ve Wrapped üzerinde patch
        [...mixins, __Wrapped].forEach(patchHasInstance);

        return __Wrapped;
    }
const EVENT_METHOD_POOL = [];      // 0 → gerçek Function nesnesi
const FN2ID = new WeakMap();

function getOrAddId(fn){
  let id = FN2ID.get(fn);
  if (id !== undefined) return id;
  id = EVENT_METHOD_POOL.length;
  EVENT_METHOD_POOL.push(fn);                 // 🔹 NESNENİN KENDİSİ
  FN2ID.set(fn, id);
  return id;
}
const getFnById = id => EVENT_METHOD_POOL[id];  
    class ListenerMap extends Map {
        hasSameListener(eventType, candidate) {
            const list = this.get(eventType);
            if (!list) return false;

            const norm = fn =>
                (fn.listenerStr || fn.toString()).replace(/\s+/g, ' ');

            return list.some(rec => {
                if (rec.listener === candidate) return true;                        // referans eşit
                if (rec.listener?._meta?.original &&                                // aynı orijinal
                    candidate?._meta?.original &&
                    rec.listener._meta.original === candidate._meta.original)
                    return true;
                return norm(rec.listener) === norm(candidate);                      // kodu aynı
            });
        }
    }

    /* ── 2. WeakMap deposu & getter güncellemesi ───────────────────── */
    const _eventMap = new WeakMap();
    function getEventMap(el) {
        let m = _eventMap.get(el);
        if (!m) {
            m = new ListenerMap();
            _eventMap.set(el, m);
        }
        return m;
    }


    /* Opsiyonel debugger getter */
    [HTMLElement.prototype, Document.prototype, Window.prototype].forEach(proto => {
        if (!Object.prototype.hasOwnProperty.call(proto, 'eventList')) {
            Object.defineProperty(proto, 'eventList', {
                get() { return getEventMap(this); },
                enumerable: false,
                configurable: false
            });
        }
    });                // Element → Map<type, Rec[]>
/*
    Function.prototype.bindToEvent = function (elem, type, obj, ...args) {
        const original = this;
        const context = obj || elem;
        const wrapper = function (e, ...rest) {
            const res = original.call(context, e, ...args, ...rest);
            if (res === false) { e.preventDefault(); e.stopPropagation(); }
            return res;
        };
        wrapper._meta = {
            original: original,
            args: args,
            objId: obj?.id ?? -1
        };
        elem.addEventListener(type, wrapper, false);
        const auxMap = elem._orig2wrap ||= new WeakMap();
        const arr = auxMap.get(original) || [];
        arr.push(wrapper);
        auxMap.set(original, arr);
        return original;
    };*/
Function.prototype.bindToEvent = function (elem, type, ctx=null, ...args){
  const original = this;                        // gerçek handler
  const wrapper  = function (ev){
    const res = original.apply(ctx || elem, [ev, ...args]);
    if (res === false){ ev.preventDefault(); ev.stopPropagation(); }
  };

  /* 🔹–🔹  meta işaretlemesi  🔹–🔹 */
  wrapper._meta = { original, args };

  /* Map’e kaydet + DOM’a ekle */
  const map  = getEventMap(elem);
  const list = map.get(type) || [];
  map.set(type, list);
  list.push({ wrapper, options:false });

  elem.addEventListener(type, wrapper, false);
  return wrapper;
};
  Function.prototype.unBindEvent = function (elem, type = null) {
  const original = this;                      // this = kaldırılacak handler
  const map      = getEventMap(elem);         // Map<event, list>
  if (!map) return;

  const types = type ? [type] : [...map.keys()];

  types.forEach(evType => {
    const list = map.get(evType);
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const rec = list[i];                          // {wrapper, …}
      const w   = rec.wrapper ?? rec.listener ?? rec;
      const same =
        w === original ||
        w._meta?.original === original;

      if (same) {
        elem.removeEventListener(evType, w, rec.options || false);
        list.splice(i, 1);
      }
    }
    if (list.length === 0) map.delete(evType);
  });
};
    Function.prototype.toEventFunc = function (obj = null, ...boundArgs) {
        const original = this;
        const context = obj || window;               // bağlam: obj verildiyse o; yoksa window

        const wrapper = function (event, ...runtimeArgs) {
            event = event || window.event;
            if (typeof $ !== 'undefined' && $.event && typeof $.event.fix === 'function') {
                event = $.event.fix(event);
            }
            const res = original.call(context, event, ...boundArgs, ...runtimeArgs);
            if (res === false) {
                event.preventDefault?.();
                event.stopPropagation?.();
            }
            return res;
        };

        /* meta → debug / unBindEvent için */
        wrapper._meta = {
            original: handler,
            args: boundArgs,
            objId: this.id ?? -1
        };

        return wrapper;
    };
    const origAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        /* 1.  Normal davranışı koru */
        origAddEventListener.call(this, type, listener, options);

        /* 2.  Kayıt tut */
        if (!listener) return;                          // null / undefined koruması

        const map = getEventMap(this);
        const list = map.get(type) || [];
        map.set(type, list);

        /* tekrar eklemeyi engelle */
        if (list.some(rec => rec.listener === listener)) return;

        list.push({
            listener,
            id: getOrAddId(listener),
            options
        });
    };

    /* ──────────────────────────────────────────────────────────────── */
    /*  removeEventListener override                                    */
    /* ──────────────────────────────────────────────────────────────── */
    const origRemoveEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
        /* 1.  Normal davranışı koru */
        origRemoveEventListener.call(this, type, listener, options);

        /* 2.  Kayıt sil */
        const map = _eventMap.get(this);
        if (!map || !map.has(type)) return;

        const list = map.get(type);
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i].listener === listener) {
                list.splice(i, 1);
            }
        }
        if (list.length === 0) map.delete(type);
    };



    // Recursive Deep Copy with Constructor Preservation
    const SKIP_KEYS = [
        "parent", "owner", "parentNode", "parentElement",
        "__proto__", "prototype", "style", "computedStyleMap",
    ];

    function deepCopy(root, skipKeys) {
        const seen = new WeakMap();               // { orijinal → klon }
        const rootId = root && root.id != null ? root.id : -1;
        let rootClone;

        function cloneAny(obj) {
            /* 0) İlkel tip veya null */
            if (obj === null || typeof obj !== "object") return obj;

            /* 1) Daha önce kopyalandı mı? */
            if (seen.has(obj)) return seen.get(obj);

            /* 2) DOM düğümleri -------------------------------------------- */
            switch (obj.nodeType) {
                case Node.TEXT_NODE: {
                    const out = document.createTextNode(obj.nodeValue ?? "");
                    seen.set(obj, out);
                    return out;
                }
                case Node.COMMENT_NODE: {
                    const out = document.createComment(obj.nodeValue ?? "");
                    seen.set(obj, out);
                    return out;
                }
                case Node.ELEMENT_NODE: {
                    const el = document.createElement(obj.tagName);
                    seen.set(obj, el);                         // erken kayıt

                    /* — attribute’ler (style hariç) — */
                    Array.from(obj.attributes).forEach(attr => {
                        if (attr.name.toLowerCase() !== "style") {
                            el.setAttribute(attr.name, attr.value);
                        }
                    });
                    if (obj.style?.cssText) el.style.cssText = obj.style.cssText;

                    /* — “yalnız-metin” elementler — */
                    if (!obj.childNodes.length) el.textContent = obj.textContent ?? "";

                    /* ------------------------------------------------------- */
                    /*  YENİ: listener’ları taşı   (WeakMap  →  getEventMap)  */
                    /* ------------------------------------------------------- */
                    const srcMap = getEventMap(obj);           // eski elemanın haritası
                    if (srcMap) {
                        for (const [type, list] of srcMap) {
                            for (const rec of list) {
                                const wrapper = getFnById(rec.id);          // id → kod

                                if (wrapper?._meta?.original) {
                                    const orig = wrapper._meta.original;
                                    const args = wrapper._meta.args || [];
                                    const objId = wrapper._meta.objId ?? -1;

                                    let targetCtx = null;
                                    if (objId !== -1) {
                                        targetCtx = AllClass.byId[objId] || AllClass.byOrder[objId];
                                    }

                                    orig.bindToEvent(el, type, targetCtx, ...args);
                                } else {
                                    /* addEventListener ile eklenmiş saf fonksiyon */
                                    el.addEventListener(type, wrapper, rec.options);
                                }
                            }
                        }
                    }
                    /* ------------------------------------------------------- */

                    /* — çocukları kopyala — */
                    obj.childNodes.forEach(n => el.appendChild(cloneAny(n)));
                    return el;
                }
            }

            /* 3) Özel copy() — YALNIZ DOM DIŞI nesnelerde */
            if (
                typeof obj.copy === "function" &&
                obj.copy !== Object.prototype.copy &&
                !("nodeType" in obj)
            ) {
                seen.set(obj, {});
                const out = obj.copy();
                seen.set(obj, out);
                return out;
            }

            /* 4) Dizi */
            if (Array.isArray(obj)) {
                const arr = [];
                seen.set(obj, arr);
                obj.forEach((item, i) => arr[i] = cloneAny(item));
                return arr;
            }

            /* 5) Düz / kullanıcı nesnesi */
            const Ctor = typeof obj.constructor === "function" ? obj.constructor : Object;
            const out = new Ctor();
            seen.set(obj, out);
            if (out.id != null) rootClone = out;

            Object.keys(obj).forEach(k => {
                if (SKIP_KEYS.includes(k) || skipKeys?.includes(k)) return;
                out[k] = cloneAny(obj[k]);
            });
            return out;
        }


        return cloneAny(root);
    }

    /*  —— prototipe ekle ——  (gerekmezse silin) */
    Object.defineProperty(Object.prototype, 'copy', {
        value: function (skipKeys) { return deepCopy(this, skipKeys); },
        writable: false,
        configurable: false,
        enumerable: false
    });

  


 
/*************************************************************************
*  0.  Yardımcı: “havuz” yalnız referans saklar, kod gövdesi saklamaz    *
*************************************************************************/
const FN_POOL = new WeakMap();               // fn → { ownerId, name }
const ID2OBJ  = new Map();                   // id   → gerçek nesne
let   OBJ_SEQ = 1;

function registerInstance(obj){
  if (obj.id != null) return obj.id;
  const id = OBJ_SEQ++;
  Object.defineProperty(obj, 'id', { value:id, enumerable:false });
  ID2OBJ.set(id, obj);
  return id;
}

/*************************************************************************
*  1.  Telement.bind (store meta)                                        *
*************************************************************************/


/*************************************************************************
*  2.  Serializer (tam + diff)                                          *
*************************************************************************/
const BASELINE = new WeakMap();
const SKIP_KEY = k => /^[_$]/.test(k) || k==='__proto__';

function serialize(root){
  const seen = new WeakSet();
  const ser  = (n,parentKey=null,isNew=true)=>{
    /* --- özel kanca ---------------------------------------- */
    if (n && typeof n.toStr === 'function' &&
        n.toStr !== Object.prototype.toStr){
      const custom = n.toStr(parentKey,isNew);
      if (custom !== undefined) return custom;
    }

    /* --- primitive / visited ------------------------------- */
    if (n === null || typeof n !== 'object') return n;
    if (seen.has(n)) return;
    seen.add(n);

    /* --- DOM Text / Comment / Element ---------------------- */
    if (n.nodeType===3) return { _$type:'Text',    content:n.nodeValue };
    if (n.nodeType===8) return { _$type:'Comment', content:n.nodeValue };
    if (n.nodeType===1) return serElement(n);

    /* --- Array --------------------------------------------- */
    if (Array.isArray(n)) return { _$type:'Array', items:n.map((x,i)=>ser(x,i,true)) };

    /* --- Plain / custom obj -------------------------------- */
    const ctor = n.constructor!==Object ? n.constructor.name : undefined;
    const out  = {};
    Object.keys(n).forEach(k=>{
      if (SKIP_KEY(k)) return;
      const v = ser(n[k], k, true);
      if (v!==undefined) out[k]=v;
    });
    if (ctor) out._$ctor=ctor;
    return out;
  };

  /* Element-özel -------------------------------------------- */
  function serElement(el){
    const attrs = Object.fromEntries(
      [...el.attributes].filter(a=>a.name!=='style').map(a=>[a.name,a.value]));

    /* Δ1: Map tabanlı event toplama ------------------------- */
    const events=[];
    const map = getEventMap(el);
    for (const [type,list] of map||[]){
      list.forEach(rec=>{
        const meta = FN_POOL.get(rec.wrapper)||{};
        events.push({ event:type, method:meta.method, objId:meta.ownerId, args:meta.args });
      });
    }

    return {
      _$_type : 'Element',
      tag     : el.tagName,
      attrs,
      style   : el.style.cssText||'',
      events,
      children: [...el.childNodes].map((c,i)=>ser(c,i,true))
    };
  }

  return ser(root);
}

/*****************************************************************
* 3. DIFF                                                        *
*****************************************************************/
function diff(curr, { reset = false } = {}) {
  const base = BASELINE.get(curr);
  const delta = _diff(curr, base) ?? {};
  if (reset) {
    // re-snapshot the post-diff state as the new baseline
    BASELINE.set(curr, serialize(curr));
  }
  return delta;
}
function _diff(a,b,parentKey=null){
  if (b===undefined) return serialize(a);          // yeni dal --> tam fotoğraf
  if (a===b) return;

  /* özel kanca ------------------------------------------------ */
  if (a && typeof a.toStr==='function' &&
      a.toStr!==Object.prototype.toStr){
    const custom=a.toStr(parentKey,false);
    if(custom!==undefined) return custom;
  }

  if (a===null||typeof a!=='object') return a;
  if (a.nodeType===1) return diffElement(a,b);
  if (Array.isArray(a)){
    const out=[],N=Math.max(a.length,(b||[]).length);
    for(let i=0;i<N;i++){
      const d=_diff(a[i],b?.[i],i);
      if(d!==undefined) out[i]=d;
    }
    return out.some(Boolean)?{_$type:'Array',items:out}:undefined;
  }
  const out={},keys=new Set([...Object.keys(a),...Object.keys(b||{})]);
  keys.forEach(k=>{
    if(SKIP_KEY(k)) return;
    const d=_diff(a[k],b?.[k],k);
    if(d!==undefined) out[k]=d;
  });
  return Object.keys(out).length?out:undefined;
}

function diffElement(el, ref){
  const o={_$type:'Element'};
  if(!ref||el.tagName!==ref.tag) o.tag=el.tagName;

  const at=Object.fromEntries([...el.attributes]
        .filter(a=>a.name!=='style').map(a=>[a.name,a.value]));
  if(JSON.stringify(at)!==JSON.stringify(ref?.attrs||{})) o.attrs=at;
  if(el.style.cssText!==(ref?.style||'')) o.style=el.style.cssText||'';

  /* Δ2: Map sürümü ------------------------------------------ */
  const news=[];
  const map=getEventMap(el);
  for(const [type,list] of map||[]){
    list.forEach(rec=>{
      const meta=FN_POOL.get(rec.wrapper)||{};
      const existed=(ref?.events||[]).some(e=>e.event===type &&
                                            e.method===meta.method &&
                                            e.objId===meta.ownerId);
      if(!existed) news.push({ event:type, method:meta.method, objId:meta.ownerId, args:meta.args });
    });
  }
  if(news.length) o.events=news;

  const kids=[],L=Math.max(el.childNodes.length,(ref?.children||[]).length);
  for(let i=0;i<L;i++){
    const d=_diff(el.childNodes[i],ref?.children?.[i],i);
    if(d!==undefined) kids[i]=d;
  }
  if(kids.some(Boolean)) o.children=kids;

  return Object.keys(o).length>1?o:undefined;
}

/*****************************************************************
* 4. APPLY-PATCH                                                *
*****************************************************************/
function applyPatch(base, patch, parentObj = null, parentKey = null){
  if(patch===undefined) return base;
  if(patch===null)      return undefined;
  if(typeof patch!=='object') return patch;

  /* Δ3: özel static fromStr(data,parent,isNew,base) ---------- */
  if (patch._ctor){
    const C = window[patch._ctor] || Object;
    if (typeof C.fromStr === 'function' && C.fromStr !== Object.fromStr){
      const isNew = base === undefined || base === null;
      return C.fromStr(patch, parentObj, parentKey, isNew, base);
    }
    const obj = new C(...(patch._args||[]));
    return applyPatch(obj, patch.diff, parentKey);
  }

  
  if (patch._$_type==='Element') return patchElement(base,patch);

  if (patch._$type==='Array'){
    const arr=base||[];
    patch.items?.forEach((p,i)=>arr[i] = applyPatch(arr[i], p, arr, i));
    return arr;
  }

  let obj=base;
  if(!obj||patch._$ctor){
    const C=window[patch._$ctor]||Object;
    obj=new C();
  }
  Object.entries(patch).forEach(([k,v])=>{
    if(k.startsWith('_$')) return;
    obj[k] = applyPatch(obj[k], v, obj, k);
  });
  return obj;
}

function patchElement(base, p){
  let el = base?.htmlObject || document.createElement(p.tag||'DIV');
  if(p.attrs) Object.entries(p.attrs).forEach(([k,v])=>el.setAttribute(k,v));
  if(p.style!==undefined) el.style.cssText = p.style;

  if(p.events){
    p.events.forEach(e=>{
      const owner = e.objId>0 ? ID2OBJ.get(e.objId) : null;
      const fn    = owner?.[e.method];
      if (fn) fn.bindToEvent(el,e.event,owner,...(e.args||[]));
    });
  }
  p.children?.forEach((c,i)=>{
    const child = applyPatch(el.childNodes[i]?.owner||el.childNodes[i], c, el, i);
    if(!el.childNodes[i] && child) el.appendChild(child.htmlObject||child);
  });
  return base||{htmlObject:el};
}
function diffJson(curr, prev) {
  if (prev === undefined) return curr;              // tamamen yeni dal
  if (curr === prev) return undefined;              // değişiklik yok

  if (curr === null || typeof curr !== 'object')
      return curr;                                  // primitif fark

  if (Array.isArray(curr)) {
    const out = [], N = Math.max(curr.length, (prev||[]).length);
    for (let i = 0; i < N; i++) {
      const d = diffJson(curr[i], prev?.[i]);
      if (d !== undefined) out[i] = d;
    }
    return out.some(Boolean) ? out : undefined;
  }

  const out = {};
  const keys = new Set([...Object.keys(curr), ...Object.keys(prev||{})]);
  keys.forEach(k => {
    const d = diffJson(curr[k], prev?.[k]);
    if (d !== undefined) out[k] = d;
  });
  return Object.keys(out).length ? out : undefined;
}
// ———————————————————————————————————————————————————————
// Monkey-patch applyPatch so it handles inline diffs on new ctors
// ———————————————————————————————————————————————————————

(function(){
  const originalApplyPatch = applyPatch;  // capture the real one

  // ────────────────────────────────────────────────
  // 2) Override window.applyPatch with our version
  // ────────────────────────────────────────────────
  window.applyPatch = function(base, patch, parentObj = null, parentKey = null) {
    // If this patch node has a _ctor, we want to new() it
    if (patch && typeof patch === 'object' && patch._ctor) {
      const C   = window[patch._ctor] || Object;
      const obj = new C(...(patch._args || []));
      // recurse into the diff payload (will call *this* override again
      // for any nested patches with their own _ctor)
      return applyPatch(obj, patch.diff, parentObj, parentKey);
    }

    // Otherwise delegate to the original, un-wrapped applyPatch:
    return originalApplyPatch(base, patch, parentObj, parentKey);
  };
})();
// ———————————————————————————————————————————————————————
// Recursively walk your delta tree and, whenever a branch was new,
// replace its inline props with `{ _ctor, _args, diff }` so we know
// exactly which ctor+args to call later.
// ———————————————————————————————————————————————————————
const _origSerialize = serialize;
serialize = function(root) {
  const tree = _origSerialize(root);
  // walk tree and copy _$args from symbol on live instances:
  function injectArgs(node, live) {
    if (!node || typeof node !== 'object') return;
    if (live && Array.isArray(live[_ctorArgs]) && live[_ctorArgs].length) {
      node._$args = live[_ctorArgs];
    }
    Object.keys(node).forEach(k => {
      if (k === '_$args') return;
      injectArgs(node[k], live ? live[k] : undefined);
    });
  }
  injectArgs(tree, root);
  return tree;
};

// ────────────────────────────────────────────────────────────────────────────
// 2) annotatePatch: makes every brand-new branch minimal + ctor+args
// ────────────────────────────────────────────────────────────────────────────
function annotatePatch(patchNode, currNode, baseNode) {
  if (!patchNode || typeof patchNode !== 'object') return;

  // NEW BRANCH: baseNode was empty but patchNode came from serialize()
  if (baseNode === undefined && patchNode._$ctor) {
    const ctorName = patchNode._$ctor;
    const args     = Array.isArray(patchNode._$args) ? patchNode._$args : [];

    // Build fresh baseline JSON for this branch:
    const C = window[ctorName] || Object;
    let freshBaseline = {};
    try {
      freshBaseline = serialize(new C(...args));
    } catch (e) { /* ignore */ }

    // rawCurr = the full subtree JSON we got from currNode
    const rawCurr = currNode;
    // compute minimal diff:
    const minimal = _diff(rawCurr, freshBaseline) || {};

    // replace patchNode in-place:
    Object.keys(patchNode).forEach(k => delete patchNode[k]);
    patchNode._ctor = ctorName;
    if (args.length) patchNode._args = args;
    patchNode.diff  = minimal;

    // recurse only on that minimal diff:
    annotatePatch(patchNode.diff, rawCurr, freshBaseline);
    return;
  }

  // EXISTING BRANCH: just recurse into children
  for (const key of Object.keys(patchNode)) {
    if (key === '_$ctor' || key === '_$args') continue;
    if (patchNode.diff && key === 'diff') {
      annotatePatch(patchNode.diff, currNode, baseNode);
    } else {
      annotatePatch(
        patchNode[key],
        currNode ? currNode[key] : undefined,
        baseNode ? baseNode[key] : undefined
      );
    }
  }
}
/*************************************************************************
*  4.  Telement kısayollar                                              *
*************************************************************************/
/*  bütün sınıflar miras alır  */
Object.prototype.track = function () {
  BASELINE.set(this, serialize(this));
  return this;
};

Object.defineProperty(Object.prototype, 'toStr', {
  value: function() {
    // 1. Baseline'dan önceki durumu al
    const base = BASELINE.get(this) || {};
    
    // 2. Mevcut durumu serialize et
    const current = serialize(this);
    
    // 3. Değişiklikleri hesapla (diff)
    const diff = _diff(current, base);
    
    // 4. Yapıcı argümanlarını ekle
    const output = {
      _ctor: this.constructor.name,
      _args: this[_ctorArgs] || [],
      diff: diff || {}
    };
    
    return JSON.stringify(output, null, 2);
  },
  writable: true,
  configurable: true
});

// ——————————————————————————————
// 2) global toObject(str)
// ——————————————————————————————
function toObject(str) {
  return JSON.parse(str, (key, value) => {
    if (value && value._$ctor) {
      const C = window[value._$ctor];
      if (typeof C === 'function') {
        const args = Array.isArray(value._$args) ? value._$args : [];
        const inst = new C(...args);
        // geri kalan diff alanlarını kopyala
        for (const k of Object.keys(value)) {
          if (k === '_$ctor' || k === '_$args') continue;
          inst[k] = value[k];
        }
        return inst;
      }
    }
    return value;
  });
}
Object.defineProperty(Object.prototype, 'toMinStr', {
  value: function() {
    // 1) last snapshot JSON
    const baseTree = BASELINE.get(this) || {};
    // 2) current JSON
    const currTree = serialize(this);
    // 3) raw delta
    const rawDelta = _diff(currTree, baseTree) || {};
    // 4) make new branches minimal + ctor+args
    annotatePatch(rawDelta, currTree, baseTree);
    // 5) wrap with root ctor+args
    const out = { _ctor: this.constructor.name };
    if (Array.isArray(currTree._$args) && currTree._$args.length) {
      out._args = currTree._$args;
    }
    out.diff = rawDelta;
    return JSON.stringify(out, null, 2);
  },
  writable:     true,
  configurable: true,
  enumerable:   false
});

// ────────────────────────────────────────────────────────────────────────────
// 4) fromMinStr(): rebuild from zero
// ────────────────────────────────────────────────────────────────────────────
function fromMinStr(str) {
  const { _ctor, _args = [], diff } = JSON.parse(str);
  const C   = window[_ctor] || Object;
  const obj = new C(..._args);
  if (diff) applyPatch(obj, diff);
  return obj;
}
String.prototype.toMinObject = function() {
  return fromMinStr(this);
};

String.prototype.toObject = function() {
  // 1. JSON string'ini parse et
  const parsed = JSON.parse(this);
  
  // 2. Constructor'ı bul
  const Ctor = window[parsed._ctor] || Object;
  
  // 3. Yeni nesne oluştur (yapıcı argümanlarıyla)
  const instance = new Ctor(...(parsed._args || []));
  
  // 4. Değişiklikleri uygula
  if (parsed.diff) {
    applyPatch(instance, parsed.diff);
  }
  
  // 5. Yeni nesneyi döndür
  return instance;
};

/*************************************************************************
*  5.  Dışa aktarma                                                     *
*************************************************************************/
window.Serializer={ serialize, diff, applyPatch, track:o=>BASELINE.set(o,serialize(o)) };



    Object.prototype.assign = function (obj, full = false, visited = new WeakSet()) {
        // Döngüsel referans kontrolü
        if (visited.has(obj)) return;
        visited.add(obj);
        if (this.__proto__.constructor.name === "ajax") {
            return;
        }
        Object.keys(obj).forEach(key => {
            let value = obj[key];
            if (value === this) return;
            if ((this[key] !== undefined && typeof this[key] === typeof value) || (this[key] === undefined && full)) {
                if (value !== null && typeof value === "object") {
                    if (!visited.has(value)) {
                        if (this[key] === undefined && full) {
                            if (typeof value.copy === "function") {
                                this[key] = value.copy();
                            } else {
                                this[key] = value;
                            }
                        } else if (this[key] !== undefined) {
                            this[key].assign(value, full, visited);
                        } else {
                            this[key] = value;
                        }
                    }
                } else {
                    this[key] = value;
                }
            }
        });
    };

    Object.prototype.merge = function (obj) {
        for (val in obj)
            if (!(val in this) && obj.hasOwnProperty(val))
                this[val] = obj[val];
    };
    Object.prototype.compare = function (Obj) {
        if (this.__proto__.constructor.name == "ajax") { return; }
        var rtn = true;
        var p;
        for (var P in Obj) {
            if (Obj.hasOwnProperty(P) && !Function.prototype[P]) {
                var inv = false;
                if (/^NOT/.exec(P) != null) {
                    inv = true;
                    p = P.replace(/^NOT/, "");
                } else
                    p = P;
                if (typeof this[p] == "object") {
                    rtn = this[p].compare(Obj[P]);
                    if (rtn == false)
                        return false;
                }
                else
                    if (this[p] == undefined) {
                        rtn = false;
                        return false;
                    }
                    else
                        if (!((inv && this[p] != Obj[P]) || (!inv && this[p] == Obj[P]))) {
                            return false;
                        }
            }
        }
        return rtn;
    };
    Object.prototype.defineProp = function (p, getf = null, setf = null, enumerable = true, configurable = true, writable = true, value = undefined) {

        var x = {};
        if (typeof getf === "object" && getf !== null)
            x = getf;
        else {
            let i = 1;
            if (typeof getf === 'function')
                if (getf.length === 0)
                    x.get = getf
                else
                    x.set = getf;
            i++;

            if (typeof arguments[i] === 'function')
                x.set = setf;
            i++;
            if (i < arguments.length)
                x.enumerable = arguments[i];
            i++;
            if (i < arguments.length)
                x.configurable = arguments[i];
            i++;
            if (i < arguments.length && !x.get && !x.set)
                x.writable = arguments[i];
            i++;
            if (i < arguments.length && arguments[i] != undefined)
                x.value = arguments[i];
        }
        if (x.enumerable === undefined) x.enumerable = true;
        if (x.configurable === undefined) x.configurable = true;
        Object.defineProperty(this, p, x);
    };



    Date.prototype.daysinMonth = function (iMonth, iYear) {
        iMonth = this == Date.prototype ? iMonth : this.getMonth();
        iYear = this == Date.prototype ? iYear : this.getFullYear();
        return 32 - new Date(iYear, iMonth, 32).getDate();
    }
    Date.prototype.firsOdayinMonth = function (month, year) {
        month = this == Date.prototype ? month : this.getMonth();
        year = this == Date.prototype ? year : this.getFullYear();
        var dt = new Date();
        dt.setFullYear(year, month, 1);
        return dt.getDay();
    }
    Date.prototype.strToDate = function (datestring) {
        try {
            let date = this == Date.prototype ? new Date() : this;
            date.setTime(date.parse(datestring));
        }
        catch (event) {
            return false;
        }
        return date;
    }
    Date.prototype.formatText = function (date, format) {
        var d = format ? date : this;
        format = format ? format : date;
        var y = String(d.getFullYear());
        var m = String(d.getMonth() + 1);
        var dd = String(d.getDate());
        var g = d.geOday();
        var h = String(d.getHours());
        var n = String(d.getMinutes());
        var s = String(d.getSeconds());
        var fmtp = /[ymdhns]*[^\/\\ *-:._]/g;
        var rtn, rtnf, lp, x, ek = "";
        rtnf = "";
        lp = 0;
        while (x = fmtp.exec(format)) {
            if (lp != 0)
                ek = format.substring(lp, x.index);
            rtn = "";
            lp = x.index + x[0].length;
            if (x[0].charAt(0) == "y")
                rtn = x[0].length <= 2 ? y.substring(2, 4) : y;
            else if (x[0].charAt(0) == "m")
                rtn = x[0].length == 1 ? m : x[0].length == 2 ? (m.length == 1 ? "0" + m : m) : x[0].length == 3 ? Intl.DateTimeFormat(Intl.locate().dateFormat.locale, { month: "short" }).format(d) : Intl.DateTimeFormat(Intl.locate().dateFormat.locale, { month: "long" }).format(d);
            else if (x[0].charAt(0) == "d") {
                rtn = x[0].length == 1 ? dd : x[0].length == 2 ? (dd.length == 1 ? "0" + dd : dd) : x[0].length == 3 ? Intl.DateTimeFormat(Intl.locate().dateFormat.locale, { weekday: "short" }).format(d) : Intl.DateTimeFormat(Intl.locate().dateFormat.locale, { weekday: "long" }).format(d);
            }
            if (x[0].charAt(0) == "h")
                rtn = x[0].length == 1 ? h : (h.length == 1 ? "0" + h : h);
            else if (x[0].charAt(0) == "n")
                rtn = x[0].length == 1 ? n : (n.length == 1 ? "0" + n : n);
            else if (x[0].charAt(0) == "s")
                rtn = x[0].length == 1 ? s : (s.length == 1 ? "0" + s : s);
            if (rtn != "" && rtnf != "") rtnf = rtnf + (ek ? ek : "") + rtn; else if (rtn != "") rtnf += rtn;
        }
        return rtnf;
    }
    /**TO-DO
     !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Kontrol et
     */
    String.prototype.formatFloat = function (format) {

        var fc, m, dig, dec, vc, rtn, pos, s = new String();
        s = format;
        pos = s.search(/[\,\.]/);
        rightF = new String(s.substring(pos + 1, s.length));
        leftF = new String(s.substring(pos, -pos));
        s = Str(this.toNumber());
        pos = s.search(".");
        dec = s.substring(pos + 1, s.length);
        dig = s.substring(pos - 1, -pos);
        m = s.match(/[\.\,](?=[^\.\,]*$)/)
        rtn = "";
        pos = 0;
        while (pos < rightF.length) {
            fc = rightF.charAt(pos);
            vc = rightV.charAt(pos);
            if (fc) {
                if (fc == "0")
                    rtn += vc ? vc : fc;
                else if (fc == "#" && vc !== false)
                    rtn += vc;
                else
                    break;
            } else
                break;
            pos++;
        }
        pos = leftF.length - 1;
        var pos1 = leftV.length - 1;
        rtn = "," + rtn;
        while (pos > 0) {
            fc = leftF.charAt(pos);
            vc = leftV.charAt(pos1);
            if (fc) {
                if (fc == "." && vc) {
                    rtn = "." + rtn;
                    pos1++;
                } else if (fc == "0")
                    rtn = (vc ? vc : fc) + rtn;
                else if (fc == "#" && vc !== false)
                    rtn = vc + rtn;
                else
                    break;
            } else
                break;
            pos--;
            pos1--;
        }
        return rtn;
    };
    /** Fonksiyon duzgun calismiyor' */
    String.prototype.toNumber = function (s) {
        var arb, s = s ? s : this;
        arb = s.test(/[٠١٢٣٤٥٦٧٨٩۵۶]/);
        if (arb) s = s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => d.charCodeAt(0) - 1632) // convert Arabic digits
            .replace(/[۴۵۶]/g, d => d.charCodeAt(0) - 1776); // convert Persian digits
        s = s.match(/[+-]?[\d\s\,\.]+/g)[0]
        if (s == null)
            return NaN; else s;
    };
    /**Cem
    * Verilen yaziyi Date nesnesine cevirir
    * @param {Date} v Date nesnesine cevrilicek yazi
    * @returns {Date} Date Nesnesi
    */
    String.prototype.toDate = function (v) {
        return Date.parse(v);
    };
    /**Cem
     * Yaziyi Nesneye cevirir 
      * @return {Object} Nesne
     */

    Array.prototype.filterRemove = function (predicate) {
        let rtn = [];
        for (let i = this.length - 1; i >= 0; i--) {
            if (predicate(this[i], i, this)) {
                rtn.push(...this.splice(i, 1));
            }
        }
        return rtn;
    };


    function descp(props, o) {

        const descriptors = props.reduce((acc, prop) => {
            acc[prop] = { enumerable: false, writable: true, configurable: true };
            return acc;
        }, {});
        Object.defineProperties(o.prototype, descriptors);
    }
    descp(["assign", "merge", "copy", "toStr", "compare", "defineProp"], Object);
    descp(["toEventFunc", "bindToEvent", "unBindEvent"], Function);
    descp(["toNumber", "toDate", "fornatFloat", "toObject"], String);
    descp(["strToDate", "formatText"], Date);

    Intl.locales = {
        Albanian_Albania: "sq_AL", Albanian: "sq", Arabic_Algeria: "ar_DZ", Arabic_Bahrain: "ar_BH", Arabic_Egypt: "ar_EG", Arabic_Iraq: "ar_IQ", Arabic_Jordan: "ar_JO", Arabic_Kuwait: "ar_KW", Arabic_Lebanon: "ar_LB", Arabic_Libya: "ar_LY", Arabic_Morocco: "ar_MA", Arabic_Oman: "ar_OM", Arabic_Qatar: "ar_QA", Arabic_Saudi_Arabia: "ar_SA", Arabic_Sudan: "ar_SD", Arabic_Syria: "ar_SY", Arabic_Tunisia: "ar_TN", Arabic_UAE: "ar_AE", Arabic_Yemen: "ar_YE", Arabic: "ar", Belarusian_Belarus: "be_BY", Belarusian: "be", Bengali_India: "bn_IN", Bengali_Bangladesh: "bn_BD", Bengali: "bn", Bulgarian_Bulgaria: "bg_BG", Bulgarian: "bg", Catalan_Spain: "ca_ES", Catalan: "ca", Chinese_China: "zh_CN", Chinese_Hong_Kong: "zh_HK", Chinese_Singapore: "zh_SG", Chinese_Taiwan: "zh_TW", Chinese: "zh", Croatian_Croatia: "hr_HR", Croatian: "hr", Czech_Czech_Republic: "cs_CZ", Czech: "cs", Danish_Denmark: "da_DK", Danish: "da", Dutch_Belgium: "nl_BE", Dutch_Netherlands: "nl_NL", Dutch: "nl", English_Australia: "en_AU", English_Canada: "en_CA", English_India: "en_IN", English_Ireland: "en_IE", English_Malta: "en_MT", English_New_Zealand: "en_NZ", English_Philippines: "en_PH", English_Singapore: "en_SG", English_South_Africa: "en_ZA", English_United_Kingdom: "en_GB", English_United_States: "en_US", English: "en", Estonian_Estonia: "et_EE", Estonian: "et", Finnish_Finland: "fi_FI", Finnish: "fi", French_Belgium: "fr_BE", French_Canada: "fr_CA", French_France: "fr_FR", French_Luxembourg: "fr_LU", French_Switzerland: "fr_CH", French: "fr", German_Austria: "de_AT", German_Germany: "de_DE", German_Luxembourg: "de_LU", German_Switzerland: "de_CH", German: "de", Greek_Cyprus: "el_CY", Greek_Greece: "el_GR", Greek: "el", Hebrew_Israel: "iw_IL", Hebrew: "iw", Hindi_India: "hi_IN", Hungarian_Hungary: "hu_HU", Hungarian: "hu", Icelandic_Iceland: "is_IS", Icelandic: "is", Indonesian_Indonesia: "in_$oid", Indonesian: "in", Irish_Ireland: "ga_IE", Irish: "ga", Italian_Italy: "it_IT", Italian_Switzerland: "it_CH", Italian: "it", Japanese_Japan: "ja_JP", Japanese_Japan_JP: "ja_JP_JP", Japanese: "ja", Korean_South_Korea: "ko_KR", Korean: "ko", Latvian_Latvia: "lv_LV", Latvian: "lv", Lithuanian_Lithuania: "lt_LT", Lithuanian: "lt", Macedonian_Macedonia: "mk_MK", Macedonian: "mk", Malay_Malaysia: "ms_MY", Malay: "ms", Maltese_Malta: "mt_MT", Maltese: "mt", Norwegian_Norway: "no_NO", Norwegian_Norway_Nynorsk: "no_NO_NY", Norwegian: "no", Polish_Poland: "pl_PL", Polish: "pl", Portuguese_Brazil: "pt_BR", Portuguese_Portugal: "pt_PT", Portuguese: "pt", Romanian_Romania: "ro_RO", Romanian: "ro", Russian_Russia: "ru_RU", Russian: "ru", Serbian_Bosnia_and_Herzegovina: "sr_BA", Serbian_Montenegro: "sr_ME", Serbian_Serbia_and_Montenegro: "sr_CS", Serbian_Serbia: "sr_RS", Serbian: "sr", Slovak_Slovakia: "sk_SK", Slovak: "sk", Slovenian_Slovenia: "sl_SI", Slovenian: "sl", Spanish_Argentina: "es_AR", Spanish_Bolivia: "es_BO", Spanish_Chile: "es_CL", Spanish_Colombia: "es_CO", Spanish_Costa_Rica: "es_CR", Spanish_Dominican_Republic: "es_DO", Spanish_Ecuador: "es_EC", Spanish_El_Salvador: "es_SV", Spanish_Guatemala: "es_GT", Spanish_Honduras: "es_HN", Spanish_Mexico: "es_MX", Spanish_Nicaragua: "es_NI", Spanish_Panama: "es_PA", Spanish_Paraguay: "es_PY", Spanish_Peru: "es_PE", Spanish_Puerto_Rico: "es_PR", Spanish_Spain: "es_ES", Spanish_United_States: "es_US", Spanish_Uruguay: "es_UY", Spanish_Venezuela: "es_VE", Spanish: "es", Swedish_Sweden: "sv_SE", Swedish: "sv", Thai_Thailand: "th_TH", Thai_Thailand_TH: "th_TH_TH", Thai: "th", Turkish_Turkey: "tr_TR", Turkish: "tr", Ukrainian_Ukraine: "uk_UA", Ukrainian: "uk", Vietnamese_Vietnam: "vi_VN", Vietnamese: "vi"
    };
    Intl.numberingSystems = {
        Adlam_digits: "adlm", Ahom_digits: "ahom", Arabic_Indic_digits: "arab", Extended_Arabic_digits: "arabext", Armenian_Ucase_numerals: "armn", Armenian_Lcase_numerals: "armnlow", Balinese_digits: "bali", Bengali_digits: "beng", Bhaiksuki_digits: "bhks", Brahmi_digits: "brah", Chakma_digits: "cakm", Cham_digits: "cham", Cyrillic_numerals: "cyrl", Devanagari_digits: "deva", Ethiopic_numerals: "ethi", Financial_numerals: "finance", Full_width_digits: "fullwide", Georgian_numerals: "geor", Gunjala_Gondi_digits: "gong", Masaram_Gondi_digits: "gonm", Greek_Ucase_numerals: "grek", Greek_Lcase_numerals: "greklow", Gujarati_digits: "gujr", Gurmukhi_digits: "guru", Han_character_calendars: "hanidays", Positional_decimal_Chinese_digits: "hanidec", Simplified_Chinese_numerals: "hans", Simplified_Chinese_financial_numerals: "hansfin", Traditional_Chinese_numerals: "hant", Traditional_Chinese_financial_numerals: "hantfin", Hebrew_numerals: "hebr", Pahawh_Hmong_digits: "hmng", Nyiakeng_Puachue_Hmong_digits: "hmnp", Javanese_digits: "java", Japanese_numerals: "jpan", Japanese_financial_numerals: "jpanfin", Japanese_calendar: "jpanyear", Kayah_Li_digits: "kali", Khmer_digits: "khmr", Kannada_digits: "knda", Tai_Tham_Hora_secular_digits: "lana", Tai_Tham_Tham_ecclesiastical_digits: "lanatham", Lao_digits: "laoo", Latin_digits: "latn", Lepcha_digits: "lepc", Limbu_digits: "limb", Mathematical_bold_digits: "mathbold", Mathematical_double_struck_digits: "mathdbl", Mathematical_monospace_digits: "mathmono", Mathematical_sans_serif_bold_digits: "mathsanb", Mathematical_sans_serif_digits: "mathsans", Malayalam_digits: "mlym", Modi_digits: "modi", Mongolian_digits: "mong", Mro_digits: "mroo", Meetei_Mayek_digits: "mtei", Myanmar_digits: "mymr", Myanmar_Shan_digits: "mymrshan", Myanmar_Tai_Laing_digits: "mymrtlng", Native_digits: "native", Newa_digits: "newa", NKo_digits: "nkoo", Ol_Chiki_digits: "olck", Oriya_digits: "orya", Osmanya_digits: "osma", Hanifi_Rohingya_digits: "rohg", Roman_Ucase_numerals: "roman", Roman_lowercase_numerals: "romanlow", Saurashtra_digits: "saur", Sharada_digits: "shrd", Khudawadi_digits: "sind", Sinhala_Lith_digits: "sinh", Sora_Sompeng_digits: "sora", Sundanese_digits: "sund", Takri_digits: "takr", New_Tai_Lue_digits: "talu", Tamil_numerals: "taml", Modern_Tamil_decimal_digits: "tamldec", Telugu_digits: "telu", Thai_digits: "thai", Tirhuta_digits: "tirh", Tibetan_digits: "tibt", Traditional_numerals: "traditio", Vai_digits: "vaii", Warang_Citi_digits: "wara", Wancho_digits: "wcho"
    };

    //testMode nesneler test için oluşturulduğu zaman true olur kayıda alınmazlar.
    globs.testMode = false;
    var DB = {
        fieldTypes: { string: 0, text: 1, mask: 2, email: 3, date: 4, time: 5, datetime: 6, year: 7, number: 8, single: 9, float: 10, money: 11, memo: 12, boolean: 13, graphic: 14 },
        errors: {
            wrongData: "Alan tipi ile girilen veri uyusmumuyor.",
            wrongDate: "Yanlis tarih girisi.",
            longData: "Alana girilmesi gerekenden baska veri girdiniz.",
            dublicateData: "Bu alana tekrar eden veri giremezsiniz.",
            wrongTime: "Yanlis zaman girdiniz",
            unsignedData: "Bu alana sadece pozitif sayilar girebilirsiniz.",
            autoincField: "Alan otomatik artan sayi tipinde.",
            requriedData: "Alani bos birakamazsiniz."
        }
    }
    async function loadJSON(fileURL) {
        var rtn = await fetch(fileURL)
        return await rtn.json()
    };
    function quote(string) {
        var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"': '\\"',
            '\\': '\\\\'
        };
        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    Tord = class Tord extends Number {
        constructor(o) {
            super(o);
            this.index = 0;
            this.onchange = null;
            this.defineProp("_$list", { enumerable: false, writable: true });
            this.defineProp("length", () => { return Object.keys(window[this._$list]).length - 1 });
        }

        next(v) { v = v || 1; this.index = (this.index + v) % this.length; return this }
        prev(v) { v = v || -1; this.index = (this.length + this.index - v) % this.length; return this }
        first() { this.index = 0; return this }
        last() { this.index = window[this._$list].length - 2; return this }
        ord() { return Object.keys(window[this._$list])[this.index] }
        forEach(func) {
            let m, l = window[this._$list];
            for (m in l) {
                func(m, l[m]);
            }
        }
        toString() {
            return Object.keys(window[this._$list])[this.index];
        }
        _$toStr() {
            return this.index != window[this._$list][0] ? '{"_$parent":' + quote(this._$list) + ',"value":' + this.index + "}" : "";
        }
        [Symbol.toPrimitive](hint) {
            if (hint === 'object') {
                return this;
            } else
                if (hint === 'string') {
                    return this.toString();
                } else
                    return Number(window[this._$list][Object.keys(window[this._$list])[this.index]]);
        }
    }
    function createOrdList(listName, listitems) {
        var s, s1, v1;

        s = window[listName] = {};
        if (typeof listitems == "string") {
            s1 = listitems.split(/[,|;]/);
            for (var i = 0; i < s1.length; i++) {
                s[s1[i]] = i;
            }
        } else {
            s1 = Object.keys(listitems);
            for (var i = 0; i < s1.length; i++) {
                s[s1[i]] = listitems[s1[i]];
            }

        }
        s.forEach = function (func) {
            let m, l = s;
            for (m in l) {
                if (typeof l[m] == "number")
                    func(m, l[m]);
            }
        }
        s.bindTo = function (propName, obj) {
            var x = new Tord(s[s1[0]]);
            x._$list = listName;
            defineProp.call(obj, propName, function () {
                return x;
            },
                function (v) {
                    var f = false;
                    ov = x.value;
                    for (var i = 0; i < s1.length; i++) {
                        if (s[s1[i]] == v) {
                            f = true;
                            x.index = i;
                            x.value = v;
                            break;
                        }
                    }
                    if (f && x.onchange) x.onchange(ov, v);
                }
            );
        };
        //Object.freeze(s);
    }
    Tenum = class Tenum extends Number {

        constructor() {
            super();
            this.onchange = null;
            this.defineProp("_$list", { enumerable: false, writable: true });
            this.defineProp("self", { get: () => { return this }, enumerable: false });
            this.value = 0;
        }
        static inEnum(enm, v) {
            return (enm & v) === v;
        }
        inEnum(v) { return Tenum.inEnum(this.value, v) }
        toString() {
            const s = this.self;
            const keys = [];
            for (let k in s) {
                if (s.hasOwnProperty(k) && typeof s[k] === "boolean" && s[k]) {
                    keys.push(k);
                }
            }
            return "[" + keys.join(",") + "]";
        }
         toStr() {
            return {
            _ctor : 'Tenum',
            value : this.value,
            list  : this._$list,
            };
        }
        fromStr( patch, parentObj ,isNew, parentKey = null,base){
            if(isNew) 
          { window[patch.list].bindTo(parentKey, parentObj);}
            else
            parentObj[parentKey].value = patch.value;
        }
        _$toStr() {
            return '{"_$parent":' + quote(this._$list) + ',"value":' + this.value + "}";
        };
        add(v) {
            var a = this.value;
            a = a | v;
            this.value = a;
            return a;
        }
        forEach(func) {
            let m, l = window[this._$list];
            for (m in l) {
                if (m != "bindTo")
                    func(m, l[m]);
            }
        }
        subtract(v) {
            this.value &= ~v;
            return this.value;
        }
        [Symbol.toPrimitive](hint) {
            if (hint === 'object') {
                return this;
            }
            return Number(this.value);
        }
        [Symbol.has](t, n) { return this.inEnum(n) }
    }
    function createEnumList(listName, listitems) {
        var s = window[listName] = {};;
        if (typeof listitems == "string") {
            var arr = listitems.split(/[,|;]/).map(x => x.trim());
            for (var i = 0; i < arr.length; i++) {
                s[arr[i]] = i == 0 ? 0 : (1 << (i - 1)); // 0, 1, 2, 4, 8... flag-style
            }
        } else if (typeof listitems == "object" && listitems !== null) {
            // OBJELERDE BİREBİR EKLE (kompozitler, all'lar burada problemsiz olur)
            for (var k in listitems) {
                if (listitems.hasOwnProperty(k)) {
                    s[k] = listitems[k];
                }
            }
        }
        // b
        s.bindTo = function (propName, obj) {
            var o = 0, x = new Tenum(o), prx = new Proxy(x, { has: function (t, n) { return x.inEnum(n) } })
            x._$list = listName;
            var p = 0;
            for (let n in s) {
                if (s.hasOwnProperty(n) && typeof s[n] == "number") {
                    defineProp.call(x, n, function (k) {
                        var a = 1 << k - 1;
                        return Boolean((p == 0 && x.value == 0) || (x.value & a) != 0)
                    }.bind(x, p),
                        function (v, k) {
                            ov = x.value;
                            var a = 1 << v - 1;
                            if (k)
                                x.value |= a
                            else
                                x.value &= ~a;

                            if (Number(ov) != Number(x) && x.onchange) { let c = {}; c[n] = k; x.onchange(c) };
                        }.bind(x, p)
                    );
                    p = p + 1;
                }
            }

            defineProp.call(obj, propName, function () {

                return prx;
            }.bind(x),
                function (v) {

                    let ov = { ...x };
                    if (v < 0) {
                        x.subtract(-v);
                    }
                    else
                        x.value = v;

                    if (x.onchange) {
                        let y = {};
                        x.forEach((n, v) => { if (ov[n] != x[n]) y[n] = x[n] });
                        x.onchange(y);
                    }
                }
            );
        };
    };
    createOrdList("Omonth", "January,February,March,April,May,June,July,August,September,October,November,December");
    createOrdList("Oday", "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday");
    createOrdList("OdragMode", "none,copy,remove,transfer");
    createOrdList("Obutton", { none: -1, left: 0, middle: 1, right: 2, back: 3, forward: 4 });
    createOrdList('Olayers', 'background,base,content,tools,widget,mainMenu,dropdown,tooltip,contextMenu,popup,windows,overlay,modal,selection,dragPreview,notification,guide,dialog');
    createEnumList("Ealign", "none,left,right,top,bottom,center,middle,client,inner, outer offset");
    createEnumList("EwindowStatus", "none,show,showmodal,hide,active,minizime,maximize");
    createEnumList("EcaptionButton", "none,close,maximize,minizime,restore,help");
    createEnumList("EelementStatus", "none,sizable,movable,draggable,insideDrag,dockable,scrollable,selectable,lockable,disable,visible");
    createEnumList("Eborder", {
        none: 0,
        left: 1,
        right: 2,
        top: 4,
        bottom: 8,
        leftTop: 1 | 4,
        leftBottom: 1 | 8,
        rightTop: 2 | 4,
        rightBottom: 2 | 8,
        topBottom: 4 | 8,
        leftRight: 1 | 2,
        all: 1 | 2 | 4 | 8  // Yani 15!
    });
    function isInner(align) { return (align & Ealign.inner) === Ealign.inner; }
    Ealign.alignToRect = function (layoutrect, width, height, align) {
        if (align) {
            let innerLayout = isInner(align);
            var lr, r = new Trect();
            lr = Array.isArray(layoutrect) ? new Trect(layoutrect) : layoutrect;
            if (Tenum.inEnum(align, Ealign.client)) return lr;
            r.width = width;
            r.height = height;
            r.top = false;
            r.left = false;
            if (Tenum.inEnum(align, Ealign.middle))
                r.top = lr.top + Math.round((lr.height - height) / 2);
            else {
                if (Tenum.inEnum(align, Ealign.top)) {
                    if (innerLayout) {
                        r.top = lr.top;
                    } else {
                        r.top = lr.top - height;
                    };
                }
                if (Tenum.inEnum(align, Ealign.bottom)) {
                    if (r.top === false) {
                        if (innerLayout)
                            r.top = lr.top + (lr.height - height);
                        else
                            r.top = lr.top + lr.height;
                    } else { r.top = lr.top; r.height = lr.height; }
                }
            }
            if (Tenum.inEnum(align, Ealign.center)) {
                r.left = Math.round(lr.left + (lr.width - width) / 2);
            } else {
                if (Tenum.inEnum(align, Ealign.left)) {
                    r.left = lr.left;
                    if (!innerLayout)
                        r.left -= width;
                }
                if (Tenum.inEnum(align, Ealign.right)) {
                    if (r.left === false) {
                        if (innerLayout)
                            r.left = lr.left + lr.width - width;
                        else
                            r.left = lr.left + lr.width;
                    } else { r.left = lr.left; r.width = lr.width; }

                }
            }
            if (r.top === false)
                r.top = lr.top;
            if (r.left === false)
                r.left = lr.left;
            return r;
        }
    };
    Ealign.alignToObjectRect = function (obj, layoutobj, align) {
        var innerLayout = isInner(align);
        var lr = align.offset ? layoutobj.rect : layoutobj.clientRect();
        var r = Ealign.alignToRect(lr, obj.offsetWidth ? obj.offsetWidth : obj.computedStyle.offsetWidth, obj.offsetHeight ? obj.offsetHeight : obj.computedStyle.offsetHeight, align, innerLayout || false);
        let stop, sleft, parent = layoutobj.parentElement;
        stop = 0; sleft = 0;
        while (obj.parentElement != parent && parent != document.body) { stop += parent.scrollTop; sleft += parent.scrollLeft; parent = parent.parentElement; }
        obj.style.left = r.left + sleft + scrollX + "px";
        obj.style.top = r.top + stop + scrollY + "px";
        var l;
        if (r.width == lr.width) {
            l = align.offset ? layoutobj.offsetWidth : layoutobj.clientWidth;
            obj.style.width = l + "px";
        }// -(obj.offsetWidth-obj.clientWidth);
        if (r.height == lr.height) {
            l = align.offset ? layoutobj.offsetHeight : layoutobj.clientHeight;
            obj.style.height = l + "px";
        } // -(obj.offsetHeight-obj.clientHeight)
    }
    Ealign.alignToStyle = function (align) {
        let str = "";
        let Ealign = this == window ? Ealign : this;
        let kln = align ? align : Number(this);
        if (kln >= Ealign.middle) {
            kln %= Ealign.middle;
            str += "vertical-align:middle;";
        }
        if (kln >= Ealign.bottom) {
            kln %= Ealign.bottom;
            str += "vertical-align:bottom;";
        }
        if (kln >= Ealign.top) {
            kln %= Ealign.top;
            str += "vertical-align:top;";
        }
        if (kln >= Ealign.center) {
            kln %= Ealign.center;
            str += "text-align:center;";
        }
        if (kln >= Ealign.right) {
            kln %= Ealign.right;
            str += "float:right;";
        }
        if (kln >= Ealign.left) {
            kln %= Ealign.left;
            str += "float:left;";
        }
        return str;
    }
    Object.freeze(Ealign);
    createEnumList("TBicons", "none,systemMenu,minimize,maximize");
    Object.freeze(TBicons);


    function giveHex(s) {
        s = s.toUpperCase();
        return parseInt(s, 16);
    }
    hexTorgb = function (hex) {
        var r, g, b, clrs = hex.match(/[^#]./g);
        if (!clrs)
            return false;
        r = giveHex(clrs[0]);
        g = clrs.length == 3 ? giveHex(clrs[1]) : r;
        b = clrs.length == 3 ? giveHex(clrs[2]) : r;
        return [r, g, b];
    };
    rgbTohex = function (r, g, b) {
        return "#" + DecToHex(r) + DecToHex(g) + DecToHex(b);
    };
    var hexbase = "0123456789ABCDEF";
    function DecToHex(number) {
        return hexbase.charAt((number >> 4) & 0xf) + hexbase.charAt(number & 0xf);
    }
    function calculateLuminance(hex) {
        // Remove "#" if present
        hex = hex.replace("#", "");
        let [r, g, b] = hexTorgb(hex);
        r = r / 255;
        g = g / 255;
        b = b / 255;
        // Apply sRGB transformation
        const transform = (value) =>
            value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

        const lumR = transform(r);
        const lumG = transform(g);
        const lumB = transform(b);

        // Calculate luminance
        return 0.2126 * lumR + 0.7152 * lumG + 0.0722 * lumB;
    }
    class TColor {
        constructor(r, g, b, a) {
            if (r && typeof red == "string")
                this.setHex(red);
            else {
                this.red = r || 0;
                this.green = g || 0;
                this.blue = b || 0;
            }
            this.alpha = a || 1;
        }
        setHex(hex) {
            var rtn = hexTorgb(hex);
            this.red = rtn[0];
            this.green = rtn[1];
            this.blue = rtn[2];
            return rtn;
        }
        getHex() {
            return rgbTohex(this.red, this.green, this.blue);
        }
        setColor(r, g, b, a) {
            if (arguments.length == 1) {
                if (arguments[0][1])
                    g = arguments[0][1];
                if (arguments[0][2])
                    b = arguments[0][2];
                if (arguments[0][3])
                    a = arguments[0][3];
                if (arguments[0][0])
                    r = arguments[0][0];
            } else {
                r = red || this.red;
                g = green || this.blue;
                b = blue || this.green;
                a = alpha || this.alpha;
            }
            this.red = r;
            this.green = g;
            this.blue = b;
            this.alpha = a;
        }
        inverse() {
            return new TColor(255 - this.red, 255 - this.green, 255 - this.blue,
                this.alpha);
        }
        grayScale() {
            var nc = Math.round(((this.red + this.green + this.blue) / 765) * 255);
            return new TColor(nc, nc, nc, this.alpha);
        }
        combine(color) {
            if (!color) return false;
            function c(v) {
                return v < 0 ? 0 : (v > 255 ? 255 : v);
            }
            var clr = 0;
            if (typeof color == "string")
                clr = hexTorgb(color);
            else if (color.constructor == TColor)
                clr = [color.red, color.green, color.blue];
            else if (arguments.length == 1)
                clr = color;
            else if (arguments.length == 3)
                clr = Array.prototype.concat(arguments);
            return [c(clr[0] + this.red), c(clr[1] + this.green),
            c(clr[2] + this.blue), this.alpha];
        }
        combineTColor(color) {
            var c = this.combine.call(this, color);
            return new TColor(c[0], c[1], c[2], c[3], this.alpha);
        }
        toString(hex = false) {
            return "rgba(" + this.red + "," + this.green + "," + this.blue + ","
                + this.alpha + ")";
        }
    };
    function colorInverse(str) {
        a = giveHex(str.slice(1, 3));
        b = giveHex(str.slice(3, 5));
        c = giveHex(str.slice(5));
        return "#" + DecToHex(255 - a) + "" + DecToHex(255 - b) + "" + DecToHex(255 - c);
    }
    Tpoint = class Tpoint {
        constructor(x, y) { this.x = x, this.y = y; }
    };
    Trect = class Trect extends DOMRect {
        constructor(left = 0, top = 0, width = 0, height = 0) {
            super(left, top, width, height);
        }

        // Ekstra yardımcı metotlar:
        copy() {
            return new Trect(this.left, this.top, this.width, this.height);
        }
        inflate(dx, dy) {
            return new Trect(
                this.left - dx,
                this.top - dy,
                this.width + 2 * dx,
                this.height + 2 * dy
            );
        }
        move(dx, dy) {
            return new Trect(
                this.left + dx,
                this.top + dy,
                this.width,
                this.height
            );
        }
        contains(x, y) {
            if (typeof x === "object") { y = x.y; x = x.x; }
            return (
                x >= this.left &&
                y >= this.top &&
                x <= this.left + this.width &&
                y <= this.top + this.height
            );
        }
        static fromElement(el) {
            const r = el.getBoundingClientRect();
            return new Trect(r.left, r.top, r.width, r.height);
        }
        toString() {
            return `Trect(left:${this.left}, top:${this.top}, width:${this.width}, height:${this.height})`;
        }
    }

    Math.radToDeg = function (r) {
        return (r * 180) / Math.Pi;
    };
    Math.degToRad = function (a) {
        return (a * Math.Pi) / 180;
    };
    var is_gecko = /gecko/i.test(navigator.userAgent);
    var is_ie = /MSiE/.test(navigator.userAgent);

    HTMLElement.prototype.alignToObjectRect = function (layoutObj, align, offset) {
        Ealign.alignToObjectRect(this, layoutObj, align, offset);
    };
    HTMLElement.prototype.alignToScreen = function (align) {
        this.rect = Ealign.alignToRect([0, 0, innerWidth, innerHeight], this.offsetWidth ? this.offsetWidth : this.computedStyle.offsetWidth, this.offsetHeight ? this.offsetHeight : this.computedStyle.offsetHeight, align);
    };





    defineProp.call(HTMLElement.prototype, "computedStyle", { get: function () { return getComputedStyle(this) } });

    window.AllClass = {
        byClass: {},
        byId: [],
        byOrder: []
    };
    // Fonksiyon aşırı yüklemeleri için kayıt nesnesi.
    const Funcs = {};

    /**
     * Aşırı yüklenebilir fonksiyon tanımlayıcı.
     * @param {Function} f - Aşırı yüklenecek fonksiyon.
     * @param {string} fname - Fonksiyon adı.
     * @param  {...string} paramTypes - Fonksiyon parametrelerinin tipleri.
     */
    overloadFunction = (f, fname, ...paramTypes) => {
        if (!Funcs.hasOwnProperty(fname)) {
            Funcs[fname] = [];
        }
        Funcs[fname].push({ func: f, paramTypes: paramTypes.length ? paramTypes : 0 });
        window[fname] = function (...args) {
            for (const entry of Funcs[fname]) {
                if (args.length === entry.func.length) {
                    let match = true;
                    if (entry.paramTypes !== 0) {
                        for (let i = 0; i < args.length; i++) {
                            if (typeof args[i] !== entry.paramTypes[i]) {
                                match = false;
                                break;
                            }
                        }
                    }
                    if (match) return entry.func.apply(this, args);
                }
            }
        };
    };

    class SelectionManager extends EventTarget {
        constructor() {
            super();
            this._selected = new Set();
        }

        /**
         * Select an item.
         * @param {Telement} item
         * @param {Object} options
         *   @param {boolean} [options.multi=false]          — Add to existing selection?
         *   @param {boolean} [options.silent=false]         — Don't fire change events?
         *   @param {boolean} [options.scrollIntoView=false]— Scroll into view?
         *   @param {Function} [options.onSelect]            — Callback when selected
         *   @param {string}   [options.cssClass='selected']— CSS sınıfı
         *   @param {boolean}  [options.animate=false]       — Basıldığında kısa animasyon
         *   @param {Function} [options.filter]              — Sadece filter(item)===true ise seç
         */
        select(item, {
            multi = false,
            silent = false,
            scrollIntoView = false,
            onSelect,
            cssClass = 'selected',
            animate = false,
            filter
        } = {}) {
            if (filter && !filter(item)) return;

            // multi değilse, tıklananı hariç tutup diğerlerini temizle
            if (!multi) this.clear({ silent, except: item });

            if (!this._selected.has(item)) {
                this._selected.add(item);

                if (typeof onSelect === 'function') onSelect(item);

                if (!silent) {
                    this.dispatchEvent(new CustomEvent('change', {
                        detail: { action: 'select', item, cssClass }
                    }));
                }

                if (scrollIntoView) {
                    item.htmlObject.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }

                if (animate) {
                    item.htmlObject.classList.add('select-animate');
                    setTimeout(() => item.htmlObject.classList.remove('select-animate'), 300);
                }
            }
        }

        /**
         * Deselect a single item.
         * @param {Telement} item
         * @param {Object} options
         *   @param {boolean} [options.silent=false]
         */
        deselect(item, { silent = false } = {}) {
            if (this._selected.delete(item) && !silent) {
                this.dispatchEvent(new CustomEvent('change', {
                    detail: { action: 'deselect', item }
                }));
            }
        }

        /**
         * Clear all selection, but optionally keep one item.
         * @param {Object} options
         *   @param {boolean}   [options.silent=false]
         *   @param {Telement}  [options.except] — Hariç tutulacak öğe
         */
        clear({ silent = false, except = null } = {}) {
            for (let item of [...this._selected]) {
                if (item === except) continue;
                if (!silent) {
                    this.dispatchEvent(new CustomEvent('change', {
                        detail: { action: 'deselect', item }
                    }));
                }
                this._selected.delete(item);
            }
        }

        toggle(item, opts = {}) {
            if (this._selected.has(item)) this.deselect(item, opts);
            else this.select(item, opts);
        }

        has(item) {
            return this._selected.has(item);
        }

        get selection() {
            return [...this._selected];
        }
    }
    // ── Hook it up ────────────────────────────────────────────────────────────────
    globs.selectionManager = new SelectionManager();

    // on change, toggle the class:
    globs.selectionManager.addEventListener('change', ({ detail }) => {
        detail.item.htmlObject.classList.toggle(
            'selected',
            detail.action === 'select'
        );
    });



    TClass = class TClass extends Object {
        #id;
        #name;
        constructor() {
            super();
            this.#id = ++OID;
            var k = AllClass.byClass;
            var p, z = new Array();
            p = this.$parent;

            z.unshift(p.constructor.name);
            while (p) {
                if (p.$parent && p.$parent.constructor.name != "Object") {
                    z.unshift(p.$parent.constructor.name);
                    p = p.$parent;
                } else
                    break;
            }
            for (p = 0; p < z.length; p++) {
                if (!k[z[p]])
                    k[z[p]] = new Array();
                k = k[z[p]];
            }
            k.push(this);
            // Dinamik isim
            Object.defineProperty(this, "name", {
                get: () => `${this.$parent?.constructor.name || "Root"}-${this.id}`,
                enumerable: true,
            });
            AllClass.byId[this.id] = this;
            AllClass.byOrder.push(this);
        }

        get id() {
            if (this.#id === undefined) {
                this.#id = ++OID;
            }
            return this.#id;
        }
        get name() {

            return this.constructor.name;

        }
        get $parent() {
            return Object.getPrototypeOf(this);
        }

        destroy() {
            // AllClass.byId’dan kaldır
            if (AllClass.byId[this.id])
                delete AllClass.byId[this.id];
            // AllClass.byOrder’dan çıkar
            if (AllClass.byOrder)
                AllClass.byOrder = AllClass.byOrder.filter(x => x !== this);

            // AllClass.byClass’tan çıkar (gerekirse recursive fonksiyonla)
            function removeFromNestedArr(arr, obj) {
                if (Array.isArray(arr)) {
                    const idx = arr.indexOf(obj);
                    if (idx > -1) arr.splice(idx, 1);
                    else arr.forEach(subArr => removeFromNestedArr(subArr, obj));
                }
            }
            removeFromNestedArr(AllClass.byClass, this);
        }
    }
    // ==== Komutların Temeli ====

    // ==== Seçim Yöneticisi (multi-drag için) ====

    let Telementstyles = false;
    const INTERACTION_STATE = new WeakMap();
    /**
     * Gelişmiş Temel Telement Sınıfı
     *
     * @param {string|HTMLElement} tagOrEl
     *   Oluşturulacak tag’ın adı veya var olan bir HTMLElement.
     * @param {Object} [options]
     *   Yapılandırma objesi. İçerdiği alanlar:
     *   @param {string}                     [options.id]               — HTML id
     *   @param {string|string[]}            [options.className]        — Ek CSS sınıfları
     *   @param {Object}                     [options.style]            — inline CSS stilleri ({ left, top, width, … })
     *   @param {Object}                     [options.attrs]            — diğer HTML attribute’ları ({ title, 'data-*', … })
     *   @param {Object.<string,Function>}   [options.events]          — event handler’lar ({ click: fn, mouseover: fn, … })
     *   @param {Telement|HTMLElement}       [options.parent]           — parent konteyner (Telement ya da raw HTMLElement)
     *   @param {Array.<Telement>}           [options.children]         — başlangıç çocukları
     *   @param {EelementStatus|Object}      [options.status]           — başlangıç status flag’leri
     *
     *   @param {Object}                     [options.resizeOptions]    — resize ayarları
     *   @param {number}                     [options.resizeOptions.flags]       — Eborder bitmask (hangi kenarlardan resize yapılır)
     *   @param {number}                     [options.resizeOptions.minWidth]    — minimum width (px)
     *   @param {number}                     [options.resizeOptions.maxWidth]    — maximum width (px)
     *   @param {number}                     [options.resizeOptions.minHeight]   — minimum height (px)
     *   @param {number}                     [options.resizeOptions.maxHeight]   — maximum height (px)
     *   @param {boolean}                    [options.resizeOptions.useHelper]   — görsel handle’lar çizilsin mi
     *
     *   @param {Object}                     [options.dragOptions]      — native HTML5 drag ayarları
     *   @param {HTMLElement|string|null}    [options.dragOptions.handle]          — drag başlatma handle’ı (selector veya HTMLElement)
     *   @param {string|null}                [options.dragOptions.group]           — drag grup etiketi (aynı gruptakiler arasında drop)
     *   @param {string}                     [options.dragOptions.type]            — drag tipi (örn. 'default')
     *   @param {boolean}                    [options.dragOptions.revertIfNotDropped] — drop olmazsa geri dönsün mü
     *   @param {string}                     [options.dragOptions.dragClass]       — sürüklenirken eklenen CSS sınıfı
     *   @param {Function}                   [options.dragOptions.onDragStart]     — dragstart tetiklendiğinde çağrılır
     *   @param {Function}                   [options.dragOptions.onDragEnd]       — dragend tetiklendiğinde çağrılır
     *
     *   @param {Object}                     [options.moveOptions]      — pointer tabanlı taşıma ayarları
     *   @param {HTMLElement|string|null}    [options.moveOptions.handle]         — taşımayı başlatan handle (selector veya HTMLElement)
     *   @param {boolean|DOMRect|HTMLElement}[options.moveOptions.bound]          — hareket sınırı (true=body tüm alan, DOMRect ya da HTML element)
     *   @param {boolean}                    [options.moveOptions.xable]          — yatayda taşınabilir mi
     *   @param {boolean}                    [options.moveOptions.yable]          — dikeyde taşınabilir mi
     *   @param {Function}                   [options.moveOptions.onMoveStart]    — taşımaya başlandığında çağrılır
     *   @param {Function}                   [options.moveOptions.onMove]         — taşınırken her hareket anında çağrılır
     *   @param {Function}                   [options.moveOptions.onDrop]         — drop anında çağrılır ({x,y} objesi parametre)
     *
     *   @param {Object}                     [options.dropOptions]      — drop hedef ayarları
     *   @param {string[]}                   [options.dropOptions.acceptTypes]     — kabul edilecek drag tipleri
     *   @param {string}                     [options.dropOptions.hoverClass]      — üzerine gelince eklenen CSS sınıfı
     *   @param {string}                     [options.dropOptions.placeHolderClass] — placeholder için CSS sınıfı
     *   @param {boolean}                    [options.dropOptions.showPlaceHolder] — placeholder gözüksün mü
     *   @param {Function}                   [options.dropOptions.onDrop]         — drop gerçekleştiğinde çağrılır (event parametreli)
     *
     *   @param {Object}                     [options.historyOptions]   — undo/redo takibi için ayarlar
     *   @param {boolean}                    [options.historyOptions.trackStyle]    — style değişikliklerini kaydet
     *   @param {boolean}                    [options.historyOptions.trackResize]   — resize değişikliklerini kaydet
     *   @param {boolean}                    [options.historyOptions.trackChildren] — çocuk ekleme/çıkarma
     *   @param {boolean}                    [options.historyOptions.trackAttr]     — attribute değişikliklerini kaydet
     *   @param {boolean}                    [options.historyOptions.trackEvents]   — event binding değişikliklerini kaydet
     * 
     *   @param {Object}                     [options.selectOptions]       
     *   @param {boolean}                    [options.selectOptions.multi]            — ctrl/meta ile çoklu seçim
     *   @param {boolean}                    [options.selectOptions.silent]           — seçilirken change event’i atılmasın
     *   @param {boolean}                    [options.selectOptions.scroll]  — seçince elemana scroll etsin
     *   @param {string}                     [options.selectOptions.selectClass]      — seçildiğinde eklenecek CSS sınıfı
     *   @param {string}                     [options.selectOptions.deselectClass]    — seçim kaldırıldığında eklenecek CSS sınıfı
     *   @param {Function}                   [options.selectOptions.onSelect]         — seçildiğinde çağrılır (this parametreli)
     *   @param {Function}                   [options.selectOptions.onDeselect]       — kaldırıldığında çağrılır (this parametreli)
    
     *
     *   @param {...object}                 other             — diğer custom parametreler
     */

const _ctorArgs = Symbol('ctorArgs');
    Telement = class Telement extends extendsClass(TClass, EventTarget) {
        #dropIndicator = null;
        #moveHandlers = null;
        #dockingHandlers = null;
        #dragHandlers = null;
        #dropHandlers = null;
        #dragHandle = null;
        #moveHandle = null;
        #hybridDrag = null;
        #initOpts = null;
        #initialKeys = null;
        #lastDropTarget = null;
        #touchHandlers = null;
        #dragState = {};
        loaded = false;
        constructor(tagOrEl, opts = {},...extra) {
            const safeCloneOptions = (src) => {
                if (src === null || typeof src !== "object") return src;
                if (Array.isArray(src)) return src.map(safeCloneOptions);
                if (src instanceof HTMLElement) return src.id ? `#${src.id}` : null;
                if (typeof src === "function") return undefined;

                const clone = {};
                for (const key in src) {
                    if (src.hasOwnProperty(key)) {
                        const val = safeCloneOptions(src[key]);
                        if (val !== undefined) clone[key] = val;
                    }
                }
                return clone;
            };
            super(tagOrEl, opts, extra);
            
            const html = (tagOrEl instanceof HTMLElement)
                ? tagOrEl
                : document.createElement(typeof tagOrEl === 'string' ? tagOrEl : 'div');
            this.htmlObject = html;
            html.owner = this;

            let {
                id, className, style = {}, attrs = {}, events = {},
                parent, children = [],
                status = EelementStatus.visible,
                resizeOptions = {},
                selectOptions = {},
                dragOptions = {}, moveOptions = {}, dropOptions = {}, historyOptions = {},
                ...other
            } = opts;
            this.selectOptions = Object.assign({
                multiKey: e => e.ctrlKey || e.metaKey,
                silent: false,
                scroll: false,
                selectClass: 'selected',
                deselectClass: null,
                onSelect: null,
                onDeselect: null
            }, opts.selectOptions);
            
            // HTML nitelikleri
            html.id = html.id || id || this.id;
            const clsDef = this.constructor.name;
            let clsUsr = Array.isArray(className) ? className : String(className || '').trim().split(/\s+/);
            html.classList.add(clsDef, ...clsUsr.filter(Boolean));
            Object.assign(html.style, style);
            Object.entries(attrs).forEach(([k, v]) => html.setAttribute(k, v));
            Object.entries(events).forEach(([e, h]) => html.addEventListener(e, h));

            // Drag/Move/Drop ayarları
            this.moveOptions = Object.assign({ handle: null, bound: true, xable: true, yable: true }, moveOptions);
            this.dragOptions = Object.assign({
                handle: null, group: null, type: 'default',
                revertIfNotDropped: true, dragClass: 'dragging'
            }, dragOptions);
            this.dropOptions = Object.assign({
                acceptTypes: ['default'], hoverClass: 'droppable-hover',
                placeHolderClass: 'drop-placeholder', showPlaceHolder: true
            }, dropOptions);
            this.resizeOptions = Object.assign({
                borders: Eborder.all,
                useHelper: false,
                minWidth: 20,
                maxWidth: Infinity,
                minHeight: 20,
                maxHeight: Infinity
            }, resizeOptions);

            const resolveHandle = h => {
                if (!h) return null;
                if (h instanceof HTMLElement) return h;
                if (typeof h === 'string') return html.querySelector(h) || null;
                return null;
            };
            Object.defineProperty(this.dragOptions, 'handle', {
                enumerable: true,
                get: () => this.#dragHandle,
                set: v => { this.#dragHandle = resolveHandle(v) ?? this.htmlObject; }
            });

            // Move Handle getter/setter
            Object.defineProperty(this.moveOptions, 'handle', {
                enumerable: true,
                get: () => this.#moveHandle,
                set: v => { this.#moveHandle = resolveHandle(v) ?? this.htmlObject; }
            });
            this.#moveHandle = moveOptions.handle;
            this.#dragHandle = dragOptions.handle;
            // Dinamik getter/setter'lar
            const thisRef = this;
            Object.defineProperty(this.dragOptions, 'handle', {
                enumerable: true,
                get() { return thisRef.#dragHandle || html; },
                set(v) {
                    thisRef.#dragHandle = resolveHandle(v) ?? html;
                    thisRef.#updateHybridFlag();
                    thisRef.#refreshDragListeners();
                }
            });

            Object.defineProperty(this.moveOptions, 'handle', {
                enumerable: true,
                get() { return thisRef.#moveHandle || html; },
                set(v) {
                    thisRef.#moveHandle = resolveHandle(v) ?? html;
                    thisRef.#updateHybridFlag();
                    if (thisRef.status.movable) thisRef.#toggleFeature('movable', true);
                }
            });
            let dragStartX = 0;
            let dragStartY = 0;
            let dragThreshold = 0;
            this.htmlObject.addEventListener('pointerdown', e => {

                if (e.button !== 0) return;


                if (this.status.selectable) {
                    e.stopPropagation();
                    const { multiKey, silent, scroll, selectClass, deselectClass, onSelect, onDeselect } = this.selectOptions;
                    const multi = multiKey(e);    // ctrl/meta’yu otomatik alır

                    if (multi) {
                        globs.selectionManager.toggle(this, { silent });
                    } else {
                        // except: this ile diğerlerini temizle, kendini koru
                        globs.selectionManager.clear({ silent, except: this });
                        if (!globs.selectionManager.has(this)) {
                            globs.selectionManager.select(this, { multi: false, silent });
                        }
                    }

                    // sınıfları uygula
                    this.htmlObject.classList.add(selectClass);
                    if (deselectClass) this.htmlObject.classList.remove(deselectClass);

                    // callback
                    if (onSelect) onSelect.call(this);

                    // otomatik scroll
                    if (scroll) this.htmlObject.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                else
                    if (this.htmlObject.parentElement === document.body) {
                        globs.selectionManager.clear();
                    }


                dragStartX = e.clientX;
                dragStartY = e.clientY;
                const onMove = mv => {
                    const dx = Math.abs(mv.clientX - dragStartX);
                    const dy = Math.abs(mv.clientY - dragStartY);
                    if (dx + dy > this.dragThreshold) {
                        // native dragstart tetikle
                        this.#onDragStart(mv);
                        cleanup();
                    }
                };
                const cleanup = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", cleanup);
                };
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", cleanup);



            });

            // deselect olaylarını dinle
            globs.selectionManager.addEventListener('change', ({ detail }) => {
                if (detail.action === 'deselect' && detail.item === this) {
                    if (this.selectOptions.deselectClass) {
                        this.htmlObject.classList.add(this.selectOptions.deselectClass);
                    }
                    this.htmlObject.classList.remove(this.selectOptions.selectClass);
                    this.selectOptions.onDeselect?.call(this);
                }
            });


            this.children = [];
            children.forEach(ch => this.appendChild(ch));
            if (parent) (parent instanceof Telement ? parent.appendChild(this) : parent.appendChild(html));

            // Enum bağlamaları
            EelementStatus.bindTo('status', this);
            Eborder.bindTo('resizeOptions.borders', this);
            this.resizeOptions.borders = resizeOptions.borders;
            if (status instanceof Object) this.status.assign(status);
            else this.status = status;
            this.status.onchange = ch => this.#handleStatusChange(ch);

            // Rect özelliği
            this.defineProp('rect',
                () => new Trect(...Object.values(html.getBoundingClientRect())),
                rc => Object.assign(html.style, {
                    left: `${rc.left}px`, top: `${rc.top}px`,
                    width: `${rc.width}px`, height: `${rc.height}px`
                })
            );

            // Başlangıç işlemleri
            this.#injectStyles();

            if (this.status.selectable) {
                this.htmlObject.classList.add('selectable');
            } 

            // Kopyalama için başlangıç durumu
            this.#initOpts = safeCloneOptions(opts);

            this.#initialKeys = new Set(Object.getOwnPropertyNames(this));

            const defaultHist = { trackStyle: false, trackResize: false, trackChildren: false, trackAttr: false, trackEvents: false };
            this.historyOptions = { ...defaultHist, ...historyOptions };
           this[_ctorArgs] = [ tagOrEl ].concat(Object.keys(opts).length ? [ opts ] : []);
  
        }


        #enableMove() {
            if (this.#moveHandlers) return;
            const h = this.moveOptions.handle;
            if (!(h instanceof HTMLElement)) return;

            let boundRect = null;
            if (this.moveOptions.bound === true) {
                boundRect = new DOMRect(
                    0,
                    0,
                    document.documentElement.clientWidth,
                    document.documentElement.clientHeight
                );
            } else if (this.moveOptions.bound instanceof HTMLElement) {
                const r = this.moveOptions.bound.getBoundingClientRect();
                boundRect = new DOMRect(r.left, r.top, r.width, r.height);
            } else if (this.moveOptions.bound instanceof DOMRect) {
                boundRect = this.moveOptions.bound;
            }

            const onDown = e => {
                if (e.button !== 0) return;
                e.preventDefault();
                if (INTERACTION_STATE.get(this.htmlObject)) return;
                INTERACTION_STATE.set(this.htmlObject, 'moving');

                const startX = e.clientX, startY = e.clientY;
                const origLeft = parseInt(getComputedStyle(this.htmlObject).left, 10) || 0;
                const origTop = parseInt(getComputedStyle(this.htmlObject).top, 10) || 0;

                this.moveOptions.onMoveStart?.call(this, e);

                const onMove = ev => {
                    let newLeft = origLeft + (ev.clientX - startX);
                    let newTop = origTop + (ev.clientY - startY);

                    // Bound kontrolü:
                    if (boundRect) {
                        // Yatay sınır
                        newLeft = Math.max(boundRect.x,
                            Math.min(boundRect.x + boundRect.width - this.htmlObject.offsetWidth,
                                newLeft));
                        // Dikey sınır
                        newTop = Math.max(boundRect.y,
                            Math.min(boundRect.y + boundRect.height - this.htmlObject.offsetHeight,
                                newTop));
                    }

                    if (this.moveOptions.xable) this.htmlObject.style.left = `${newLeft}px`;
                    if (this.moveOptions.yable) this.htmlObject.style.top = `${newTop}px`;

                    this.moveOptions.onMove?.call(this, ev);
                    if (this.#hybridDrag) this.#updatePlaceholder(ev);
                };

                const onUp = ev => {
                    onMove.unBindEvent(document, 'pointermove');
                    onUp.unBindEvent(document, 'pointerup');
                    INTERACTION_STATE.delete(this.htmlObject);
                    this.moveOptions.onDrop?.call(this, { x: ev.clientX, y: ev.clientY });
                    if (this.#hybridDrag) {
                        const targetContainer = this.#findDropTarget({ x: ev.clientX, y: ev.clientY });
                        this.#performDrop(targetContainer);
                    }

                }
                onMove.bindToEvent(document, 'pointermove', this);
                onUp.bindToEvent(document, 'pointerup', this);
            };

            onDown.bindToEvent(h, 'pointerdown', this);
            this.#moveHandlers = { onDown };
        }

        #disableMove() {
            if (!this.#moveHandlers) return;
            const h = this.moveOptions.handle;
            this.#moveHandlers.onDown.unBindEvent(h, 'pointerdown');
            this.#moveHandlers = null;
        }
        // --- Yardımcı Metotlar ---
        #refreshDragListeners() {
            this.#disableDrag();
            if (!this.#hybridDrag && this.status?.draggable) this.#enableDrag();
        }

        #updateHybridFlag() {
            this.#hybridDrag = (
                this.moveOptions.handle === this.dragOptions.handle &&
                this.status.movable &&
                this.status.draggable
            );
        }

        #injectStyles() {
            if (Telementstyles) return;
            const styles = `
            .telement:focus { outline: 2px solid #0078d4; outline-offset: 1px; }
            .dragging { opacity: 0.4; }
            .inside-drag-handle { cursor: grab; user-select: none; margin-right: 4px; }
            .selectable:hover { background-color: rgba(0, 102, 255, 0.08);cursor: pointer;}
            .selected {border: 2px solid #0066FF;box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.5);}
            .selectable.selected {border-color: #004bb5;box-shadow: 0 0 0 2px rgba(0, 75, 181, 0.7);}
            .selectable:not(.selected) {transition: background-color 0.2s, border-color 0.2s;}
            body:not(.design-mode) .selected:hover {background-color: transparent;}
            .selectable:focus {outline: none;border: 2px dashed rgba(0, 102, 255, 0.7);}
            .disabled { opacity: 0.5; pointer-events: none; }
            .locked { pointer-events: none; }
            .hidden { display: none !important; }
            .droppable-hover { background-color: rgba(0, 120, 212, 0.05); }
            .dockable:empty { border: 2px dotted #0078d4 !important; }
            .dock-highlight { outline: 2px dashed #0078d4 !important; background-color: rgba(0, 120, 212, 0.1) !important; }
        `;
            DOM.addStyle(styles);
            Telementstyles = true;
        }

        // --- Sürükleme/Bırakma Mantığı ---
        #findDropTarget(pt) {
            let draggedArr;
            draggedArr = globs.selectionManager.selection;
            if (draggedArr.length === 0 && this.status.draggable) {
                draggedArr = [this];
            }
            draggedArr.forEach(te => te.htmlObject.style.pointerEvents = 'none');
            let el = document.elementFromPoint(pt.x, pt.y);
            draggedArr.forEach(te => te.htmlObject.style.pointerEvents = '');

            while (el && el !== document.body) {
                if (el.classList?.contains('drop-placeholder')) {
                    el = el.parentElement;
                    continue;
                }
                const te = el.owner;
                if (te) {
                    if (draggedArr.some(d => d === te || d.htmlObject.contains(el))) {
                        el = el.parentElement;
                        continue;
                    }
                    if (te.status?.dockable) return te;
                }
                el = el.parentElement;
            }
            return null;
        }

        #updatePlaceholder(e) {
            if (!DOM.dragPlaceHolder) {
                DOM.dragPlaceHolder = Object.assign(document.createElement('div'), {
                    className: 'drop-placeholder',
                    style: 'position:absolute;height:4px;width:40px;background:#0078d4;border-radius:2px;pointer-events:none;z-index:9999;display:none'
                });
                document.body.appendChild(DOM.dragPlaceHolder);
            }

            const ph = DOM.dragPlaceHolder;
            ph.style.display = 'none';
            ph.referenceElement = null;

            if (this._lastHighlighted) {
                this._lastHighlighted.classList.remove('dock-highlight');
                this._lastHighlighted = null;
            }

            const pt = { x: e.clientX, y: e.clientY };
            const root = this.#findDropTarget(pt);
            if (!root) return;

            root.htmlObject.classList.add('dock-highlight');
            this._lastHighlighted = root.htmlObject;

            if (root.children.length > 0) {
                let vertical = root.children.length > 1
                    ? Math.abs(root.children[0].htmlObject.getBoundingClientRect().top -
                        root.children[1].htmlObject.getBoundingClientRect().top) >
                    Math.abs(root.children[0].htmlObject.getBoundingClientRect().left -
                        root.children[1].htmlObject.getBoundingClientRect().left)
                    : true;

                let bestIdx = -1, bestDist = 1e9, place = 'before';
                root.children.forEach((c, i) => {
                    if (globs.selectionManager.has(c)) return;
                    const r = c.htmlObject.getBoundingClientRect();
                    const dist = vertical
                        ? Math.abs(pt.y - (r.top + r.height / 2))
                        : Math.abs(pt.x - (r.left + r.width / 2));

                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                        place = vertical
                            ? (pt.y < r.top + r.height / 2 ? 'before' : 'after')
                            : (pt.x < r.left + r.width / 2 ? 'before' : 'after');
                    }
                });

                if (bestIdx === -1) return;
                root.htmlObject.classList.remove('dock-highlight');

                const refChild = root.children[bestIdx];
                const refRect = refChild.htmlObject.getBoundingClientRect();
                ph.referenceElement = refChild.htmlObject;
                ph.placement = place;

                const scrollX = window.scrollX;
                const scrollY = window.scrollY;
                if (vertical) {
                    Object.assign(ph.style, {
                        width: `${refRect.width}px`,
                        height: '2px',
                        left: `${refRect.left + scrollX}px`,
                        top: `${(place === 'before' ? refRect.top : refRect.bottom) + scrollY}px`
                    });
                } else {
                    Object.assign(ph.style, {
                        width: '2px',
                        height: `${refRect.height}px`,
                        top: `${refRect.top + scrollY}px`,
                        left: `${(place === 'before' ? refRect.left : refRect.right) + scrollX}px`
                    });
                }
                ph.style.display = '';
            }
        }
        #updateDropVisuals(e) {
            // 1. Önceki görsel ipuçlarını temizle
            if (this.#lastDropTarget) {
                this.#lastDropTarget.htmlObject.classList.remove('dock-highlight');
            }
            if (DOM.dragPlaceHolder) {
                DOM.dragPlaceHolder.style.display = 'none';
            }
            this.#lastDropTarget = null;

            // 2. Geçerli bırakma hedefini (root) bul
            let root = null;
            if (e.type === 'dragover') {
                // Standart sürüklemede, olay hedefi zaten dockable alandır.
                root = this;
            } else { // Hibrit (pointermove)
                // Hibrit taşımada, farenin altındaki hedefi aramamız gerekir.
                root = this.#findDropTarget({ x: e.clientX, y: e.clientY });
            }

            // Geçerli bir hedef yoksa veya hedef dockable değilse çık
            if (!root || !root.status.dockable) return;

            // 3. Görsel ipuçlarını göster
            this.#lastDropTarget = root; // Yeni hedefi kaydet
            const targetEl = root.htmlObject;
            const children = root.children.filter(c => !globs.selectionManager.has(c)); // Sürüklenenleri hariç tut

            // Eğer hedefte (sürüklenenler hariç) çocuk yoksa, sadece alanı vurgula
            if (children.length === 0) {
                targetEl.classList.add('dock-highlight');
                return;
            }

            // Hedefte çocuklar varsa, aralarına placeholder koy
            const pt = { x: e.clientX, y: e.clientY };
            let vertical = true; // Dizilimin yönünü belirle
            if (children.length > 1) {
                const r0 = children[0].htmlObject.getBoundingClientRect();
                const r1 = children[1].htmlObject.getBoundingClientRect();
                vertical = Math.abs(r0.top - r1.top) > Math.abs(r0.left - r1.left);
            }

            // Fareye en yakın çocuğu ve konumu bul
            let bestMatch = { dist: Infinity, el: null, place: 'before' };
            for (const child of children) {
                const r = child.htmlObject.getBoundingClientRect();
                const dist = vertical ? Math.abs(pt.y - (r.top + r.height / 2)) : Math.abs(pt.x - (r.left + r.width / 2));
                if (dist < bestMatch.dist) {
                    bestMatch.dist = dist;
                    bestMatch.el = child.htmlObject;
                    const center = vertical ? r.top + r.height / 2 : r.left + r.width / 2;
                    const pointerPos = vertical ? pt.y : pt.x;
                    bestMatch.place = pointerPos < center ? 'before' : 'after';
                }
            }

            // Placeholder'ı oluştur ve konumlandır
            const ph = DOM.getDragPlaceholder();
            const refRect = bestMatch.el.getBoundingClientRect();
            ph.referenceElement = bestMatch.el; // Referans ve konumu sakla
            ph.placement = bestMatch.place;

            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            if (vertical) {
                Object.assign(ph.style, {
                    width: `${refRect.width}px`, height: '2px',
                    left: `${refRect.left + scrollX}px`,
                    top: `${(bestMatch.place === 'before' ? refRect.top : refRect.bottom) + scrollY}px`
                });
            } else {
                Object.assign(ph.style, {
                    width: '2px', height: `${refRect.height}px`,
                    top: `${refRect.top + scrollY}px`,
                    left: `${(bestMatch.place === 'before' ? refRect.left : refRect.right) + scrollX}px`
                });
            }
            ph.style.display = 'block';
        }
        // --- Olay Yönetimi ---
        #onDragStart(e) {
            e.stopPropagation();
            if (!e.dataTransfer) {
                // modern tarayıcılarda DataTransfer constructor’ı var
                e.dataTransfer = new DataTransfer();
            }
            this.#dragState = { isDropped: false };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.id); // Tarayıcı uyumluluğu için

            // Sürükleme başladığında orijinali gizle

            setTimeout(() => { this.htmlObject.style.visibility = 'hidden'; console.log("hideHtml"); }, 0);
        }

        #onDragEnd(e) {
            this.htmlObject.style.visibility = 'visible';
            if (!this.#dragState.isDropped && this.dragOptions.revertIfNotDropped) {
                // Revert logic here
            }
            if (this.#lastDropTarget) { this.#lastDropTarget.htmlObject.classList.remove('dock-highlight'); this.#lastDropTarget = null; }
            DOM.dragPlaceHolder && (DOM.dragPlaceHolder.style.display = 'none');
            console.log("drageend");
        }

        #onDrop(e) {
            e.preventDefault();
            e.stopPropagation();
            this.#performDrop(this);
        }
        #isDragAcceptable(e) {
            // Tip ve grup kontrolleri...
            return true;
        }
        #enableDrag() {
            if (this.#dragHandlers || this.#hybridDrag) return;
            const h = this.dragOptions.handle;
            if (!(h instanceof HTMLElement)) return;

            this.htmlObject.setAttribute('draggable', 'true');
            this.#dragHandlers = {
                dragstart: e => this.#onDragStart(e),
                dragend: e => this.#onDragEnd(e)
            };
            this.#dragHandlers.dragstart.bindToEvent(h, 'dragstart');
            this.#dragHandlers.dragend.bindToEvent(h, 'dragend');

        }
        #disableDrag() {
            if (!this.#dragHandlers) return;
            const h = this.dragOptions.handle;
            this.#dragHandlers.dragstart.unBindEvent(h, 'dragstart');
            this.#dragHandlers.dragend.unBindEvent(h, 'dragend');
            this.#dragHandlers = null;
            this.htmlObject.setAttribute('draggable', 'false');
        }


        #onDragEnter(e) {
            e.preventDefault(); e.stopPropagation();
            if (!this.#isDragAcceptable(e)) return;
            this.htmlObject.classList.add(this.dropOptions.hoverClass);
            if (this.dropOptions.showPlaceHolder) this.#updatePlaceholder(e);
        }
        #onDragOver(e) {
            e.preventDefault();
            e.stopPropagation();
            this.#updateDropVisuals(e); // Merkezi yöneticiyi çağır
        }

        #onDragLeave(e) {
            e.preventDefault();
            // Only hide indicators if the mouse leaves the container element entirely.
            if (!this.htmlObject.contains(e.relatedTarget)) {
                this.htmlObject.classList.remove(this.dropOptions.hoverClass);
                if (DOM.dragPlaceHolder) {
                    DOM.dragPlaceHolder.style.display = 'none';
                }
                // Clear any highlighted drop target
                if (this._lastHighlighted) {
                    this._lastHighlighted.classList.remove('dock-highlight');
                    this._lastHighlighted = null;
                }
            }
        }
        #enableSizing(isOn) {
            DOM.makeResizable?.(
                this.htmlObject,
                this.status.sizable
                    ? {
                        flags: this.resizeOptions.flags,
                        useHelper: this.resizeOptions.useHelper,
                        minWidth: this.resizeOptions.minWidth,
                        maxWidth: this.resizeOptions.maxWidth,
                        minHeight: this.resizeOptions.minHeight,
                        maxHeight: this.resizeOptions.maxHeight
                    }
                    : false
            );
        }
        #enableDrop() {
            if (this.#dropHandlers) return;
            this.#dropHandlers = {
                dragenter: e => this.#onDragEnter(e),
                dragover: e => this.#onDragOver(e),
                dragleave: e => this.#onDragLeave(e),
                drop: e => this.#onDrop(e),
            };
            Object.entries(this.#dropHandlers).forEach(([evt, h]) => h.bindToEvent(this.htmlObject, evt, this));
        }

        #disableDrop() {
            if (!this.#dropHandlers) return;
            Object.entries(this.#dropHandlers).forEach(([evt, h]) => h.unBindEvent(this.htmlObject, evt));
            this.#dropHandlers = null;
        }
        #performDrop(targetContainer) {
            if (!targetContainer) return;
            let dragged = globs.selectionManager.selection;
            if (dragged.length === 0) {
                dragged = [this];
            }

            const ph = DOM.dragPlaceHolder;
            let targetParentTelement;
            let nextSiblingTelement;

            if (ph && ph.style.display !== 'none' && ph.referenceElement) {
                const refOwner = ph.referenceElement.owner;
                targetParentTelement = refOwner.parent;
                nextSiblingTelement = ph.placement === 'before' ? refOwner : (refOwner.htmlObject.nextSibling?.owner ?? null);
            } else {
                targetParentTelement = targetContainer;
                nextSiblingTelement = null;
            }

            if (!targetParentTelement) return;

            const targetParentHtml = targetParentTelement.htmlObject;
            const nextSiblingHtml = nextSiblingTelement ? nextSiblingTelement.htmlObject : null;

            dragged.forEach(el => {
                // Elementi DOM'da yeni pozisyonuna taşı.
                targetParentHtml.insertBefore(el.htmlObject, nextSiblingHtml);
                el.#dragState.isDropped = true;
            });

        }

        // --- Özellik Yönetimi ---
        #toggleFeature(flag, isOn) {
            if (flag === 'draggable' || flag === 'movable') this.#updateHybridFlag();
            this.htmlObject.classList.toggle(flag, isOn);

            switch (flag) {
                case 'draggable':
                    if (this.#hybridDrag || !isOn) this.#disableDrag();
                    else this.#enableDrag();
                    break;
                case 'movable': {
                    if (isOn && this.#hybridDrag) this.#disableDrag();
                    const onMoveStart = () => {
                        if (this.#hybridDrag) {
                            globs.selectionManager.clear();
                            globs.selectionManager.select(this);
                            this.#dragState = { isDropped: false };
                        }
                    };
                    if (isOn) this.#enableMove();
                    else this.#disableMove();
                    break;
                }
                case 'dockable': isOn ? this.#enableDrop() : this.#disableDrop(); break;
                case 'sizable': this.#enableSizing(isOn); break;
                case 'visible': this.htmlObject.classList.toggle('hidden', !isOn); break;
                case 'selectable': this.htmlObject.classList.toggle('selectable', isOn); break;
            }
        }

        #handleStatusChange(changes) {
            if (changes.disable || changes.lockable) {
                const flag = changes.disable ? 'disable' : 'lockable';
                this.#toggleFeature(flag, true);
                ['sizable', 'movable', 'draggable', 'dockable', 'scrollable', 'selectable'].forEach(s => {
                    if (this.status[s]) this.status[s] = false;
                });
                return;
            }
            for (const [flag, value] of Object.entries(changes)) {
                this.#toggleFeature(flag, value);
            }
        }
        #handleHybridDrop(pt) {
            const targetContainer = this.#findDropTarget(pt);
            this.#performDrop(targetContainer);
        }
        // --- Genel Metotlar ---
        body() {
            if (this.loaded) return;
            if (!this.htmlObject.parentElement) document.body.appendChild(this.htmlObject);
            this.children.forEach(child => child.body(this.htmlObject));
            if (!Telement._$firstLoad) {
                document.addEventListener('mousedown', (e) => {
                    globs.selectionManager.clear();
                });
            }
            Telement._$firstLoad = true;
            this.dispatchEvent(new CustomEvent('load'));
            this.moveOptions.handle = this.moveOptions.handle;
            this.dragOptions.handle = this.dragOptions.handle;
            const sts = Number(this.status);
            this.status = 0;
            this.status = sts;
            this.loaded = true;
        }

        copy() {
            const LOCAL_SKIP = ["parent", "children", "htmlObject", "status", "resize_flags", "history", "#initialKeys", "#initOpts", "eventList"];
            const tag = this.htmlObject.tagName.toLowerCase();
            const { children: _initChildren, ...cloneOpts } = this.#initOpts;
            const opts = { ...cloneOpts, id: undefined };
            const clone = new Telement(tag, opts);

            Object.getOwnPropertyNames(this).forEach(k => {
                if (this.#initialKeys.has(k) || LOCAL_SKIP.includes(k) ||
                    k.startsWith("_") || k.startsWith("#")) return;
                const v = this[k];
                if (v instanceof Telement || v instanceof EventTarget) return;
                clone[k] = deepCopy(v, LOCAL_SKIP);
            });

            // HTML kopyalama
            const src = this.htmlObject;
            const dst = clone.htmlObject;

            Array.from(src.attributes).forEach(a =>
                a.name !== 'id' && dst.setAttribute(a.name, a.value));
            dst.style.cssText = src.style.cssText;
            src.classList.forEach(cls => dst.classList.add(cls));

            const srcT = this;
            const dstT = clone;

            // srcT.htmlObject'ten dinleyicileri alıyoruz
            const map = getEventMap(srcT.htmlObject);

            for (const [type, list] of map) {
                for (const rec of list) {
                    const L = rec.listener;
                    if (dst.eventList.hasSameListener(type, L)) continue; // kendi duplicate filtresi

                    const wrapper = getFnById(rec.id);          // id → kod

                    if (wrapper?._meta?.original) {
                        const orig = wrapper._meta.original;
                        const args = wrapper._meta.args || [];
                        const objId = wrapper._meta.objId ?? -1;

                        let targetCtx = null;
                        if (objId !== -1) {
                            targetCtx = AllClass.byId[objId] || AllClass.byOrder[objId];
                        }

                        orig.bindToEvent(el, type, targetCtx, ...args);
                    } else {
                        dstT.bind(type, L, rec.options);
                    }

                }
            }

            // Çocuklar
            this.children.forEach(ch => clone.appendChild(ch.copy?.() || deepCopy(ch, LOCAL_SKIP)));
            Array.from(this.htmlObject.childNodes)
                .filter(node => !node.owner)
                .forEach(node => clone.htmlObject.appendChild(deepCopy(node, LOCAL_SKIP)));

            // Durumlar
            clone.status = Number(this.status);
            clone.resize_flags = Number(this.resize_flags);
            if (this.loaded) clone.body();

            return clone;
        }
        clientRect() {
            const r = this.htmlObject.getBoundingClientRect();
            return new Trect(
                r.left + this.htmlObject.clientLeft + window.scrollX,
                r.top + this.htmlObject.clientTop + window.scrollY,
                this.htmlObject.clientWidth,
                this.htmlObject.clientHeight
            );
        }
        prevCss() {
            this.htmlObject.style.cssText = this.htmlObject._prevCss || "";
        }
        nextCss = function () {
            if (this.htmlObject._nextCss)
                this.htmlObject.style.cssText = this.htmlObject._nextCss;
        }
        isVisible() {
            if (!this.visible) return false;
            if (this.parent) return this.parent.isVisible();
            return true;
        }
        bind(eventName, handler, options = {}, ...boundArgs) {
            const el = this.htmlObject;
            const map = getEventMap(el);
            const list = map.get(eventName) || [];

            /* zaten ekli mi? -------------------------------------------------- */
            if (list.some(rec =>
                rec.listener === handler ||                 // doğrudan wrapper verilmiş olabilir
                rec.listener?._meta?.original === handler)) // orijinal fn
            {
                return handler;
            }

            const wrapper = (e, ...rt) => {
                const res = handler.call(this, e, ...boundArgs, ...rt);
                if (res === false) { e.preventDefault(); e.stopPropagation(); }
                return res;
            };

            /* 🔹  META EKLE 🔹 */
            wrapper._meta = {
                original: handler,      // ← kopya sırasında lazım
                args: boundArgs,    // ← varsa ek arg.
                objId: this.id ?? -1 // ← isteğe bağlı (target context)
            };

            el.addEventListener(eventName, wrapper, options);
            return handler;
        }
        /* ------------------------------------------------------------------ */
        /*  unbind(eventName [, handler])                                     */
        /*  - handler verilmezse: o event tipindeki TÜM dinleyicileri siler   */
        /*  - handler varsa        : sadece eşleşeni siler                    */
        /* ------------------------------------------------------------------ */
        unbind(eventName, handler) {
            const el = this.htmlObject;
            const map = getEventMap(el);
            if (!map.has(eventName)) return;

            /* --- tümünü sil -------------------------------------------------- */
            if (typeof handler !== 'function') {
                for (const rec of map.get(eventName)) {
                    el.removeEventListener(eventName, rec.listener, rec.options);
                }
                /* removeEventListener override’ı Map’i boşaltacağı için
                   buradan ayrıca delete etmeye gerek yok – ama zararı da yok */
                return;
            }

            /* --- tekini sil -------------------------------------------------- */
            const list = map.get(eventName);
            for (const rec of [...list]) {                       // kopya üzerinde döngü
                const same =
                    rec.listener === handler ||                     // wrapper referansı
                    rec.listener?._meta?.original === handler;      // orijinal fonk.

                if (same) {
                    el.removeEventListener(eventName, rec.listener, rec.options);
                    break;                                          // ilk eşleşme yeterli
                }
            }
        }
        // --- Diğer Genel Metotlar ---
        appendChild(child) {
            if (!(child instanceof Telement)) {
                if (typeof child === 'string' || typeof child === 'number') {
                    child = document.createTextNode(child);
                }
                this.htmlObject.appendChild(child);
                return;
            }
            if (child.parent) child.parent.removeChild(child);
            this.children.push(child);
            child.parent = this;
            this.htmlObject.appendChild(child.htmlObject);
            child.htmlObject.owner = child;
        }
        removeChild(child) {
            if (!(child instanceof Telement)) {
                this.htmlObject.removeChild(child);
                return;
            }

            // Standart çıkarma
            let idx = this.children.indexOf(child);
            if (idx > -1) this.children.splice(idx, 1);
            if (this.htmlObject && child.htmlObject)
                this.htmlObject.removeChild(child.htmlObject);
            child.parent = null;
        }
        destroy() {
            if (this.#dockingHandlers) this.#disableDrop();
            if (this.status) this.status.onchange = null;
            this.children.forEach(child => child.destroy?.());
            if (this.sizeHistory) globs.resizeObserver.unobserve(this.htmlObject);
            if (this.styleHistory) globs.styleObserver.unobserve(this.htmlObject);
            this.htmlObject?.parentNode?.removeChild(this.htmlObject);
            this.htmlObject.owner = null;
            this.dispatchEvent(new CustomEvent('destroy'));
        }
        html(content) {
            if (typeof content === 'undefined') {
                return this.htmlObject.innerHTML;
            } else {
                this.htmlObject.innerHTML = content;
            }
        }

        
        // now `opts` can include multi, silent, scrollIntoView,onSelect, cssClass, animate, filter…
        select(opts = {}) {
            globs.selectionManager.select(this, opts);
        };
        deselect({ silent = false } = {}) {
            globs.selectionManager.deselect(this, { silent });
        };
        get isSelected() {
            return globs.selectionManager.has(this);
        }
        get hybridDrag() { return this.#hybridDrag; }
        get visible() { return this.status.visible; }
        set visible(val) { this.status.visible = val; }
    }
    let needupdate = true;
    function ensureSelectionOverlay(root) {
        let selection = root.mainLayers.selection?.htmlObject.querySelector('#descendant-bbox-selection');
        if (!selection) {
            selection = document.createElement('div');
            selection.id = 'descendant-bbox-selection';
            Object.assign(selection.style, {
                position: 'absolute',
                pointerEvents: 'none',
                border: '2px dashed #2196f3',
                zIndex: 9999,
                display: 'none'
            });
            root.mainLayers.selection?.htmlObject.appendChild(selection);
        }
        return selection;
    }
    function drawSelectionOverlay(rootLayer) {
        const selectedLayers = rootLayer.selection();
        const selection = ensureSelectionOverlay(rootLayer);
        if (selectedLayers.length < 2) { selection.style.display = "none"; return; }
        selection.style.display = "";
        // Tüm seçili layer’ların DOM’daki boundingRect’lerini topla
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedLayers.forEach(layer => {
            const rect = layer.htmlObject.getBoundingClientRect();
            if (rect.left < minX) minX = rect.left;
            if (rect.top < minY) minY = rect.top;
            if (rect.right > maxX) maxX = rect.right;
            if (rect.bottom > maxY) maxY = rect.bottom;
        });

        // (rootLayer.mainLayers.overlay veya uygun kapsayıcıya overlay’i yerleştir)

        Object.assign(selection.style, {
            left: (minX - rootLayer.htmlObject.getBoundingClientRect().left) + "px",
            top: (minY - rootLayer.htmlObject.getBoundingClientRect().top) + "px",
            width: (maxX - minX) + "px",
            height: (maxY - minY) + "px",
            display: ""
        });
    }

    function removeSelectionselection() {
        let selection = document.getElementById('descendant-bbox-selection');
        if (selection) selection.remove();
    }
    Tlayer = class Tlayer extends Telement {
        #changeListeners = [];



        /**
         * Katman (Layer) nesnesi oluşturur.
         * @param {string|HTMLElement} tagOrEl   - Oluşturulacak HTML tag adı (örn: 'div') veya hazır bir HTMLElement.
         * @param {Object} options
         *   @param {string}   [options.id]          - Katmana özel id (boşsa otomatik atanır)
         *   @param {Object}   [options.style]       - CSS stilleri ({zIndex:2, background:'red'})
         *   @param {Object}   [options.attrs]       - Ekstra attribute’lar ({'data-x':'abc'})
         *   @param {Object}   [options.layerName]       - layer adı
         *   @param {boolean}   [options.createSubLayers] - Alt katmanlar otomatik olarak oluşturulacak mı?
         *   @param {Object}   [options.subLayerNames]       - alt katmanların layerNames
         *   @param {Object}   [options.status]      - Katman durum/flag’ları (örn: {visible:true, lockable:false})
         *   @param {Object}   [options.events]      - Olaylar (örn: {click: fn})
         *   @param {Array}    [options.children]    - İlk eklenecek alt katmanlar (Telement/Tlayer/HTMLElement)
         *   @param {Tlayer|HTMLElement} [options.parent] - Hangi üst katmana (veya DOM'a) otomatik eklenecek
         */
        constructor(tagOrEl = 'div', options = {}) {
            super(tagOrEl, options);
            this.htmlObject.dataset.layer = this.id;
            this.mainLayers = [];
            this.#changeListeners = [];
            if (options.layerName) {
                this.layerName = options.layerName || this.name;
                this.htmlObject.classList.add(options.layerName);
            }
            // Parent otomatik ekleme
            if (options.parent) {
                if (options.parent instanceof Tlayer) {
                    options.parent.appendChild(this);
                } else if (options.parent instanceof HTMLElement) {
                    options.parent.appendChild(this.htmlObject);
                }
            }
            // children parametresi (Telement veya Tlayer array'i)
            if (options.children && Array.isArray(options.children)) {
                for (let c of options.children) this.appendChild(c);
            }
            // SubLayer otomatik oluşturulacaksa
            if (options.createSubLayers || options.subLayerNames) {
                this.createSubLayers(options.subLayerNames || Olayers);
            }
            this.htmlObject.style.pointerEvents = "auto";
        }

        // --- Değişiklik dinleyicisi ekle
        addChangeListener(listener) { this.#changeListeners.push(listener); }

        // --- Değişiklikleri bildir
        _notifyChange(type, info) {
            if (!needupdate) return;
            this.#changeListeners.forEach(fn => fn(type, info, this));
            if (this.parent && typeof this.parent._notifyChange === "function") {
                this.parent._notifyChange(type, info);
            }
            // (İsterseniz parent'a yayılım eklenebilir)
        }

        // --- Katman statik mi?
        get isStatic() {
            const pos = getComputedStyle(this.htmlObject).position;
            return pos === 'static' || !pos;
        }

        // --- zIndex getter/setter
        get zIndex() {
            return this.isStatic ? 0 : (+this.htmlObject.style.zIndex || 1);
        }
        set zIndex(v) {
            if (!this.isStatic) this.htmlObject.style.zIndex = v;
            this.parent?.reflowZ();
        }

        // --- Seçili mi?



        // --- Dinamik ve statik alt katmanlar
        #dynamicChildren() { return this.children.filter(l => l instanceof Tlayer && !l.isStatic); }
        #staticChildren() { return this.children.filter(l => l instanceof Tlayer && l.isStatic); }
        getRoot() {
            let node = this;
            while (node.parent) node = node.parent;
            return node;
        }
        // --- zIndex’leri yeniden sırala
        reflowZ() {
            const dyn = this.#dynamicChildren();
            dyn.forEach((child, i) => child.htmlObject.style.zIndex = i + 1);
            this._notifyChange('reflowZ');
        }
        createSubLayers(names = Olayers, visible = true) {
            names.forEach(name => {
                const lyr = new Tlayer('div', { layerName: name });
                lyr.htmlObject.classList.add("baseLayer");
                lyr.htmlObject.dataset.baseLayer = true;

                this.mainLayers[name] = lyr;
                lyr.status.visible = visible;
                this.appendChild(lyr);
                lyr.htmlObject.style.pointerEvents = "none";
                lyr.htmlObject.style.inset = "0";
            });
        }

        // --- DOM ve iç yapı ile birlikte ekle/çıkar
        appendChild(child) {
            super.appendChild(child);
            needupdate = false;
            if (child instanceof Tlayer && !child.isStatic) this.reflowZ();
            needupdate = true;
            this._notifyChange('appendChild', { child: child });
        }
        removeChild(child) {
            super.removeChild(child);
            needupdate = false;
            if (child instanceof Tlayer && !child.isStatic) this.reflowZ();
            needupdate = true;
            this._notifyChange('removeChild', { child: child });
        }
        addChild(baseLayerName, layer) {
            if (this.mainLayers[baseLayerName]) {
                this.mainLayers[baseLayerName].appendChild(layer);
            }
        }
        // --- Araya ekleme fonksiyonları
        insertBefore(child, before) {
            if (!(child instanceof Tlayer) || !(before instanceof Tlayer)) return;
            if (child.parent) child.parent.removeChild(child);
            before.parent.htmlObject.insertBefore(child.htmlObject, before.htmlObject);
            const idx = before.parent.children.indexOf(before);
            before.parent.children.splice(idx, 0, child);
            child.parent = before.parent;
            before.parent._notifyChange('insertBefore', { child, before });
        }
        insertAfter(child, after) {
            if (!(child instanceof Tlayer) || !(after instanceof Tlayer)) return;
            if (child.parent) child.parent.removeChild(child);
            if (after.htmlObject.nextSibling) {
                after.parent.htmlObject.insertBefore(child.htmlObject, after.htmlObject.nextSibling);
            } else {
                after.parent.htmlObject.appendChild(child.htmlObject);
            }
            const idx = after.parent.children.indexOf(after);
            after.parent.children.splice(idx + 1, 0, child);
            child.parent = after.parent;
            after.parent._notifyChange('insertAfter', { child, after });
        }

        // --- Taşıma (sibling/child)
        moveTo(target, after) {
            if (!(target instanceof Tlayer)) return;
            if (this === target) return;
            if (after === undefined) {
                target.appendChild(this);
                this._notifyChange('moveTo-child', { child: this, parent: target });
            } else {
                const parent = target.parent;
                if (!parent) return;
                if (this.parent) this.parent.removeChild(this);
                const idx = parent.children.indexOf(target);
                if (after) {
                    parent.children.splice(idx + 1, 0, this);
                    parent.htmlObject.insertBefore(this.htmlObject, target.htmlObject.nextSibling);
                } else {
                    parent.children.splice(idx, 0, this);
                    parent.htmlObject.insertBefore(this.htmlObject, target.htmlObject);
                }
                this.parent = parent;
                if (!this.isStatic)
                    this.reflowZ();
                parent._notifyChange('moveTo-sibling', { child: this, target, after });
            }
        }

        // --- Kopya üret
        copyTo(target, after) {
            if (!(target instanceof Tlayer)) return;

            const clone = this.copy();
            if (after === undefined) {
                target.appendChild(clone);
            } else {
                const parent = target.parent;
                if (!parent) return;

                if (after) {
                    parent.insertAfter(clone, target);
                } else {
                    parent.insertBefore(clone, target);
                }
            }
            (clone.parent || target)._notifyChange('copyTo', { original: this, clone, target, after });

            return clone;
        }

        // --- Pozisyon fonksiyonları
        setPosition(x, y) {
            this.htmlObject.style.left = `${x}px`;
            this.htmlObject.style.top = `${y}px`;
        }
        getPosition() {
            return {
                x: parseInt(this.htmlObject.style.left) || 0,
                y: parseInt(this.htmlObject.style.top) || 0
            };
        }

        // --- Göster/gizle
        show() {
            this.status.visible = true;
            this.dispatchEvent?.(new CustomEvent('show'));
            this._notifyChange('show');
        }
        hide() {
            this.status.visible = false;
            this.htmlObject.style.display = 'none';
            this.dispatchEvent?.(new CustomEvent('hide'));
            this._notifyChange('hide');
        }

        // --- Lock/Unlock
        lock() {
            this.status.lockable = true;
            this.htmlObject.classList.add('locked');
            this.htmlObject.style.pointerEvents = 'none';
            this.dispatchEvent?.(new CustomEvent('lock'));
            this._notifyChange('lock');
        }
        unlock() {
            this.status.lockable = false;
            this.htmlObject.classList.remove('locked');
            this.htmlObject.style.pointerEvents = '';
            this.dispatchEvent?.(new CustomEvent('unlock'));
            this._notifyChange('unlock');
        }

        // --- Seçim fonksiyonları
        selection() {
            return globs.selectionManager.selection.filter(item => {
                let p = item;
                while (p) {
                    if (p === this) return true;
                    p = p.parent;
                }
                return false;
            });
        }

        select(addToSelection = false) {
            // önce temel Telement.select()'i çalıştıralım
            super.select(addToSelection);

            // sonra kendi overlay/marquee çizim mantığımızı çağırabiliriz
            this.getRoot().drawSelectionOverlay?.(this.getRoot());
        }

        deselect() {
            // temel teardown
            super.deselect();

            // overlay güncellemesi
            this.getRoot().drawSelectionOverlay?.(this.getRoot());
        }


        bringToFront() {
            if (!this.parent) return;

            if (this.isStatic) {
                this.parent.appendChild(this);
            } else {
                const parent = this.parent;
                parent.children = parent.children.filter(c => c !== this);
                parent.children.push(this);
                const dyn = parent.#dynamicChildren();
                const max = dyn.reduce((m, l) => Math.max(m, l.zIndex), 0);
                this.zIndex = max + 1;
                parent.reflowZ();
            }

            this._notifyChange('bringToFront');
        }
        sendToBack() {
            const parent = this.parent;
            if (!parent) return false;
            if (this.isStatic) {
                parent.insertBefore(this, parent.children[0]);
            } else {
                parent.children = parent.children.filter(c => c !== this);
                parent.children.unshift(this);
                parent.reflowZ();
            }
            this._notifyChange("sendToBack");
            return true;
        }

        // --- Layer bulma
        findById(id) {
            if (this.id == id) return this;
            for (const child of this.children) {
                const found = child.findById(id);
                if (found) return found;
            }
            return null;
        }


        // --- Destroy
        destroy() {
            super.destroy();
            this.#changeListeners = [];
        }
    };

    let treeviewStyles = false;
    TtreeView = class TtreeView {
        /**
         * @param {string|HTMLElement} containerSelector - Ağacın konulacağı DOM elemanı (veya CSS selector).
         * @param {Tlayer} rootLayer - Kök Layer nesnesi (herhangi bir Tlayer instance'ı).
         */
        constructor(containerSelector, rootLayer) {
            this.container = typeof containerSelector === 'string'
                ? document.querySelector(containerSelector)
                : containerSelector;
            if (!this.container) throw new Error('TreeView container not found');

            this.treeElement = document.createElement('ul');
            this.container.setAttribute('data-treeview', 'true');
            this.container.appendChild(this.treeElement);

            this.rootLayer = rootLayer;
            this.rootLayer.addChangeListener(this.refreshTree.bind(this));

            this.#injectStyles();
            this.#setupEvents();
            this.#setupDragAndDrop();

            this.refreshTree();

            let onselectionchange = (e) => {
                let [action, item] = [e.detail.action, e.detail.item];
                this.treeElement.querySelector(`[data-id="${item.id}"]`).classList.toggle("selected", action === 'select');
            }
            globs.selectionManager.addEventListener('change', onselectionchange);
        }

        // --- Stil dosyası (lock için renk vurgusu ve selection)
        #injectStyles() {
            if (treeviewStyles) return;

            let textContent = `
      [data-treeview] ul { list-style:none; padding-left:20px; margin:0; }
      [data-treeview] li { padding:4px; cursor:pointer; position:relative; transition: background-color 0.2s; border: 1px solid transparent; }
      [data-treeview] li.selected { background:#d0eaff; border:1px solid #80bfff; }
      [data-treeview] li.locked { background: #ffebee; color: #b71c1c; opacity: 0.7; }
      [data-treeview] li.dragging { opacity: 0.5; background: #f0f0f0; }
      [data-treeview] .toggle { width:1.2em; display:inline-block; text-align:center; cursor:pointer; user-select:none; }
      [data-treeview] .expanded > .toggle::before { content:'▼'; }
      [data-treeview] .collapsed > .toggle::before { content:'►'; }
      [data-treeview] ul ul { display:none; }
      [data-treeview] .expanded > ul { display:block; }
      [data-treeview] li.drag-over { background:#e0f7fa; border:1px dashed #26c6da; }
      [data-treeview] li.drag-over-child { background:#e8f5e9; border:1px dashed #66bb6a; }
      .drag-over-above {
    border-top: 2px dashed #4CAF50;
    margin-top: 2px;
}

.drag-over-below {
    border-bottom: 2px dashed #4CAF50;
    margin-bottom: 2px;
}

.drag-over-inside {
    background-color: rgba(76, 175, 80, 0.1);
}

.drag-image {
    position: absolute;
    pointer-events: none;
    z-index: 9999;
    background: white;
    padding: 4px 8px;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transform: translate(-50%, -50%);
}

.drag-count {
    background: #2196F3;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    position: absolute;
    top: -10px;
    right: -10px;
}
    `;
            DOM.addStyle(textContent);
            treeviewStyles = true;
        }

        // --- Layer'dan <li> DOM oluşturur
        #createTreeNode(layer) {
            const li = document.createElement('li');
            li.dataset.id = layer.id;
            li.draggable = layer != this.rootLayer && !layer.htmlObject.dataset.baseLayer;

            // Toggle (expand/collapse)
            const toggle = document.createElement('span');
            toggle.className = 'toggle';

            const hasChildren = layer.children.length > 0;
            if (hasChildren) li.classList.add('expanded');


            // Etiket
            const lbl = document.createElement('span');
            lbl.className = 'label';
            lbl.textContent = layer.layerName || layer.id;

            li.append(toggle, lbl);

            if (hasChildren) li.classList.add('expanded');
            if (layer.isSelected) li.classList.add('selected');
            if (layer.status?.lockable) li.classList.add('locked');

            return li;
        }

        // --- Ağacı yeniler ve DOM'u günceller.
        refreshTree() {
            this.treeElement.textContent = '';
            const li = this.#createTreeNode(this.rootLayer);
            const sub = document.createElement('ul');
            li.appendChild(sub);
            this.treeElement.appendChild(li);
            this.#buildTree(this.rootLayer, sub);
        }

        // --- Recursive olarak Layer ağacını kurar.
        #buildTree(parentLayer, parentUl) {
            for (const layer of parentLayer.children) {
                const li = this.#createTreeNode(layer);
                const sub = document.createElement('ul');
                li.appendChild(sub);
                parentUl.appendChild(li);
                this.#buildTree(layer, sub);
            }
        }


        // --- Tıklama ile seçim ve expand/collapse işlemleri
        #setupEvents() {
            this.treeElement.addEventListener('click', e => {
                const toggle = e.target.closest('.toggle');
                const li = e.target.closest('li');
                if (!li) return;
                const layer = this.rootLayer.findById(li.dataset.id);
                if (!layer) return;

                // Sadece toggle'a tıklanırsa expand/collapse
                if (toggle) {
                    e.stopPropagation();
                    const id = li.dataset.id;
                    if (li.classList.contains('expanded')) {
                        li.classList.remove('expanded');
                        li.classList.add('collapsed');
                    } else {
                        li.classList.add('expanded');
                        li.classList.remove('collapsed');
                    }
                    return;
                }

                // Geri kalan her yerde: seçim işlemi
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    if (layer.isSelected) {
                        layer.deselect(true);    // Seçiliyse kaldır
                    } else {
                        layer.select(true);      // Çoklu seçime ekle
                    }
                } else {
                    this.rootLayer.deselect(true); // Tüm seçimleri kaldır
                    layer.select(false);           // Sadece bunu seç
                }
            });
        }

        #setupDragAndDrop() {
            let draggedItems = [];
            let dragStartX = 0;
            let dragStartY = 0;
            let dragImage = null;

            // Yardımcı fonksiyonlar
            const clearDragState = () => {
                document.querySelectorAll('.drag-source, .drag-over-above, .drag-over-below, .drag-over-inside')
                    .forEach(el => el.classList.remove(
                        'drag-source',
                        'drag-over-above',
                        'drag-over-below',
                        'drag-over-inside'
                    ));
                draggedItems = [];
                if (dragImage && document.body.contains(dragImage)) {
                    document.body.removeChild(dragImage);
                }
                dragImage = null;
            };

            const createDragImage = (count) => {
                const img = document.createElement('div');
                img.className = 'drag-image';
                img.innerHTML = `
            <div class="drag-count">${count}</div>
            <div class="drag-preview"></div>
        `;
                document.body.appendChild(img);
                return img;
            };

            // Drag start
            this.treeElement.addEventListener('dragstart', (e) => {
                const li = e.target.closest('li');
                if (!li || li.dataset.id === this.rootLayer.id) {
                    e.preventDefault();
                    return;
                }

                // Koordinatları kaydet (click vs drag ayırımı için)
                dragStartX = e.clientX;
                dragStartY = e.clientY;

                // Seçili öğeleri belirle
                const selected = this.treeElement.querySelectorAll('li.selected');
                draggedItems = Array.from(selected);

                // Tıklanan öğe seçili değilse ekle
                if (!li.classList.contains('selected') || draggedItems.length === 0) {
                    draggedItems = [li];
                }

                // Veriyi hazırla
                e.dataTransfer.setData('application/json', JSON.stringify({
                    ids: draggedItems.map(item => item.dataset.id),
                    sourceParent: li.parentElement.dataset.id || null
                }));
                e.dataTransfer.effectAllowed = 'copyMove';

                // Drag image oluştur
                dragImage = createDragImage(draggedItems.length);
                e.dataTransfer.setDragImage(dragImage, 10, 10);

                // Görsel efektler
                draggedItems.forEach(item => {
                    item.classList.add('drag-source');
                    item.style.setProperty('--drag-opacity', '0.4');
                });
            }, true); // Capture phase

            // Drag over
            this.treeElement.addEventListener('dragover', (e) => {
                e.preventDefault();
                const targetLi = e.target.closest('li');
                if (!targetLi || draggedItems.some(item => item.dataset.id === targetLi.dataset.id)) {
                    return;
                }

                const rect = targetLi.getBoundingClientRect();
                const isNearTop = e.clientY < rect.top + rect.height * 0.3;
                const isNearBottom = e.clientY > rect.top + rect.height * 0.7;

                // Önceki stilleri temizle
                document.querySelectorAll('.drag-over-above, .drag-over-below, .drag-over-inside')
                    .forEach(el => el.classList.remove(
                        'drag-over-above',
                        'drag-over-below',
                        'drag-over-inside'
                    ));

                // Yeni stilleri uygula
                if (isNearTop) {
                    targetLi.classList.add('drag-over-above');
                } else if (isNearBottom) {
                    targetLi.classList.add('drag-over-below');
                } else { targetLi.classList.add('drag-over-inside'); }

            });

            // Drop
            this.treeElement.addEventListener('drop', (e) => {
                e.preventDefault();
                const targetLi = e.target.closest('li');
                if (!targetLi || !draggedItems.length) return;

                try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    const targetLayer = this.rootLayer.findById(targetLi.dataset.id);
                    if (!targetLayer) return;

                    const rect = targetLi.getBoundingClientRect();
                    const position =
                        e.clientY < rect.top + rect.height * 0.3 ? 'before' :
                            e.clientY > rect.top + rect.height * 0.7 ? 'after' :
                                'inside';

                    // Hareket işlemi
                    data.ids.forEach(id => {
                        const draggedLayer = this.rootLayer.findById(id);
                        if (!draggedLayer || draggedLayer === targetLayer) return;

                        if (e.ctrlKey || e.metaKey) {
                            // Kopyala
                            const clone = draggedLayer.copyTo(
                                position === 'inside' ? targetLayer : targetLayer.parent,
                                position === 'after'
                            );
                            this.refreshTree();
                        } else {
                            // Taşı
                            if (position === 'inside') {
                                targetLayer.appendChild(draggedLayer);
                            } else {
                                draggedLayer.moveTo(
                                    targetLayer,
                                    position === 'after'
                                );
                            }
                        }
                    });

                    this.refreshTree();
                } catch (err) {
                    console.error('Drop error:', err);
                } finally {
                    clearDragState();
                }
            });

            // Drag end
            this.treeElement.addEventListener('dragend', () => {
                clearDragState();
            });

            // Drag leave
            this.treeElement.addEventListener('dragleave', (e) => {
                if (!e.relatedTarget || !this.treeElement.contains(e.relatedTarget)) {
                    clearDragState();
                }
            });

            // Click ile drag başlangıcını ayır
            this.treeElement.addEventListener('mousedown', (e) => {
                if (e.target.closest('li')) {
                    dragStartX = e.clientX;
                    dragStartY = e.clientY;
                }
            });

            this.treeElement.addEventListener('mouseup', (e) => {
                const li = e.target.closest('li');
                if (li && Math.abs(e.clientX - dragStartX) < 5 && Math.abs(e.clientY - dragStartY) < 5) {
                    // Click oldu, drag değil
                    clearDragState();
                }
            });
        }

    };

    /**
     * TstaticElement: Sadece statik pozisyonlu (position:static) elementler içindir.
     * Pozisyon, z-index veya align fonksiyonları desteklemez!
     * (Bu tür fonksiyonları çağırmak bir anlam ifade etmez.)
     */
    TstaticElement = class TstaticElement extends Telement {
        constructor(tagOrElement = 'div', options = {}) {
            super(tagOrElement, options);
            this.htmlObject.style.position = 'static';
        }
    }


    TpositionedElement = class TpositionedElement extends Tlayer {
        /**
         * @param {string|HTMLElement} tagOrElement - HTML tag adı veya mevcut element
         * @param {Object} options
         *   @param {string}  [options.position="absolute"]
         *   @param {string}  [options.layerName="base"] - Otomatik hangi ana katmana eklensin
         *   @param {number}  [options.left=0]
         *   @param {number}  [options.top=0]
         *   ... (Telement ve Tlayer opsiyonları)
         */
        constructor(tagOrElement = 'div', options = {}) {
            super(tagOrElement, options);
            const {
                position = "absolute",
                layerName = "base",
                left = 0,
                top = 0,
            } = options;
            this.layerName = layerName;
            // Mevcut bir HTMLElement ise, mevcut style'ı ezmemeye dikkat!
            const style = this.htmlObject.style;
            if (!style.position) style.position = position;
            if (!style.left) style.left = typeof left === "number" ? `${left}px` : left;
            if (!style.top) style.top = typeof top === "number" ? `${top}px` : top;
        }

        get zIndex() { return +this.htmlObject.style.zIndex || 0; }
        set zIndex(v) { this.htmlObject.style.zIndex = v; }
        body(parent) {
            if (this.loaded) return;
            // Eğer parent parametresi verilmişse onun mainLayers'ını kontrol et
            let targetParent = parent || this.parent;
            let added = false;
            if (targetParent && targetParent.mainLayers && this.layerName) {
                let mainLayer = targetParent.mainLayers[this.layerName];
                if (mainLayer) {
                    mainLayer.appendChild(this);
                    added = true;
                }
            }
            // Global layer engine üzerinden (ör: root mainLayers)
            else if (typeof TlayerEngine !== "undefined" && TlayerEngine.instance && TlayerEngine.instance.root.mainLayers) {
                let mainLayer = TlayerEngine.instance.root.mainLayers[this.layerName];
                if (mainLayer) {
                    mainLayer.appendChild(this);
                    added = true;
                }
            }
            // Fallback: body
            if (!added) {
                document.body.appendChild(this.htmlObject);
            }

            this.loaded = true;
            this.children.forEach(child => child.body(this.htmlObject));
            this.dispatchEvent(new CustomEvent('load'));
        }

        setPosition(x, y) {
            if (x !== undefined) this.htmlObject.style.left = typeof x === "number" ? `${x}px` : x;
            if (y !== undefined) this.htmlObject.style.top = typeof y === "number" ? `${y}px` : y;
        }
        getPosition() {
            return {
                x: parseInt(this.htmlObject.style.left) || 0,
                y: parseInt(this.htmlObject.style.top) || 0
            };
        }

        alignToObjectRect(target, align = Ealign.bottom, offset = 0) {
            if (!target) return;
            Ealign.alignToObjectRect(this.htmlObject, target, align, offset);
        }

        alignToScreen(align = Ealign.center) {
            this.htmlObject.rect = Ealign.alignToRect(
                [0, 0, innerWidth, innerHeight],
                this.htmlObject.offsetWidth,
                this.htmlObject.offsetHeight,
                align
            );
        }
    }


    TabsoluteElement = class TabsoluteElement extends TpositionedElement {
        /**
         * @param {Object} options
         *   @param {HTMLElement|Telement} [options.targetElement=null] - Hangi elemana göre hizalanacak
         *   @param {number|string}       [options.align=Ealign.bottom] - Ealign flag'ı veya string (örn: left|inner)
         *   @param {number}              [options.offsetX=0] - X ekseni offseti
         *   @param {number}              [options.offsetY=0] - Y ekseni offseti
         *   @param {boolean}             [options.autoShow=false] - Otomatik olarak göster
         *   ... (TpositionedElement ve Tlayer parametreleri)
         */
        constructor({
            targetElement = null,
            align = Ealign.bottom,
            offsetX = 0,
            offsetY = 0,
            autoShow = false,
            onShow = null,
            onHide = null,
            ...options
        } = {}) {
            super("div", options);

            this.targetElement = targetElement;
            this.align = align;
            this.offsetX = offsetX;
            this.offsetY = offsetY;
            this.onShow = onShow;
            this.onHide = onHide;

            // Temel stil
            Object.assign(this.htmlObject.style, {
                position: "absolute",
                display: "none"
            });
            if (autoShow && targetElement) this.popup();
        }

        /**
         * Hedef elemana hizala ve göster (gelişmiş)
         * @param {HTMLElement|Telement} [targetElement]
         * @param {number|string}        [align]
         * @param {number}               [offsetX]
    
         */
        popup(targetElement = this.targetElement, align = this.align, offsetX = this.offsetX, offsetY = this.offsetY) {
            if (!targetElement) throw new Error("popup: targetElement gerekli!");

            this.targetElement = targetElement;
            this.align = align;
            this.offsetX = offsetX;
            this.offsetY = offsetY;

            // Henüz DOM'da değilse ana katmana veya body'ye ekle
            if (!this.htmlObject.parentElement) {
                // Layer sistemin yoksa fallback olarak body
                if (typeof TlayerEngine !== "undefined" && TlayerEngine.instance && TlayerEngine.instance.root.mainLayers) {
                    const mainLayer = TlayerEngine.instance.root.mainLayers[this.layerName];
                    if (mainLayer) mainLayer.appendChild(this);
                    else document.body.appendChild(this.htmlObject);
                } else {
                    document.body.appendChild(this.htmlObject);
                }
            }

            // Ölçüm için görünür yap
            this.htmlObject.style.display = "";
            this.htmlObject.style.visibility = "hidden";

            // Telement ise gerçek DOM alınır
            let refElement = targetElement.htmlObject || targetElement;

            // Yeni pozisyon hesapla
            Ealign.alignToObjectRect(this.htmlObject, refElement, align);

            // Offset uygula
            let left = parseInt(this.htmlObject.style.left || 0) + offsetX;
            let top = parseInt(this.htmlObject.style.top || 0) + offsetY;
            this.setPosition(left, top);

            // Görünür yap
            this.show();

            // Callback
            this.htmlObject.style.visibility = "";
            if (typeof this.onShow === "function") this.onShow();
        }

        show() {
            this.htmlObject.style.display = "";
            this.status.visible = true;
            if (typeof this.onShow === "function") this.onShow();
        }
        hide() {
            this.htmlObject.style.display = "none";
            this.status.visible = false;
            if (typeof this.onHide === "function") this.onHide();
        }

        // Ekrana sığdır (dışarı taşarsa otomatik düzelt)
        ensureOnScreen(padding = 5) {
            let r = this.htmlObject.getBoundingClientRect();
            let dx = 0, dy = 0;
            if (r.right > window.innerWidth) dx = window.innerWidth - r.right - padding;
            if (r.left < 0) dx = -r.left + padding;
            if (r.bottom > window.innerHeight) dy = window.innerHeight - r.bottom - padding;
            if (r.top < 0) dy = -r.top + padding;
            if (dx || dy) {
                let left = (parseInt(this.htmlObject.style.left) || 0) + dx;
                let top = (parseInt(this.htmlObject.style.top) || 0) + dy;
                this.setPosition(left, top);
            }
        }
    }


    Twindow = class Twindow extends TpositionedElement {
        /**
         * @param {Object} options
         * @param {string}   [options.title="Window"] - Başlık
         * @param {Array}    [options.buttons=[EcaptionButton.close]] - Caption'da gösterilecek butonlar
         * @param {number}   [options.width=400]
         * @param {number}   [options.height=300]
         * @param {number}   [options.minWidth=160]
         * @param {number}   [options.minHeight=80]
         * @param {string}   [options.layerName="windows"] - Hangi ana katmana eklensin
         * @param {boolean}  [options.showCaption=true]
         * @param {Function} [options.onClose] - Kapatma callback (return "hide"|"destroy"|"cancel")
         * @param {...}      [Telement/Tlayer seçenekleri]
         */
        constructor({
            title = "Window",
            buttons = [EcaptionButton.close],
            width = 400,
            height = 300,
            minWidth = 160,
            minHeight = 80,
            layerName = "windows",
            showCaption = true,
            onClose = null,
            ...options
        } = {}) {
            options.width = width;
            options.height = height;
            options.minWidth = minWidth;
            options.minHeight = minHeight;
            super("div", { ...options });
            this.layerName = layerName;
            this.title = title;
            this.buttons = buttons;
            this.showCaption = showCaption;
            this.onClose = onClose;

            // Style'lar (özelleştirilebilir)
            const defaultStyle = {
                width: width + "px",
                height: height + "px",
                minWidth: minWidth + "px",
                minHeight: minHeight + "px",
                zIndex: this.zIndex,
                position: "absolute",
                boxShadow: "0 6px 32px #0003,0 1.5px 3.5px #0002",
                border: "1px solid #b9b9b9",
                borderRadius: "9px",
                background: "#fff",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                left: options.left || "calc(50vw - 200px)",
                top: options.top || "calc(50vh - 130px)",
            };
            Object.assign(this.htmlObject.style, defaultStyle, options.style || {});

            // Caption (Başlık) barı
            if (showCaption) {
                this.captionBar = document.createElement("div");
                this.captionBar.className = "twindow-caption";
                this.captionBar.style.cssText = `
                display:flex;align-items:center;justify-content:space-between;
                background:linear-gradient(#ececec,#e3e8f2 90%);
                height:30px;padding:0 10px 0 12px;user-select:none;cursor:move;font-weight:bold;
                border-bottom:1px solid #c5c5c5;
            `;
                // Başlık
                const captionTitle = document.createElement("div");
                captionTitle.textContent = this.title;
                captionTitle.style.flex = "1";
                captionTitle.style.overflow = "hidden";
                captionTitle.style.whiteSpace = "nowrap";
                captionTitle.style.textOverflow = "ellipsis";
                this.captionBar.appendChild(captionTitle);

                // Butonlar
                this.captionBtns = document.createElement("div");
                for (const btn of buttons) {
                    const b = this._makeCaptionButton(btn);
                    this.captionBtns.appendChild(b);
                }
                this.captionBar.appendChild(this.captionBtns);

                this.htmlObject.appendChild(this.captionBar);
                // Drag-move
                this.moveOptions.handle = this.captionBar;
                this.status.movable = true;
            }

            // İçerik (content) bölümü
            this.contentPanel = document.createElement("div");
            this.contentPanel.className = "twindow-content";
            this.contentPanel.style.cssText = `
            flex:1 1 auto;overflow:auto;background:#fff;
            min-height:${minHeight - 30}px;
        `;
            this.htmlObject.appendChild(this.contentPanel);

            // Layer’a ekle (body fonksiyonu ile)
            // body() kendisi otomatik olarak ekler, istenirse manuel çağrılır
        }

        // Caption butonları (X, kare vb.)
        #makeCaptionButton(btnType) {
            let b = document.createElement("button");
            b.className = "twindow-btn";
            b.style.cssText = `
            width:26px;height:22px;border:none;border-radius:3px;margin-left:4px;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;
        `;
            switch (btnType) {
                case EcaptionButton.close:
                    b.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16"><line x1="3" y1="3" x2="13" y2="13" stroke="#c00" stroke-width="2"/><line x1="13" y1="3" x2="3" y2="13" stroke="#c00" stroke-width="2"/></svg>`;
                    b.title = "Kapat";
                    b.onclick = e => { e.stopPropagation(); this.close(); };
                    break;
                case EcaptionButton.maximize:
                    b.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" fill="none" stroke="#555" stroke-width="2"/></svg>`;
                    b.title = "Maksimize";
                    b.onclick = e => { /* maximize logic */ };
                    break;
                case EcaptionButton.minizime:
                    b.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16"><line x1="3" y1="13" x2="13" y2="13" stroke="#555" stroke-width="2"/></svg>`;
                    b.title = "Simge durumuna küçült";
                    b.onclick = e => { /* minimize logic */ };
                    break;
                case EcaptionButton.help:
                    b.textContent = "?";
                    b.title = "Yardım";
                    b.onclick = e => { /* help logic */ };
                    break;
                default:
                    b.textContent = btnType;
            }
            return b;
        }

        // Göster/gizle
        show() { this.status.visible = true; this.htmlObject.style.display = ''; }
        hide() { this.status.visible = false; this.htmlObject.style.display = 'none'; }

        // Kapat (destroy ya da hide, callback ile)
        close() {
            if (typeof this.onClose === "function") {
                const action = this.onClose();
                if (action === "cancel") return false;
                if (action === "hide") return this.hide();
                if (action === "destroy" || action === true) return this.destroy();
            }
            this.destroy();
        }
    }

    // Window ana katmanına eklenmiş mi? (body fonksiyonu ile entegre)

    Twidget = class Twidget extends TpositionedElement {
        /**
         * Widget temel sınıfı, basit state + event + data binding içerir.
         * @param {string|HTMLElement} tagOrElement
         * @param {Object} options
         */
        constructor(tagOrElement = "div", options = { layerName: "widget" }) {
            super(tagOrElement, options);
            this.data = options.data || {};
            this.state = options.state || {};
            // Ek event binding ve lifecycle fonksiyonları
            if (options.onCreate) options.onCreate.call(this);
        }

        setState(newState) {
            Object.assign(this.state, newState);
            if (typeof this.onStateChange === "function") this.onStateChange(this.state);
        }
        setData(newData) {
            Object.assign(this.data, newData);
            if (typeof this.onDataChange === "function") this.onDataChange(this.data);
        }
        // Event binding
        on(event, handler) {
            this.htmlObject.addEventListener(event, handler);
            return this;
        }
        off(event, handler) {
            this.htmlObject.removeEventListener(event, handler);
            return this;
        }
    }
    Tdialog = class Tdialog extends TabsoluteElement {
        /**
         * @param {Object} options
         * @param {string} [options.title]
         * @param {string|HTMLElement} [options.content]
         * @param {Array}  [options.buttons] // [{text, value, action}]
         */
        constructor({
            title = "",
            content = "",
            buttons = [],
            ...options
        } = {}) {
            super(options);
            this.htmlObject.classList.add('tdialog');
            // Caption/title
            const caption = document.createElement('div');
            caption.className = "tdialog-caption";
            caption.textContent = title;
            this.htmlObject.appendChild(caption);
            // İçerik
            const body = document.createElement('div');
            body.className = "tdialog-body";
            if (typeof content === "string") body.innerHTML = content;
            else if (content instanceof HTMLElement) body.appendChild(content);
            this.htmlObject.appendChild(body);
            // Butonlar
            const btns = document.createElement('div');
            btns.className = "tdialog-buttons";
            (buttons || []).forEach(btn => {
                const b = document.createElement('button');
                b.textContent = btn.text || btn.value || "OK";
                b.onclick = () => {
                    if (btn.action) btn.action.call(this, btn.value);
                    this.hidePopup();
                };
                btns.appendChild(b);
            });
            this.htmlObject.appendChild(btns);
        }
    }
    Tstick = class Tstick extends TabsoluteElement {
        /**
         * @param {Object} options
         * @param {HTMLElement} options.targetElement - Yapışacağı referans element
         * @param {string} [options.content]
         * @param {number} [options.align]
         * @param {number} [options.offsetX]
         * @param {number} [options.offsetY]
         */
        constructor(options = {}) {
            super(options);
            this.htmlObject.classList.add('tstick');
            if (options.content) this.htmlObject.innerHTML = options.content;
            // Scroll/resize ile sürekli pozisyonunu güncelle
            this._followHandler = () => {
                if (this.targetElement) this.popup();
            };
            window.addEventListener('scroll', this._followHandler, true);
            window.addEventListener('resize', this._followHandler, true);
        }
        destroy() {
            window.removeEventListener('scroll', this._followHandler, true);
            window.removeEventListener('resize', this._followHandler, true);
            super.destroy();
        }
    }

    TrelativeElement = class TrelativeElement extends TpositionedElement {
        /**
         * @param {Object} options
         * @param {HTMLElement} options.targetElement
         * @param {string} [options.align]
         */
        constructor(options = {}) {
            super("div", options);
            this.targetElement = options.targetElement;
            this.align = options.align || Ealign.bottom;
            this.htmlObject.classList.add('trelative-element');
            this.updatePosition();
            // Hedef hareket ederse pozisyonu güncelle
            this._updateHandler = () => this.updatePosition();
            window.addEventListener('resize', this._updateHandler, true);
            window.addEventListener('scroll', this._updateHandler, true);
        }
        updatePosition() {
            if (!this.targetElement) return;
            this.alignToObjectRect(this.targetElement, this.align);
        }
        destroy() {
            window.removeEventListener('resize', this._updateHandler, true);
            window.removeEventListener('scroll', this._updateHandler, true);
            super.destroy();
        }
    }



    // Varsayımlar: EwindowStatus, EcaptionButton ve TabsoluteElement daha önce tanımlı.



    function controlAtPos(x, y, findobj, compobj) {
        x = x || mouse.x;
        y = y || mouse.y;
        var compobj = compobj || null;
        var findobj = findobj || document.body;
        var rtn = {
            rect: null,
            obj: null,
            dockObj: null
        };
        function findcontrol(obj) {
            var rec, prb;
            for (var i = 0; i < obj.childNodes.length; i++) {
                if (obj.childNodes[i].nodeType == 1) {
                    prb = true;
                    if (compobj != null) {
                        prb = obj.compare(compobj);
                    }
                    rec = obj.childNodes[i].rect;
                    if (obj.childNodes[i].display != "none" && prb && rec.pointinRect(x, y)) {
                        if (obj.owner != undefined && obj.owner.dockAble != undefined && obj.owner.dockAble) {
                            rtn.dockObj = obj;
                            rtn.htmlObject = null;
                        }
                        rtn = findcontrol(obj.childNodes[i]);
                        rtn.rect = rec;
                        break;
                    }
                }
            }
            if (rtn.htmlObject == null) {
                prb = true;
                if (compobj != null) {
                    prb = obj.compare(compobj);
                }
                rec = obj.rect;
                if (obj.display != "none" && prb && rec.pointinRect(x, y)) {
                    rtn.htmlObject = obj;
                    rtn.rect = rec;
                    if (obj.owner != undefined && obj.owner.dockAble != undefined && obj.owner.dockAble)
                        rtn.dockObj = obj;
                }
            }
            return rtn;
        };
        return findcontrol(findobj);
    }
    TdragDropElement = class TdragDropElement extends Telement {
        //this.align=Tenum;
        constructor(tagname) {
            super(tagname);
            OdragMode.bindTo("dragMode", this);
            this.dockAble = false;
            this.dropAccept = true;
            this.onmdown.bindToEvent(this.htmlObject, "mousedown", this);
            this.onmmove.bindToEvent(this.htmlObject, "mousemove", this);
            this.onmup.bindToEvent(this.htmlObject, "mouseup", this);
        }
        onmdown(event) {
            var m = mouse;
            if (this.dragMode != OdragMode.none) {
                m.dragTarget = this.htmlObject;
                event.stopPropagation();
                if (this.onmousedown != undefined) {
                    this.onmousedown(event);
                }
                //document.dispatchEvent(event);
                event.stopPropagation();
                return false;
            }
        }
        onmmove(event) {
            this.htmlObject.style.cursor = "pointer";
            if (this.onmousemove != undefined) {
                this.onmousemove(event);
            }
        }

        onmup(event) {
            if (this.onmousemove != undefined) {
                this.onmouseup(event);
            }
        }
    };
    var ct_form = "application/x-www-form-urlencoded", ct_text = "text/plain", ct_html = "text/html", ct_xml = "application/xml, text/xml", ct_json = "application/json, text/javascript";
    class Tajax extends TClass {
        constructor() {
            super();
            this.url = "";
            this.htmlObject = new XMLHttpRequest();
            this.xml = true;
            this.method = "GET";
            this.params = "";
            this.username = "";
            this.password = "";
            this.async = true;
            this.contentType = ct_form;
        }
        open() {
            var urlx = this.url;
            if (this.method == "GET")
                urlx = urlx + "?" + this.params;
            this.htmlObject.open(this.method, urlx, this.async, this.username, this.password);
            if (this.htmlObject.overrideMimeType)
                this.htmlObject.overrideMimeType("application/x-www-form-urlencoded"/*
																				 * +';
																				 * charset=utf-8'
																				 */);
            this.htmlObject.setRequestHeader('Content-Type', "application/x-www-form-urlencoded");
            if (this.method == "POST") {
                this.htmlObject.send(this.params);
            } else
                this.htmlObject.send();
            var o = this;
            this.htmlObject.onreadystatechange = function () {
                if (o.htmlObject.readyState == 4 && o.htmlObject.status == 200) {
                    o.result = o.htmlObject.responseText;
                    if (o.onresponse)
                        o.onresponse(o.htmlObject.responseText, o.htmlObject.responseXML);
                }
            };
        }
    };
    function Txmlparser(xml) {
        this.xml = "";
        if (window.DOMParser) {
            parser = new DOMParser();
            this.xmlDoc = parser.parseFromString(xml, "text/xml");
        }
        else // Internet Explorer
        {
            this.xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            this.xmlDoc.async = false;
            this.xmlDoc.loadXML(xml);
        }
    }
    Txmlparser.prototype =
    {
        forEach: function (tagName, func) {
            var elem = this.xmlDoc.getElementsByTagName(tagName);
            if (elem) {
                for (var i = 0; i < elem.length; i++) {
                    func(i, elem[i]);
                }
            }
        },
        text: function (elem) {
            for (var i = 0; i < elem.childNodes.length; i++) {
                if (elem.childNodes[i].nodeType == 3)
                    return elem.childNodes[i].nodeValue;
            }
        }
    };

    /**
     * Belirtilen sınıfa ait örnekleri, sınıf hiyerarşisine göre arar.
     * @param {Object} cname - Sınıf nesnesi (ör. Telement).
     * @param {boolean} [searchInParents=false] - Üst sınıflarda da arama yapılsın mı?
     * @returns {Array|boolean} - Bulunan nesneler dizisi veya bulunamazsa false.
     */
    classToObjects = (cname, searchInParents = false) => {
        const names = [];
        const instances = [];

        // Kayıtlarda gezilerek alt nesneleri arama fonksiyonu.
        const findSubInstances = (collection, searchSub) => {
            for (const key in collection) {
                if (Object.hasOwn(collection, key)) {
                    if (isNaN(key)) {
                        if (searchSub) findSubInstances(collection[key], searchSub);
                    } else {
                        instances.push(collection[key]);
                    }
                }
            }
        };

        let protoChain = cname;
        names.unshift(protoChain.name);
        while (protoChain) {
            const pp = Object.getPrototypeOf(protoChain);
            if (pp && pp.name && pp.name !== "Object") {
                names.unshift(pp.name);
                protoChain = pp;
            } else {
                break;
            }
        }

        let registry = AllClass.byClass;
        for (const className of names) {
            if (registry[className]) {
                registry = registry[className];
            } else {
                return false;
            }
        }

        findSubInstances(registry, searchInParents);
        return instances;
    };

    /**
     * ID ile nesne arama fonksiyonu.
     * @param {number} id - Aranacak nesnenin benzersiz ID'si.
     * @returns {Object|null} - Bulunan nesne veya bulunamazsa null.
     */
    getObjectById = (id) => {
        return AllClass.byId[id] || null;
    };

    /**
     * Bölgesel (locale) ayarlarını yükleyen fonksiyon.
     * IP tabanlı ülke bilgisini kullanır ve ilgili format ayarlarını yapılandırır.
     *
     * **Not:** Bu fonksiyonun çalışması için sisteminizde Tajax ve loadJSON gibi tanımlamaların mevcut olması gerekir.
     */
    let _locate;
    Intl.locate = function (loc) {
        if (loc) {
            if (!_locate) {
                const aj = new Tajax();
                aj.url = "http://ip-api.com/json";
                aj.method = "GET";
                aj.open();
                aj.onresponse = (t) => {
                    _locate = {};
                    Object.assign(_locate, JSON.parse(t));
                    // Ülke koduna göre yeniden çağır.
                    Intl.locate(_locate.countryCode);
                };
            } else {
                const locale = new Intl.Locale(loc);
                let formattedNumber = String(Intl.NumberFormat(loc).format(1111.1));
                let decimalSeparator = formattedNumber.charAt(1);
                decimalSeparator = decimalSeparator === "1" ? "" : decimalSeparator;
                const groupSeparator = decimalSeparator === "" ? formattedNumber.charAt(4) : formattedNumber.charAt(5);

                _locate.numberFormat = {
                    numberingSystem: locale.numberingSystems?.[0],
                    decimalSeparator,
                    groupSeparator,
                    ...Intl.NumberFormat(loc).resolvedOptions(),
                };

                /*  loadJSON("../files/jsons/currencymap.json").then((data) => {
                      for (const key in data) {
                          if (data[key].locale === _locate.numberFormat.locale.replace("-", "_")) {
                              _locate.currencyFormat = data[key];
                              break;
                          }
                      }
                  });*/

                _locate.dateFormat = { ...Intl.DateTimeFormat(loc).resolvedOptions() };
            }
        } else {
            return _locate;
        }
    };

    // Sayfa yüklendiğinde çalıştırılacak fonksiyon.
    // Locale ayarları yapılıyor ve Telement sınıfına ait örneklerin body metodu çağrılıyor.
    const onLoadFunction = () => {
        Intl.locate(navigator.language);
        // Tüm otomatik eklenmesi gerekenleri sırayla body() ile DOM'a kat.
        for (let el of AllClass.byOrder) {
            if (typeof el.body === "function" && !el.loaded) {
                el.body();
            }
        }

        window.removeEventListener("load", onLoadFunction);
    };
    window.addEventListener("load", onLoadFunction);

})();
(() => {
    var mouse = new EventTarget();
    mouse.assign({
        button: 0,
        dx: -1,
        dy: -1,
        dcx: -1,
        dcy: -1,
        x: -1,
        y: -1,
        cx: -1,
        cy: -1,
        target: null,
        dragTarget: null,
        startDrag: false,
        onstart: null,
        onstopdrag: null,
        autoDrag: true,
        drop: { target: null, accept: false, rect: null, dockObj: null, css: "", x: -1, y: -1 },
        capture: function (obj) {
            if (!obj) { this.captureObject = null; return false } else
                if (this.captureObject) {
                    return false;
                } else {
                    const evnt = new CustomEvent("capture", { bubbles: true, cancelable: true, detail: obj })
                    if (mouse.dispatchEvent(evnt)) { this.captureObject = obj; return true; }
                }

        }
    }, true);
    mouse.defineProp("cursor", () => document.body.style.cursor, (v) => document.body.style.cursor = v);
    Obutton.bindTo("button", mouse);

    function wonmdown(event) {
        var m = mouse;
        m.button = event.button;
        m.dx = event.screenX;
        m.dy = event.screenY;
        m.event = event;
    };
    wonmdown.bindToEvent(document, "mousedown");
    function wonmmove(event) {
        var m = mouse;
        var fndobj = null;
        var it, ik, ns, fs, ss, rtn;
        rtn = true;
        m.event = event;
        m.x = event.screenX;
        m.y = event.screenY;
        m.cx = event.clientX;
        m.cy = event.clientY;

        if (m.captureObject) {
            m.captureObject.dispatchEvent(new CustomEvent('mousemove', { detail: { capture: true } }));
            event.stopPropagation();
            if (event.target != m.captureObject)
                event.preventDefault();
            /*  if (m.oldTarget != event.target) {
                if (m.oldTarget)
                  m.oldTarget.style.cursor = m.oldCursor;
                m.oldTarget = event.target;
                m.oldCursor = event.target.style.cursor;
                event.target.style.cursor = m.captureCursor;
            }*/
        } else
            if (m.button == Obutton.left) {
                if (m.dragTarget != null) {
                    frkx = m.dx - event.screenX;
                    frky = m.dy - event.screenY;
                    if (m.dragTarget != null && (Math.abs(frkx) > 3 || Math.abs(frky) > 3)) {
                        if (window.onstartdrag != undefined) {
                            m.startDrag = window.onstartdrag(m.target);
                        }
                        else
                            m.startDrag = true;
                    }
                    if (m.startDrag) {
                        DOM.ghost.htmlObject.style.display = "";
                        DOM.ghost.htmlObject.alignToObjectRect(m.dragTarget, Ealign.client, true);
                        with (window.pointer.htmlObject.style) {
                            if (display != "")
                                display = "";
                            left = event.pageX + "px";
                            top = event.pageY + "px";
                        };
                        DOM.ghost.htmlObject.style.left = event.pageX - DOM.ghost.htmlObject.offsetWidth / 2 + "px";
                        DOM.ghost.htmlObject.style.top = event.pageY - DOM.ghost.htmlObject.offsetHeight / 2 + "px";
                        ik = classToObjects(TDragDropElement);
                        for (var i = 0; i < ik.length; i++) {
                            it = ik[i];
                            if (it.dockAble) {
                                fndobj = controlAtPos(event.pageX, event.pageY, it.htmlObject, { NOTid: "spareSpan" });
                                if (fndobj.htmlObject && fndobj.dockObj) {
                                    if (fndobj.dockObj.owner.dropAccept && (window.ondrag == undefined || (dwindow.ondrag != undefined && window.ondrag(m.dragTarget, fndobj.dockObj)))) {
                                        with (window.pointer.htmlObject.style) {
                                            mouse.cursor = "none";
                                            if (m.dragTarget.dragMode == OdragMode.transfer)
                                                backgroundimage = "url('../../files/images/ortak/dragmovecursor.png')";
                                            else
                                                backgroundimage = "url('../../files/images/ortak/dragcursor.png')";
                                        };
                                        ss = (event.pageX - fndobj.rect.left) < fndobj.rect.width / 2;
                                        fs = m.drop.target != fndobj.htmlObject || ((m.x - m.drop.rect.left) < m.drop.rect.width / 2) != ss;
                                        m.drop.accept = true;
                                        if (fs) {
                                            if (window.spareSpan.htmlObject.parentNode != null)
                                                window.spareSpan.htmlObject.parentNode.removeChild(window.spareSpan.htmlObject);
                                            if (ss && fndobj.htmlObject != fndobj.dockObj) {
                                                // fndobj.dockObj.removeChild(window.spareSpan.htmlObject);
                                                fndobj.dockObj.insertBefore(window.spareSpan.htmlObject, fndobj.htmlObject);
                                            }
                                            else {
                                                ns = fndobj.htmlObject.nextSibling;
                                                if (ns == null || fndobj.htmlObject == fndobj.dockObj)
                                                    fndobj.dockObj.appendChild(window.spareSpan.htmlObject);
                                                else {
                                                    fndobj.dockObj.insertBefore(window.spareSpan.htmlObject, ns);
                                                }
                                            }
                                            window.spareSpan.htmlObject.style.display = "";
                                        }
                                        if (m.drop.dockObj != fndobj.dockObj) {
                                            if (m.drop.dockObj != null)
                                                m.drop.dockObj.style.cssText = m.drop.css;
                                            if (mouse.autoDrag) {
                                                m.drop.dockObj = fndobj.dockObj;
                                                m.drop.css = fndobj.dockObj.style.cssText;
                                                m.drop.dockObj.style.borderColor = "blue";
                                                m.drop.dockObj.style.backgroundColor = "#ffbbee";
                                            }
                                        }
                                        m.drop.target = fndobj.htmlObject;
                                        m.drop.rect = fndobj.rect;
                                        break;
                                    } else {
                                        mouse.cursor = "none";
                                        window.pointer.htmlObject.style.backgroundimage = "url('../../files/images/ortak/dragnotcursor.png')";
                                    }
                                }
                            }
                        }
                        if (fndobj != null && fndobj.dockObj == null) {
                            if (m.drop.dockObj != null)
                                m.drop.dockObj.style.cssText = m.drop.css;
                            m.drop.target = null;
                            m.drop.dockObj = null;
                            if (m.dragTarget.owner.dragMode == OdragMode.transfer) {
                                mouse.cursor = "none";
                                window.pointer.htmlObject.style.backgroundimage = "url('../../files/images/ortak/dragremovecursor.png')";
                            } else {
                                mouse.cursor = "none";
                                window.pointer.htmlObject.style.backgroundimage = "url('../../files/images/ortak/dragnotcursor.png')";
                            }
                        } else {
                            // mouse.cursor="none";
                            // window.pointer.htmlObject.style.backgroundImage="url('../../files/images/ortak/dragnotcursor.png')";
                        }
                    }
                }
            }

        // return rtn;
    };
    wonmmove.bindToEvent(document, "mousemove");
    function wonmup(event) {
        var m = mouse;
        m.dx = -1;
        m.dy = -1;
        m.dcx = -1;
        m.dcy = -1;
        accept = true;
        if (m.captureObject) {
            m.captureObject.dispatchEvent(new CustomEvent('mouseup', { detail: { capture: true } }));
            event.stopPropagation();
            if (event.target != m.captureObject)
                event.preventDefault();
        } else {
            if (m.dockObj != null) {
                m.drop.dockObj.style.cssText = m.drop.css;
            }
            if (mouse.startDrag) {
                if (mouse.autoDrag) {
                    var obj = null;
                    if (m.dragTarget.owner.dragMode == OdragMode.copy) {
                        obj = m.dragTarget.owner.copy().htmlObject;
                    } else
                        obj = m.dragTarget;
                    if (window.onstopdrag)
                        accept = window.onstopdrag(obj);
                    if (accept && m.drop.accept) {
                        if (m.dragTarget.owner.dragMode == OdragMode.transfer) {
                            m.dragTarget.parentNode.removeChild(m.dragTarget);
                        }
                        if (m.dragTarget.owner.dragMode == OdragMode.transfer || m.dragTarget.owner.dragMode == OdragMode.copy) {
                            if (m.drop.dockObj)
                                m.drop.dockObj.insertBefore(obj, window.spareSpan.htmlObject);
                        }
                    }
                }
                DOM.ghost.htmlObject.style.display = "none";
                window.spareSpan.htmlObject.style.display = "none";
                window.pointer.htmlObject.style.display = "none";
                mouse.cursor = "auto";
                m.drop.assign({ target: null, rect: null, dockObj: null, css: "", x: -1, y: -1 });
            }
            m.dragTarget = null;
            m.target = null;
            m.x = -1;
            mouse.startDrag = false;
            mouse.button = -1;
        }
    };
    wonmup.bindToEvent(document, "mouseup");
    let _styleEl = null;
    window.DOM = {
        modaldiv: document.createElement("DiV"),
        timers: new Array(),
        // Veriler % olarak girilecek
        disableSelection: function (target) {
            if (typeof target.onselectstart != undefined) // iE route
                target.onselectstart = function () {
                    return false;
                };
            else if (typeof target.style.MozUserSelect != undefined) // Firefox route
                target.style.MozUserSelect = "none";
            else
                // All other route (ie: Opera)
                target.onmousedown = function () {
                    return false;
                };
            target.style.cursor = "default";
        },
        head: document.head,
        path: window.location.href,
        addStyle: function (cssText) {
            if (!_styleEl) {
                _styleEl = document.createElement('style');
                document.head.appendChild(_styleEl);
            }
            _styleEl.appendChild(document.createTextNode(cssText));
            return _styleEl;
        },
        addMeta: function (attributes) {
            const meta = document.createElement('meta');
            for (const key in attributes) {
                meta.setAttribute(key, attributes[key]);
            }
            document.head.appendChild(meta);
            return meta;
        },
        addLink: function (attributes) {
            const link = document.createElement('link');
            for (const key in attributes) {
                link.setAttribute(key, attributes[key]);
            }
            document.head.appendChild(link);
            return link;
        },
        addScript: function (pathOrOptions) {
            if (typeof pathOrOptions === 'string') {
                if (!document.querySelector(`script[src='${pathOrOptions}']`)) {
                    const script = document.createElement('script');
                    script.src = pathOrOptions;
                    document.head.appendChild(script);
                    return script;
                }
                return null;
            } else {
                const { src = null, inlineContent = '', attributes = {} } = pathOrOptions;
                if (src && document.querySelector(`script[src='${src}']`)) return null;
                const script = document.createElement('script');
                if (src) script.src = src;
                if (inlineContent) script.appendChild(document.createTextNode(inlineContent));
                for (const key in attributes) {
                    script.setAttribute(key, attributes[key]);
                }
                document.head.appendChild(script);
                return script;
            }
        },
        setTitle: function (text) {
            let title = document.head.querySelector('title');
            if (!title) {
                title = document.createElement('title');
                document.head.appendChild(title);
            }
            title.textContent = text;
            return title;
        },
        addStyleSheet: function (path) {
            let link = document.createElement('link');
            link.href = path;
            link.type = 'text/css';
            link.rel = 'stylesheet';
            link.media = 'screen,print';
            document.head.appendChild(link);
            return link;
        },
        getUpPath: function (currentPath = null, levels = 1) {
            const fullUrl = currentPath
                ? new URL(currentPath, window.location.origin).href
                : window.location.href;
            const url = new URL(fullUrl);
            let pathname = url.pathname;
            const parts = pathname.split('/').filter(p => p !== '');
            levels = Math.floor(Math.abs(levels));
            if (levels >= parts.length) {
                pathname = '/';
            } else {
                pathname = '/' + parts.slice(0, -levels).join('/') + '/';
            }
            return url.origin + pathname;
        }
    }

    DOM.addStyleSheet(
        DOM.getUpPath(null, 2) + "files/css/dom.css"

    );
    DOM.head.innerHTML += " #d3d {background-image:" + "url(" + DOM.getUpPath(null, 2) + "/files/images/ortak/gradienObutton.png);background-repeat:repeat-x;background-size:auto 100%;};";
    DOM.ghost = new Telement("DiV"),
        DOM.spareSpan = new Telement("SPAN"),
        DOM.pointer = new Telement("DiV"),
        DOM.disableScreen = new Telement("DiV"),
        DOM.dialogBox = new TabsoluteElement("DiV", "dlgBox"),
        DOM.scrollBox = new TabsoluteElement("DiV", "scrollBox"),
        DOM.designMode = false;

    DOM.selectedElements = new Set();
    DOM.selectionRectangle = document.createElement('div');
    DOM.resizeHelpers = [];
    DOM.getDragPlaceholder = () => {
        if (!DOM.dragPlaceHolder) {
            DOM.dragPlaceHolder = document.createElement('div');
            DOM.dragPlaceHolder.className = 'drop-placeholder';
            // Diğer stiller...
            document.body.appendChild(DOM.dragPlaceHolder);
        }
        return DOM.dragPlaceHolder;
    };

    // Initialize selection rectangle

    // Helper function to create resize handles
    function createResizeHandle(direction) {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${direction}`;
        handle.dataset.direction = direction;
        handle.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: #0066FF;
        border: 1px solid white;
        z-index: 10000;
        pointer-events: all;
    `;

        // Set cursor based on direction
        const cursors = {
            'nw': 'nwse-resize', 'n': 'ns-resize', 'ne': 'nesw-resize',
            'e': 'ew-resize', 'se': 'nwse-resize', 's': 'ns-resize',
            'sw': 'nesw-resize', 'w': 'ew-resize'
        };
        handle.style.cursor = cursors[direction];

        return handle;
    }

    // Update selection rectangle and resize helpers
    DOM.updateSelectionVisuals = function () {
        if (DOM.selectedElements.size === 0) {
            DOM.selectionRectangle.style.display = 'none';
            DOM.clearResizeHelpers();
            return;
        }

        // Calculate bounding box of all selected elements
        let minLeft = Infinity, minTop = Infinity;
        let maxRight = -Infinity, maxBottom = -Infinity;

        DOM.selectedElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            minLeft = Math.min(minLeft, rect.left);
            minTop = Math.min(minTop, rect.top);
            maxRight = Math.max(maxRight, rect.right);
            maxBottom = Math.max(maxBottom, rect.bottom);
        });

        // Position selection rectangle
        DOM.selectionRectangle.style.left = `${minLeft + window.scrollX}px`;
        DOM.selectionRectangle.style.top = `${minTop + window.scrollY}px`;
        DOM.selectionRectangle.style.width = `${maxRight - minLeft}px`;
        DOM.selectionRectangle.style.height = `${maxBottom - minTop}px`;
        DOM.selectionRectangle.style.display = 'block';

        // Add resize handles in design mode
        if (DOM.designMode) {
            DOM.clearResizeHelpers();

            // Only add handles if all selected elements are resizable
            let allResizable = true;
            DOM.selectedElements.forEach(el => {
                if (!(el.owner?.status?.sizable)) {
                    allResizable = false;
                }
            });

            if (allResizable && DOM.selectedElements.size > 0) {
                const directions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
                directions.forEach(dir => {
                    const handle = createResizeHandle(dir);
                    DOM.resizeHelpers.push(handle);
                    document.body.appendChild(handle);

                    // Position handle
                    const handleSize = 8;
                    let left, top;

                    switch (dir) {
                        case 'nw': left = minLeft; top = minTop; break;
                        case 'n': left = minLeft + (maxRight - minLeft) / 2 - handleSize / 2; top = minTop; break;
                        case 'ne': left = maxRight - handleSize; top = minTop; break;
                        case 'e': left = maxRight - handleSize; top = minTop + (maxBottom - minTop) / 2 - handleSize / 2; break;
                        case 'se': left = maxRight - handleSize; top = maxBottom - handleSize; break;
                        case 's': left = minLeft + (maxRight - minLeft) / 2 - handleSize / 2; top = maxBottom - handleSize; break;
                        case 'sw': left = minLeft; top = maxBottom - handleSize; break;
                        case 'w': left = minLeft; top = minTop + (maxBottom - minTop) / 2 - handleSize / 2; break;
                    }

                    handle.style.left = `${left + window.scrollX}px`;
                    handle.style.top = `${top + window.scrollY}px`;

                    // Add drag behavior
                    handle.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const startX = e.clientX;
                        const startY = e.clientY;

                        const startWidth = maxRight - minLeft;
                        const startHeight = maxBottom - minTop;
                        const startLeft = minLeft;
                        const startTop = minTop;

                        const moveHandler = (e) => {
                            const dx = e.clientX - startX;
                            const dy = e.clientY - startY;

                            // Calculate new dimensions based on handle direction
                            let newLeft = startLeft;
                            let newTop = startTop;
                            let newWidth = startWidth;
                            let newHeight = startHeight;

                            if (dir.includes('n')) {
                                newHeight -= dy;
                                newTop += dy;
                            }
                            if (dir.includes('s')) {
                                newHeight += dy;
                            }
                            if (dir.includes('e')) {
                                newWidth += dx;
                            }
                            if (dir.includes('w')) {
                                newWidth -= dx;
                                newLeft += dx;
                            }

                            // Apply changes to all selected elements
                            const scaleX = newWidth / startWidth;
                            const scaleY = newHeight / startHeight;
                            const offsetX = newLeft - startLeft;
                            const offsetY = newTop - startTop;

                            DOM.selectedElements.forEach(el => {
                                const elRect = el.getBoundingClientRect();
                                const elLeft = elRect.left - minLeft;
                                const elTop = elRect.top - minTop;

                                // Calculate new position and size
                                const newElLeft = newLeft + elLeft * scaleX;
                                const newElTop = newTop + elTop * scaleY;
                                const newElWidth = elRect.width * scaleX;
                                const newElHeight = elRect.height * scaleY;

                                // Apply changes
                                el.style.left = `${newElLeft}px`;
                                el.style.top = `${newElTop}px`;
                                el.style.width = `${newElWidth}px`;
                                el.style.height = `${newElHeight}px`;
                            });

                            // Update selection rectangle
                            DOM.updateSelectionVisuals();
                        };

                        const upHandler = () => {
                            document.removeEventListener('mousemove', moveHandler);
                            document.removeEventListener('mouseup', upHandler);
                        };

                        document.addEventListener('mousemove', moveHandler);
                        document.addEventListener('mouseup', upHandler);
                    });
                });
            }
        }
    };

    DOM.clearResizeHelpers = function () {
        DOM.resizeHelpers.forEach(handle => {
            if (handle.parentNode) {
                handle.parentNode.removeChild(handle);
            }
        });
        DOM.resizeHelpers = [];
    };

    // Toggle design mode
    DOM.setDesignMode = function (enabled) {
        DOM.designMode = enabled;

        if (enabled) {
            // Enable design mode behaviors
            document.addEventListener('click', DOM.handleDesignClick);
            document.addEventListener('mousedown', DOM.handleDesignDragStart);
            document.addEventListener('mousemove', DOM.handleDesignDrag);
            document.addEventListener('mouseup', DOM.handleDesignDragEnd);

            // Show selection for any already selected elements
            DOM.updateSelectionVisuals();
        } else {
            // Disable design mode behaviors
            document.removeEventListener('click', DOM.handleDesignClick);
            document.removeEventListener('mousedown', DOM.handleDesignDragStart);
            document.removeEventListener('mousemove', DOM.handleDesignDrag);
            document.removeEventListener('mouseup', DOM.handleDesignDragEnd);

            // Clear selection visuals
            DOM.selectedElements.clear();
            DOM.updateSelectionVisuals();
        }
    };

    // Design mode click handler - select elements
    DOM.handleDesignClick = function (e) {
        if (e.target.classList.contains('resize-handle')) return;

        const element = e.target.closest('[data-layer]');
        if (!element) {
            // Clicked outside any layer - clear selection
            DOM.selectedElements.clear();
            DOM.updateSelectionVisuals();
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            // Add/remove from selection
            if (DOM.selectedElements.has(element)) {
                DOM.selectedElements.delete(element);
            } else {
                DOM.selectedElements.add(element);
            }
        } else {
            // Single selection
            DOM.selectedElements.clear();
            DOM.selectedElements.add(element);
        }

        DOM.updateSelectionVisuals();
    };

    // Design mode drag handlers - move multiple elements
    let dragStartX, dragStartY;
    let initialPositions = new Map();

    DOM.handleDesignDragStart = function (e) {
        if (e.target.classList.contains('resize-handle') ||
            !DOM.designMode ||
            DOM.selectedElements.size === 0) {
            return;
        }

        const element = e.target.closest('[data-layer]');
        if (!element || !DOM.selectedElements.has(element)) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        dragStartX = e.clientX;
        dragStartY = e.clientY;

        // Store initial positions of all selected elements
        initialPositions.clear();
        DOM.selectedElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            initialPositions.set(el, {
                left: rect.left,
                top: rect.top
            });
        });

        document.addEventListener('mousemove', DOM.handleDesignDrag);
        document.addEventListener('mouseup', DOM.handleDesignDragEnd);
    };

    DOM.handleDesignDrag = function (e) {
        if (!dragStartX || !dragStartY || initialPositions.size === 0) return;

        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        DOM.selectedElements.forEach(el => {
            const initial = initialPositions.get(el);
            el.style.left = `${initial.left + dx}px`;
            el.style.top = `${initial.top + dy}px`;
        });

        DOM.updateSelectionVisuals();
    };

    DOM.handleDesignDragEnd = function () {
        dragStartX = null;
        dragStartY = null;
        initialPositions.clear();

        document.removeEventListener('mousemove', DOM.handleDesignDrag);
        document.removeEventListener('mouseup', DOM.handleDesignDragEnd);
    };
    const INTERACTION_STATE = new WeakMap();
    DOM.makeResizable = function (el, options) {
        const map = getEventMap(el);                       // WeakMap<Element, Map>

        if (map) {
            for (const [type, list] of map) {
                if (type !== 'mousemove' && type !== 'mousedown') continue;
                for (const rec of [...list]) {                 // kopya üzerinden döngü
                    if (rec.listener && rec.listener._isResizeHandler) {
                        el.removeEventListener(type, rec.listener, rec.options);
                    }
                }
            }
        }

        // Eğer options yoksa (sizable false), cursor’u kaldır ve çık
        if (!options) {
            el.style.cursor = '';
            return;
        }

        // Ayarları ayıkla
        const {
            borders,      // Eborder bitmask: hangi kenarlardan resize edilecek
            useHelper,    // (isteğe bağlı, eklenecekse helper çizim mantığı)
            minWidth, maxWidth,
            minHeight, maxHeight
        } = options;

        // Kenar bitmask’ini kontrol eden fonksiyon
        function hasBorder(flag) {
            return ((borders & flag) === flag) ||
                (borders === Eborder.all && flag !== 0);
        }

        // Fare pozisyonuna göre hangi kenardan resize yapılacağını bulur
        function hitZone(x, y, w, h) {
            const th = 7; // eşik (px)
            if (hasBorder(Eborder.leftTop) && x < th && y < th) return 'nw';
            if (hasBorder(Eborder.rightTop) && x > w - th && y < th) return 'ne';
            if (hasBorder(Eborder.leftBottom) && x < th && y > h - th) return 'sw';
            if (hasBorder(Eborder.rightBottom) && x > w - th && y > h - th) return 'se';
            if (hasBorder(Eborder.top) && y < th) return 'n';
            if (hasBorder(Eborder.bottom) && y > h - th) return 's';
            if (hasBorder(Eborder.left) && x < th) return 'w';
            if (hasBorder(Eborder.right) && x > w - th) return 'e';
            return '';
        }

        // Fare dokununca cursor’ü güncelleyen handler
        const mouseMoveHandler = function (e) {
            const r = el.getBoundingClientRect();
            const zone = hitZone(
                e.clientX - r.left,
                e.clientY - r.top,
                r.width,
                r.height
            );
            el.style.cursor = zone ? (zone + '-resize') : '';
        };
        mouseMoveHandler._isResizeHandler = true;

        // Fare basılınca resize işlemini başlatan handler
        const mouseDownHandler = function (e) {
            const r = el.getBoundingClientRect();
            const zone = hitZone(
                e.clientX - r.left,
                e.clientY - r.top,
                r.width,
                r.height
            );
            if (!zone) return;  // kenarda değilse resize başlatılmaz

            e.preventDefault();
            e.stopPropagation();
            if (INTERACTION_STATE.get(el)) return;
            INTERACTION_STATE.set(el, 'resizing');

            // Başlangıç değerlerini al
            const start = {
                x: e.clientX, y: e.clientY,
                left: el.offsetLeft,
                top: el.offsetTop,
                width: r.width,
                height: r.height
            };

            // Fare hareket ettikçe boyut ve konum günceller
            function onDrag(ev) {
                const dx = ev.clientX - start.x;
                const dy = ev.clientY - start.y;
                let newW = start.width, newH = start.height;
                let newL = start.left, newT = start.top;

                if (zone.includes('e')) newW = start.width + dx;
                if (zone.includes('s')) newH = start.height + dy;
                if (zone.includes('w')) { newW = start.width - dx; newL = start.left + dx; }
                if (zone.includes('n')) { newH = start.height - dy; newT = start.top + dy; }

                // Min/max sınırlarını uygula
                if (newW >= minWidth && newW <= maxWidth) {
                    el.style.width = newW + 'px';
                    if (zone.includes('w')) el.style.left = newL + 'px';
                }
                if (newH >= minHeight && newH <= maxHeight) {
                    el.style.height = newH + 'px';
                    if (zone.includes('n')) el.style.top = newT + 'px';
                }
            }

            // Mouse up’da cleanup
            function onUp() {
                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mouseup', onUp);
                INTERACTION_STATE.delete(el);
            }

            // Listener’ları ekle
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', onUp, { once: true });
        };
        mouseDownHandler._isResizeHandler = true;

        // Olayları ekle
        el.addEventListener('mousemove', mouseMoveHandler);
        el.addEventListener('mousedown', mouseDownHandler);
    };

    const css = `
        [data-layer] {
            transition: box-shadow 0.2s;
        }
        [data-layer].selected {
            box-shadow: 0 0 0 2px #0066FF;
        }
        .resize-handle {
            position: absolute;
            width: 8px;
            height: 8px;
            background: #0066FF;
            border: 1px solid white;
            z-index: 10000;
        }
        .resize-handle.nw { cursor: nwse-resize; top: -4px; left: -4px; }
        .resize-handle.n { cursor: ns-resize; top: -4px; left: 50%; margin-left: -4px; }
        .resize-handle.ne { cursor: nesw-resize; top: -4px; right: -4px; }
        .resize-handle.e { cursor: ew-resize; top: 50%; right: -4px; margin-top: -4px; }
        .resize-handle.se { cursor: nwse-resize; bottom: -4px; right: -4px; }
        .resize-handle.s { cursor: ns-resize; bottom: -4px; left: 50%; margin-left: -4px; }
        .resize-handle.sw { cursor: nesw-resize; bottom: -4px; left: -4px; }
        .resize-handle.w { cursor: ew-resize; top: 50%; left: -4px; margin-top: -4px; }
                .res-handle {
        position: absolute;
        background: rgba(33, 131, 255, 0.12);
        border: 2px solid #63a8e8;
        border-radius: 3px;
        box-sizing: border-box;
        z-index: 9999;
        transition: background .2s, border-color .2s;
        pointer-events: all;
        }
        .res-handle:hover {
        background: rgba(40, 140, 255, 0.28);
        border-color: #1896ff;
        }
    `;
    DOM.addStyle(css);
    DOM.loadFuncs = [];
    document.addEventListener('DOMContentLoaded', () => { // ensure Eborder enums exist
        DOM.loadFuncs.forEach(f => f());
        for (let el of AllClass.byOrder) {
            if (typeof el.body === "function" && !el.loaded) {
                el.body();
            }
        }
    });



    with (DOM) {
        modaldiv.style.cssText = "position:fixed;left:0;z-index:10000;top:0;left:0;width:100%;height:100%;overflow:auto;background-color:rgba(0,0,0,0.5)";
        modaldiv.style.display = "none";
        modaldiv.load = false;
        modaldiv.showModalDiv = function (show, control) {

            with (modaldiv) {
                style.display = show ? "flex" : "none";
                function ev() {
                    // style.left = window.scrollX + "px";
                    //  style.top = window.scrollY + "px";
                    style.width = window.innerWidth - window.scrollX + "px";
                    style.height = window.innerHeight + "px";
                }
                if (show) {
                    cnt = control;
                    cnt.style.margin = "auto";
                    oldZindex = cnt.style.zIndex;
                    cnt.style.zIndex = 10001;
                    cnt.alignToScreen(Ealign.center + Ealign.middle)
                    ev();
                    ev.bindToEvent(window, "resize");
                    ev.bindToEvent(window, "scroll");
                    if (!load) {
                        document.body.insertBefore(DOM.modaldiv, null);
                        load = true;
                    }
                } else {
                    ev.unBindEvent(window, "resize");
                    ev.unBindEvent(window, "scroll");
                    cnt.style.zIndex = oldZindex;

                    //removeChild(firstChild);
                }
            }
            ghost.htmlObject.style.cssText = "opacity:0.5;position:absolute;background:clear;border:2px dashed #000;z-index:100;display:none";
            spareSpan.htmlObject.style.cssText = "opacity:0.5;width:5px;display:none;background:#ccccff;border:1px solid #0000ff;";
            spareSpan.htmlObject.innerHTML = "&nbsp";
            spareSpan.htmlObject.id = "spareSpan";
            pointer.htmlObject.style.cssText = "width:50px;height:50px;position:absolute;z-index:10001;display:none;background-repeat:no-repeat;background:clear";
            pointer.htmlObject.innerHTML = "&nbsp";
            pointer.htmlObject.id = "pointer";
            disableScreen.htmlObject.style.cssText = "opacity:0.7;position:absolute;z-index:10000;display:none;background:black";
            disableScreen.htmlObject.id = "disableScreen";
        }
        disableScreen.visible = function (v) {
            if (v) {
                this.htmlObject.alignToObjectRect(document.body, Ealign.client, true, true);
            }
            this.visible = v;
        };
    }
    DOM.scrollBox.body = function (parent) {
        let o, p, s = document.createElement("div");
        o = DOM.scrollBox;
        s.id = "scrollbox";
        s.className = "scrollbox";
        p = parent ? parent : document.body;
        //o.$parent.body(parent);
        o.htmlObject.style.cssText = this.htmlObject.style.cssText + "user-select: none;background-color:rgba(0,0,0,0.3);z-index:10002;";
        o.htmlObject.appendChild(s);
        o.visible = false;
        o._scrollRect = new Trect();

        p.appendChild(o.htmlObject);
        s.style.cssText = "display:none;height:12px;vertical-align:middle;cursor:default;position:relative;background-Color:rgba(255,255,255,0.8);border:1px solid;border-radius:15px;z-index:10003;";
        this._button = s;
        s._arrow1 = document.createElement("div");
        s._arrow1.innerHTML = "&#10146;";
        s._arrow1.style.cssText = "transform:rotate(180deg);transform:rotate(180deg);float:left;font-size:12px;font-weight:800;position:absolute;top:-2px;";
        s._arrow2 = document.createElement("div");
        s._arrow2.innerHTML = "&#10146;";
        s._arrow2.style.cssText = "font-size:12px;font-weight:800;float:right;position:absolute;top:-3px;";
        s.appendChild(s._arrow1);
        s.appendChild(s._arrow2);
        s.onmouseover = function () {
            if (mouse.captureObject != s)
                s.css("border", "1px outset");
        };
        s.updateScrollPos = function () {
        };
        let mx, my;
        s.onmousedown = function (event) {
            mouse.capture(s);
            mx = mouse.x;
            my = mouse.y;
            s.css("border", "1px inset");
            event.preventDefault();
            return false;
        };

        DOM.scrollBox.htmlObject.ondblclick = function (event) { DOM.scrollBox.visible = false; }
        s.onmouseup = function (event) {
            if (mouse.captureObject == s) {
                s.css("border", "1px solid");
                s._arrow1.style.display = "";
                s._arrow2.style.display = "";
                mouse.capture();
            }
        };
        let timeout;

        let scroldirect = 1;

        this.htmlObject.onmousedown = function (event) {

            if (event.target == o.htmlObject) {
                mouse.capture(o.htmlObject);
                let H = o._scrollObj.scrollHeight;
                let r = scrollAmount = H * Math.pow(H, -H / (H * 3));
                let mx1, my1;
                mx1 = event.layerX;
                my1 = event.layerY;
                if (o._scrollAlign == Ealign.right)
                    scroldirect = my1 < s.offsetTop ? -1 : 1;
                else
                    scroldirect = mx1 < s.offsetLeft ? -1 : 1;
                s.css("border", "1px inset");
                timeout = setInterval(() => {
                    if (o._scrollAlign == Ealign.right) {
                        if ((scroldirect == -1 && my1 <= s.offsetTop) || (scroldirect == 1 && my1 >= s.offsetTop + s.offsetHeight))
                            o.scrollBy(scroldirect);
                        else
                            clearInterval(timeout);
                    }
                    else {
                        if ((scroldirect == -1 && mx1 <= s.offsetLeft) || (scroldirect == 1 && mx1 >= s.offsetLeft + s.offsetWidth))
                            o.scrollBy(scroldirect);
                        else
                            clearInterval(timeout);
                    }
                }, 10);
            }

        };
        this.htmlObject.onmouseup = function (event) {
            clearInterval(timeout);
            s.css("border", "1px solid");
            s._arrow1.style.display = "";
            s._arrow2.style.display = "";
            mouse.capture(null);
        }
        this.htmlObject.onmouseleave = function (event) {
            if ((event.relatedTarget != this && !this.contains(event.relatedTarget)) && mouse.captureObject == null) {
                o.visible = false;
                // o._scrollObj.prevCss();
            }
        };
        this.scrollBy = function (step) {
            var t, p, ts, nt, r = o._scrollRect;
            t = step;
            if (o._scrollAlign == Ealign.right) {
                p = - 7 + s.offsetWidth / 2;
                if (t != 0) {
                    nt = s.offsetTop + t;
                    if (nt < p)
                        nt = p;
                    if (nt > p + r.height - s.offsetWidth)
                        nt = p + r.height - s.offsetWidth;
                    s.style.top = nt + "px";
                    ts = (nt - p) * (o._scrollObj.scrollHeight - r.height) / (r.height - s.offsetWidth);
                    o._scrollObj.scrollTop = ts;
                }
            }
            else {

                if (t != 0) {
                    nt = s.offsetLeft + t;
                    if (nt < r.left + 5)
                        s.style.left = nt + "px";
                    if (nt < 0)
                        nt = 0;
                    if (nt + s.clientWidth > r.width)
                        nt = r.width - s.clientWidth;
                    s.style.left = nt + "px";
                    ts = nt * (o._scrollObj.scrollWidth - r.width) / (r.width - s.offsetWidth);
                    o._scrollObj.scrollLeft = ts;
                }
            }
            if (t != 0) {
                s._arrow2.style.display = t > 0 ? "" : "none";
                s._arrow1.style.display = t > 0 ? "none" : "";
            }

        }

        let onedown = function (event) {

        }.bindToEvent(this.htmlObject, "mousedown", this);

        s.onmousemove = function (event) {
            if (mouse.captureObject == s) {
                if (o._scrollAlign == Ealign.right) {
                    t = mouse.y - my;
                    my = mouse.y;
                } else {
                    t = mouse.x - mx;
                    mx = mouse.x;
                }
                o.scrollBy(t);
            }
        };

        s.onmouseleave = function (event) {
            //  if (mouse.captureObject == null)
            if (mouse.captureObject != s)
                s.css("border", "1px solid");
        };
    };
    DOM.scrollBox.scrollObject = function (obj, align, innerLayout)// b=true ise bar
    {
        var o = DOM.scrollBox, mmove = function (event) {
            if (!mouse.captureObject) {
                var r;
                r = obj.rect;
                if (align == Ealign.right) {
                    r.left = r.left + (r.width - 15);
                    r.width = 15;
                } else
                    if (align == Ealign.bottom) {
                        r.top = r.top + (r.height - 15);
                        r.height = 15;
                    }
                if (r.pointinRect(event.clientX, event.clientY)) {
                    o.htmlObject.rect = r;
                    o.visible = true;
                    o.show(obj, align);
                } else {
                    if (mouse.captureObject != o._button && !(event.toElement == o._button || event.toElement == o._button._arrow1 || event.toElement == o._button._arrow2)) {

                        o.visible = false;
                    }
                }
            }
            o.innerLayout = innerLayout;
        };
        let mleave = function (event) {
            //   if( event.relatedTarget!=this.htmlObject && mouse.captureObject == null)
            //   o.hide(event.toElement);
            //   o.#target=null;
        };
        let menter = function (event, target) {
            this.target = target;
        };
        if (obj != null) {
            mmove.bindToEvent(obj, "mousemove", o, align);
            mleave.bindToEvent(obj, "mouseleave", o);
            menter.bindToEvent(obj, "mouseleave", o, obj);
        }
    };
    DOM.scrollBox.show = function (obj, align) {
        var o = DOM.scrollBox, r, s, sb, sr, sw, sbw, f = 0;

        sb = o._button;
        s = o.htmlObject;
        r = obj.rect;
        o._scrollObj = obj;
        this.align = align;
        o._scrollAlign = align;
        this.target = obj

        if ((align == Ealign.right && (sr = obj.scrollHeight - obj.offsetHeight) > 0) || (align == Ealign.bottom && (sr = obj.scrollWidth - obj.offsetWidth) > 0)) {

            if (align == Ealign.right) {
                sw = r.height;
                f = sw - sr;
                st = obj.scrollTop;
                sbw = f < 25 ? 25 : f;
                r.left = r.right - 9;
                r.top = r.top;
                // obj.css("width",parseInt(obj.offsetWidth-14)+"px");
                sb.css("transform:rotate(90deg);top:" + (st * (sw - sbw) / sr + sbw / 2 - 6) + `px;left:-${sbw / 2 - 5}px;`);
            }
            if (align == Ealign.bottom) {
                sw = r.width;
                f = sw - sr;
                st = obj.scrollLeft;
                sbw = f < 25 ? 25 : f;
                r.top = r.bottom - 14;
                r.width = r.width;
                sb.css("transform:rotate(0deg);top:0px;left:" + (st * (sw - sbw) / sr) + "px;");
            }
            o._scrollRect.assign(r, true);
            sb.css("width:" + sbw + "px;display:;");
            sb._arrow2.style.left = (sbw - 14) + "px";
        }
        DOM.scrollBox.dispatchEvent(new CustomEvent("show"));
    };

    DOM.scrollBox.scrollPos = null;
    DOM.dialogBox.body = function (parent) {
        //DOM.dialogBox.$parent.body(parent);
        DOM.dialogBox.caption = "Form";
        DOM.dialogBox.info = "";
        DOM.dialogBox.head = document.createElement("DiV");
        DOM.dialogBox.head.cssText = "height:500px;width:500;background-color:#505050;display:inline";
        DOM.dialogBox.caption = document.createElement("P");
        DOM.dialogBox.caption.innerHTML = "Form";
        DOM.dialogBox.head.appendChild(DOM.dialogBox.caption);

        DOM.dialogBox.closeButton = document.createElement("iNPUT");
        DOM.dialogBox.closeButton.type = "BUTTON";
        DOM.dialogBox.closeButton.onclick = function (cancel) {
            alert(cancel);
            if (this.DOM.dialogBox.onclose != null)
                if (this.DOM.dialogBox.onclose(cancel)) {
                    DOM.disableScreen.visible(false);
                    DOM.dialogBox.visible(false);
                }
        };
    },
        DOM.dialogBox.addButton = function (caption, func) {
            this.htmlObject.alignToObjectRect(document.body, Ealign.client, true, true);
        };
    // DOM.dialogBox.visible=function(caption,info,button)
    // {
    // };
    DOM.dialogBox.visible = function (v) {
        DOM.disableScreen.visible(v);
        if (v) {
            this.htmlObject.alignToObjectRect(DOM.disableScreen.htmlObject, Ealign.center, true, true);
            this.htmlObject.style.display = "";
        } else {
            this.htmlObject.style.display = "none";
        }
    };
    DOM.ghost.htmlObject.onmousemove = function (event) {
        // var lr = $(layoutobj).rect();
    };
    DOM.ghost.htmlObject.onmouseup = function (event) {
        var m = mouse;
        if (m.button == Obutton.left) {
            if (window.star && mouse.autoDrag) {
            }
        }
    };


    // Helper-based handles attach
    // Shared cursor map for handles and edges
    const RESIZE_CURSORS = {
        n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
        ne: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize', sw: 'nesw-resize'
    };

    /**
     * Attach visual resize handles to element based on flags.
     * @param {HTMLElement} el
     * @param {number} flags - Eborder bitmask
     */
    DOM.makeResizableWithHandles = function (el, flags) {
        // Remove old handles
        (el._resHandles || []).forEach(h => h.remove());
        el._resHandles = [];

        // Directions and flag checks
        const DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        const isActive = dir => {
            switch (dir) {
                case 'n': return Boolean(flags & Eborder.top);
                case 's': return Boolean(flags & Eborder.bottom);
                case 'e': return Boolean(flags & Eborder.right);
                case 'w': return Boolean(flags & Eborder.left);
                case 'nw': return Boolean(flags & Eborder.top) && Boolean(flags & Eborder.left);
                case 'ne': return Boolean(flags & Eborder.top) && Boolean(flags & Eborder.right);
                case 'sw': return Boolean(flags & Eborder.bottom) && Boolean(flags & Eborder.left);
                case 'se': return Boolean(flags & Eborder.bottom) && Boolean(flags & Eborder.right);
            }
        };

        const rect = () => el.getBoundingClientRect();

        DIRS.forEach(dir => {
            if (!(flags === Eborder.all || isActive(dir))) return;

            const h = document.createElement('div');
            h.className = 'resize-handle ' + dir;
            Object.assign(h.style, {
                position: 'absolute', width: '12px', height: '12px',
                background: '#0066FF', border: '1px solid #fff',
                boxSizing: 'border-box', cursor: RESIZE_CURSORS[dir], zIndex: 10000
            });

            // Position
            const r = rect();
            const off = 6;
            switch (dir) {
                case 'n': h.style.cssText += `;left:${r.left + r.width / 2 - off}px;top:${r.top - off}px`; break;
                case 's': h.style.cssText += `;left:${r.left + r.width / 2 - off}px;top:${r.bottom - off}px`; break;
                case 'e': h.style.cssText += `;left:${r.right - off}px;top:${r.top + r.height / 2 - off}px`; break;
                case 'w': h.style.cssText += `;left:${r.left - off}px;top:${r.top + r.height / 2 - off}px`; break;
                case 'nw': h.style.cssText += `;left:${r.left - off}px;top:${r.top - off}px`; break;
                case 'ne': h.style.cssText += `;left:${r.right - off}px;top:${r.top - off}px`; break;
                case 'sw': h.style.cssText += `;left:${r.left - off}px;top:${r.bottom - off}px`; break;
                case 'se': h.style.cssText += `;left:${r.right - off}px;top:${r.bottom - off}px`; break;
            }

            el._resHandles.push(h);
            document.body.appendChild(h);

            // Resize logic
            h.addEventListener('mousedown', e => {
                e.preventDefault(); e.stopPropagation();
                const startX = e.clientX, startY = e.clientY;
                const { left, top, width, height } = rect();
                const dirKey = dir;

                function onMove(ev) {
                    const dx = ev.clientX - startX, dy = ev.clientY - startY;
                    let newW = width, newH = height, newL = left, newT = top;
                    if (dirKey.includes('e')) newW = width + dx;
                    if (dirKey.includes('s')) newH = height + dy;
                    if (dirKey.includes('w')) { newW = width - dx; newL = left + dx; }
                    if (dirKey.includes('n')) { newH = height - dy; newT = top + dy; }
                    if (newW > 20) { el.style.width = newW + 'px'; el.style.left = newL + 'px'; }
                    if (newH > 20) { el.style.height = newH + 'px'; el.style.top = newT + 'px'; }
                }

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true });
            });
        });
    };

    /**
     * Attach edge-based resize (no handles), window-like behavior.
     * @param {HTMLElement} el
     * @param {number} flags - Eborder bitmask to constrain edges
     */
    DOM.makeResizableByEdges = function (el, flags) {
        // Clean up old handles
        (el._resHandles || []).forEach(h => h.remove()); el._resHandles = [];
        const threshold = 6;
        const rect = () => el.getBoundingClientRect();

        function onMove(e) {
            const { left, top, width, height } = rect();
            const x = e.clientX - left, y = e.clientY - top;
            let dir = '';
            if (y < threshold && (flags & Eborder.top)) dir += 'n';
            else if (y > height - threshold && (flags & Eborder.bottom)) dir += 's';
            if (x < threshold && (flags & Eborder.left)) dir += 'w';
            else if (x > width - threshold && (flags & Eborder.right)) dir += 'e';
            el.style.cursor = RESIZE_CURSORS[dir] || '';
        }

        function onDown(e) {
            const r = rect(); const x = e.clientX - r.left, y = e.clientY - r.top;
            let dir = '';
            if (y < threshold && (flags & Eborder.top)) dir += 'n';
            else if (y > r.height - threshold && (flags & Eborder.bottom)) dir += 's';
            if (x < threshold && (flags & Eborder.left)) dir += 'w';
            else if (x > r.width - threshold && (flags & Eborder.right)) dir += 'e';
            if (!dir) return;
            e.preventDefault();
            const start = { x: e.clientX, y: e.clientY, ...r };

            function onDrag(ev) {
                const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
                let newW = start.width, newH = start.height, newL = start.left, newT = start.top;
                if (dir.includes('e')) newW = start.width + dx;
                if (dir.includes('s')) newH = start.height + dy;
                if (dir.includes('w')) { newW = start.width - dx; newL = start.left + dx; }
                if (dir.includes('n')) { newH = start.height - dy; newT = start.top + dy; }
                if (newW > 20) el.style.width = newW + 'px';
                if (newH > 20) el.style.height = newH + 'px';
                if (dir.includes('w') || dir.includes('n')) {
                    el.style.left = newL + 'px'; el.style.top = newT + 'px';
                }
            }

            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onDrag), { once: true });
        }

        el.addEventListener('mousemove', onMove);
        el.addEventListener('mousedown', onDown);
    };



    DOM.makeDraggable = function (
        element,
        handle = null,
        enable = true,
        customDragging = false
    ) {
        const target = handle || element;

        /* ── 1. ÖNCEKİ draggable dinleyicilerini temizle ─────────────── */
        const map = getEventMap(target);                     // WeakMap<Element, Map>
        if (map) {
            for (const [type, list] of map) {
                const isPointer = type === 'pointerdown' ||
                    type === 'pointermove' ||
                    type === 'pointerup';

                const isDrag = type === 'dragstart' ||
                    type === 'dragend';

                if (!isPointer && !isDrag) continue;             // ilgisiz tür

                for (const rec of [...list]) {                   // kopya üzerinde döngü
                    const L = rec.listener;
                    if (!L) continue;

                    const shouldRemove =
                        (isPointer && L._isCustomDraggableHandler) ||
                        (isDrag && L._isNativeDraggableHandler);

                    if (shouldRemove) {
                        target.removeEventListener(type, L, rec.options);
                        /* removeEventListener override’ı listeden silmeyi kendisi yapar */
                    }
                }
            }
        }

        if (!enable) return;

        if (customDragging) {
            let dragging = false, offsetX = 0, offsetY = 0;

            const pointerDown = (e) => {
                if (INTERACTION_STATE.get(element)) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                INTERACTION_STATE.set(element, 'dragging');
                dragging = true;
                offsetX = e.clientX - element.offsetLeft;
                offsetY = e.clientY - element.offsetTop;
                target.setPointerCapture(e.pointerId);
                element.classList.add('dragging');
            };
            const pointerMove = (e) => {
                if (!dragging) return;
                element.style.left = (e.clientX - offsetX) + 'px';
                element.style.top = (e.clientY - offsetY) + 'px';
            };
            const pointerUp = (e) => {
                dragging = false;
                target.releasePointerCapture(e.pointerId);
                element.classList.remove('dragging');
                INTERACTION_STATE.delete(element);
            };

            pointerDown._isCustomDraggableHandler = true;
            pointerMove._isCustomDraggableHandler = true;
            pointerUp._isCustomDraggableHandler = true;
            target.addEventListener('pointerdown', pointerDown, true);
            target.addEventListener('pointermove', pointerMove);
            target.addEventListener('pointerup', pointerUp);
        } else {
            target.setAttribute('draggable', 'true');
            const dragStart = e => {
                if (INTERACTION_STATE.get(element)) { e.preventDefault(); return; }
                INTERACTION_STATE.set(element, 'dragging');
                e.dataTransfer.setData('text/plain', element.id || '');
                element.classList.add('dragging');
            };
            const dragEnd = () => {
                element.classList.remove('dragging');
                INTERACTION_STATE.delete(element);
            };
            dragStart._isNativeDraggableHandler = true;
            dragEnd._isNativeDraggableHandler = true;

            target.addEventListener('dragstart', dragStart);
            target.addEventListener('dragend', dragEnd);
        }
    };
    DOM.makeMovable = function (
        element,
        handle = null,
        movableRect = null,
        xable = true,
        yable = true,
        onMoveStartCb = null,
        onMoveCb = null,
        onDropCb = null
    ) {
        if (!handle) return;

        /* ── 1. ÖNCE eski movable dinleyicilerini temizle ─────────────── */
        const map = getEventMap(handle);                   // WeakMap<Element, Map>
        if (map && map.has('pointerdown')) {
            for (const rec of [...map.get('pointerdown')]) { // kopya üzerinde döngü
                if (rec.listener?._isMovableHandler) {
                    handle.removeEventListener('pointerdown', rec.listener, rec.options);
                    /* removeEventListener override’ı listeden de siler */
                }
            }
        }

        const onPointerDown = e => {
            if (e.target !== handle) return;
            if (INTERACTION_STATE.get(element)) return;
            INTERACTION_STATE.set(element, 'moving');
            onMoveStartCb?.();

            const te = element.owner;
            if (te && !globs.selectionManager.has(te)) {
                globs.selectionManager.forEach(el => el.htmlObject.classList.remove('selected'));
                globs.selectionManager.clear();
                globs.selectionManager.add(te);
                te.htmlObject.classList.add('selected');
            }
            const threshold = 7;
            const rect = element.getBoundingClientRect();
            const nearEdge = (
                e.clientX - rect.left < threshold || rect.right - e.clientX < threshold ||
                e.clientY - rect.top < threshold || rect.bottom - e.clientY < threshold
            );
            if (nearEdge) return; // resize öncelikli

            handle.setPointerCapture(e.pointerId);

            const container = movableRect instanceof Element
                ? movableRect
                : (element.offsetParent || document.documentElement);

            const scrollLeft = container.scrollLeft;
            const scrollTop = container.scrollTop;

            const startPageX = e.pageX;
            const startPageY = e.pageY;

            const startLeft = parseInt(getComputedStyle(element).left, 10) || element.offsetLeft;
            const startTop = parseInt(getComputedStyle(element).top, 10) || element.offsetTop;

            let boundRect = null;
            if (movableRect === true) boundRect = new DOMRect(0, 0, 9e9, 9e9);
            else if (movableRect instanceof Element) {
                const r = movableRect.getBoundingClientRect();
                boundRect = new DOMRect(r.left + scrollLeft, r.top + scrollTop, r.width, r.height);
            } else if (movableRect instanceof DOMRect) boundRect = movableRect;

            const onPointerMove = (ev) => {
                const dx = ev.pageX - startPageX;
                const dy = ev.pageY - startPageY;

                let newLeft = startLeft + dx;
                let newTop = startTop + dy;

                if (xable && boundRect) {
                    const minX = boundRect.x;
                    const maxX = boundRect.x + boundRect.width - element.offsetWidth;
                    newLeft = Math.min(Math.max(minX, newLeft), maxX);
                }
                if (yable && boundRect) {
                    const minY = boundRect.y;
                    const maxY = boundRect.y + boundRect.height - element.offsetHeight;
                    newTop = Math.min(Math.max(minY, newTop), maxY);
                }

                element.style.left = `${newLeft}px`;
                element.style.top = `${newTop}px`;

                onMoveCb?.(ev);
                ev.stopPropagation();
            };

            const onPointerUp = (ev) => {
                INTERACTION_STATE.delete(element);
                handle.removeEventListener('pointermove', onPointerMove);
                handle.removeEventListener('pointerup', onPointerUp);
                handle.releasePointerCapture(e.pointerId);
                onDropCb?.({ x: ev.clientX, y: ev.clientY });
            };

            handle.addEventListener('pointermove', onPointerMove);
            handle.addEventListener('pointerup', onPointerUp, { once: true });
        };
        onPointerDown._isMovableHandler = true;

        if (movableRect !== false)
            handle.addEventListener('pointerdown', onPointerDown);
    };

    /**
     * Enable simple drag-reordering of child elements within a container.
     * @param {HTMLElement} container
     * @param {string} [itemSelector] selector for draggable items
     */
    DOM.makeSortable = function (container, itemSelector = '> *') {
        let active = null;
        let placeholder = null;
        let stylesAdded = DOM.makeSortable._stylesAdded;

        if (!stylesAdded) {
            DOM.addStyle(`.sort-placeholder{background:#0078d4;height:4px;margin:2px 0;border-radius:2px}`);
            DOM.makeSortable._stylesAdded = true;
        }

        const getItem = (target) => target.closest(itemSelector);

        const onDown = (e) => {
            const item = getItem(e.target);
            if (!item || !container.contains(item)) return;
            e.preventDefault();
            e.stopPropagation();
            active = item;
            placeholder = document.createElement('div');
            placeholder.className = 'sort-placeholder';
            placeholder.style.height = `${item.getBoundingClientRect().height}px`;
            item.after(placeholder);
            item.classList.add('dragging');
            item.setPointerCapture(e.pointerId);
        };

        const onMove = (e) => {
            if (!active) return;
            const over = document.elementFromPoint(e.clientX, e.clientY);
            const target = getItem(over);
            if (target && target !== placeholder && container.contains(target)) {
                const rect = target.getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    container.insertBefore(placeholder, target);
                } else {
                    container.insertBefore(placeholder, target.nextSibling);
                }
            }
        };

        const onUp = (e) => {
            if (!active) return;
            active.classList.remove('dragging');
            container.insertBefore(active, placeholder);
            placeholder.remove();
            active.releasePointerCapture(e.pointerId);
            active = placeholder = null;
        };

        container.addEventListener('pointerdown', onDown);
        container.addEventListener('pointermove', onMove);
        container.addEventListener('pointerup', onUp);

        return () => {
            container.removeEventListener('pointerdown', onDown);
            container.removeEventListener('pointermove', onMove);
            container.removeEventListener('pointerup', onUp);
        };
    };
})();


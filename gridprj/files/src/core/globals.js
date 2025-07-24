import { TselectionManager } from '../dom/SelectionManager.js';


export const selectionManager = new TselectionManager();


selectionManager.addEventListener('change', ({ detail }) => {
    if (detail.item && detail.item.htmlObject) {
        detail.item.htmlObject.classList.toggle(
            'selected',
            detail.action === 'select'
        );
    }
});


// --- Application-wide Constants ---

// Orijinal `window.globs` nesnesindeki diğer sabitler ve yapılandırmalar
// artık bu `globs` nesnesi içinde toplanıyor.
export const globs = {
    winprops: "0|window|self|document|name|location|customElements|history|navigation|locationbar|menubar|personalbar|scrollbars|statusbar|toolbar|status|closed|frames|length|top|opener|parent|frameElement|navigator|origin|external|screen|innerWidth|innerHeight|scrollX|pageXOffset|scrollY|pageYOffset|visualViewport|screenX|screenY|outerWidth|outerHeight|devicePixelRatio|clientInformation|screenLeft|screenTop|styleMedia|onsearch|isSecureContext|trustedTypes|performance|onappinstalled|onbeforeinstallprompt|crypto|indexedDB|sessionStorage|localStorage|onbeforexrselect|onabort|onbeforeinput|onbeforetoggle|onblur|oncancel|oncanplay|oncanplaythrough|onchange|onclick|onclose|oncontextlost|oncontextmenu|oncontextrestored|oncuechange|ondblclick|ondrag|dragend|dragenter|dragleave|dragover|dragstart|drop|durationchange|emptied|ended|error|focus|formdata|input|invalid|keydown|keypress|keyup|load|loadeddata|loadedmetadata|loadstart|mousedown|mouseenter|mouseleave|mousemove|mouseout|mouseover|mouseup|mousewheel|pause|play|playing|progress|ratechange|reset|resize|scroll|securitypolicyviolation|seeked|seeking|select|slotchange|stalled|submit|suspend|timeupdate|toggle|volumechange|waiting|webkitanimationend|webkitanimationiteration|webkitanimationstart|webkittransitionend|wheel|auxclick|gotpointercapture|lostpointercapture|pointerdown|pointermove|pointerrawupdate|pointerup|pointercancel|pointerover|pointerout|pointerenter|pointerleave|selectstart|selectionchange|animationend|animationiteration|animationstart|transitionrun|transitionstart|transitionend|transitioncancel|afterprint|beforeprint|beforeunload|hashchange|languagechange|message|messageerror|offline|online|pagehide|pageshow|popstate|rejectionhandled|storage|unhandledrejection|unload|crossOriginIsolated|scheduler|alert|atob|blur|btoa|cancelAnimationFrame|cancelIdleCallback|captureEvents|clearInterval|clearTimeout|close|confirm|createImageBitmap|fetch|find|focus|getComputedStyle|getSelection|matchMedia|moveBy|moveTo|open|postMessage|print|prompt|queueMicrotask|releaseEvents|reportError|requestAnimationFrame|requestIdleCallback|resizeBy|resizeTo|scroll|scrollBy|scrollTo|setInterval|setTimeout|stop|structuredClone|webkitCancelAnimationFrame|webkitRequestAnimationFrame|chrome|fence|caches|cookieStore|ondevicemotion|ondeviceorientation|ondeviceorientationabsolute|launchQueue|sharedStorage|documentPictureInPicture|onbeforematch|getScreenDetails|queryLocalFonts|showDirectoryPicker|showOpenFilePicker|showSaveFilePicker|originAgentCluster|credentialless|speechSynthesis|oncontentvisibilityautostatechange|onscrollend|webkitRequestFileSystem|webkitResolveLocalFileSystemURL|JSCompiler_renameProperty",
    path: `${location.protocol}//${location.host}/`,
    events: "abort|afterprint|animationend|animationiteration|animationstart|beforeprint|beforeunload|blur|canplay|canplaythrough|change|click|contextmenu|copy|cut|dblclick|drag|dragend|dragenter|dragleave|dragover|dragstart|drop|durationchange|ended|error|focus|focusin|focusout|fullscreenchange|fullscreenerror|hashchange|input|invalid|keydown|keypress|keyup|load|loadeddata|loadedmetadata|loadstart|message|mousedown|mouseenter|mouseleave|mousemove|mouseover|mouseout|mouseup|mousewheel|offline|online|open|pagehide|pageshow|paste|pause|play|playing|popstate|progress|ratechange|resize|reset|scroll|search|seeked|seeking|select|show|stalled|storage|submit|suspend|timeupdate|toggle|touchcancel|touchend|touchmove|touchstart|transitionend|unload|volumechange|waiting|wheel",
    lengthUnits: {
        centimeters: "cm",
        millimeters: "mm",
        quarter_millimeters: "Q",
        inches: "in",
        picas: "pc",
        points: "pt",
        pixels: "px",
    },
    designMode: false, // Yazım hatası düzeltildi: desingMode -> designMode
    historyManager: new HistoryManager(200),
    reg_exps: {
        class: /(class.[^}]*)}/gm,
        function: /(function .[^}]*)}/gm,
        var: 3,
        object: 4,
        quotes: /(["][^"]+["])|(['][^']+['])/gm,
        email: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    },
   
};



import { Tlayer } from './Tlayer.js';
import { Ealign } from '../core/enums.js';
import { DOM } from './dom.js';

/**
 * Konumlandırılabilir (positioned) elementler için temel sınıf.
 * 'static' olmayan (absolute, relative, fixed) elementleri temsil eder.
 */
export class TpositionedElement extends Tlayer {
    /**
     * @param {string|HTMLElement} tagOrElement - HTML tag adı veya mevcut element
     * @param {Object} options
     * @param {string}  [options.position="absolute"]
     * @param {number|string}  [options.left=0]
     * @param {number|string}  [options.top=0]
     * @param {number}  [options.align=Ealign.bottom]
     * @param {HTMLElement|Telement} options.targetElement - Hizalanacağı hedef element
     */
    constructor(tagOrElement = 'div', options = {}) {
        super(tagOrElement, options);
        
        const {
            position = "absolute",
            left = 0,
            top = 0,
            targetElement = null,
            align = Ealign.bottom
        } = options;

        Ealign.bindTo("align", this);
        this.align = align;
        this.targetElement = targetElement;

        // Mevcut bir HTMLElement ise, mevcut style'ı ezmemeye dikkat!
        if (this.htmlObject.style.position === 'static' || !this.htmlObject.style.position) {
            this.htmlObject.style.position = position;
        }

        this.rect.left = typeof left === "number" ? left : (parseInt(left, 10) || 0);
        this.rect.top = typeof top === "number" ? top : (parseInt(top, 10) || 0);
    }

    get zIndex() {
        return +this.htmlObject.style.zIndex || 0;
    }

    set zIndex(v) {
        this.htmlObject.style.zIndex = v;
    }

    /**
     * Elementi hedef bir elemente göre hizalayarak bir popup gibi gösterir.
     * @param {HTMLElement|Telement|string} [targetElement=null] - Hedef element, selector veya nesne.
     * @param {Ealign} [align=null] - Hizalama türü (Ealign enum).
     * @param {number} [offsetX=null] - X eksenindeki kaydırma miktarı.
     * @param {number} [offsetY=null] - Y eksenindeki kaydırma miktarı.
     */
    popup(targetElement = null, align = null, offsetX = 0, offsetY = 0) {
        // Parametreler verilmemişse, nesnenin kendi özelliklerini kullan
        const finalTarget = DOM.getHtmlElement(targetElement) || this.targetElement || document.body;
        const finalAlign = align ?? this.align;
        
        this.targetElement = finalTarget;

        this.show();
        this.rect.alignTo(this.targetElement, finalAlign, offsetX, offsetY);
    }
}
window.TpositionedElement = TpositionedElement;
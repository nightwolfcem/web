import { TpositionedElement } from './TpositionedElement.js';
import { DOM } from './dom.js';

/**
 * Mutlak konumlandırılmış (position: absolute) elementler için özel sınıf.
 * Genellikle popup, dialog, tooltip gibi component'ler için temel oluşturur.
 */
export class TabsoluteElement extends TpositionedElement {
    #targetElement;

    /**
     * @param {Object} options
     * @param {HTMLElement|Telement|string} [options.targetElement=null] - Hangi elemana göre hizalanacak
     * @param {number} [options.offsetX=0] - X ekseni ofseti
     * @param {number} [options.offsetY=0] - Y ekseni ofseti
     * @param {boolean} [options.autoShow=false] - Oluşturulduğunda otomatik olarak göster
     * ... (TpositionedElement ve Tlayer parametreleri)
     */
    constructor(options = {}) {
        // TabsoluteElement her zaman bir div olarak başlar ve pozisyonu 'absolute' olur.
        super("div", { position: 'absolute', ...options });

        const {
            targetElement = null,
            offsetX = 0,
            offsetY = 0,
            autoShow = false,
            onShow = null,
            onHide = null
        } = options;

        this.defineProp('targetElement', 
            () => this.#targetElement, 
            (value) => {
                this.#targetElement = DOM.getHtmlElement(value);
                if (this.#targetElement && this.status.visible) {
                   this.rect.alignTo(this.#targetElement, this.align, this.offsetX, this.offsetY);
                }
            }
        );

        this.targetElement = targetElement;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.onShow = onShow;
        this.onHide = onHide;

        if (autoShow && this.targetElement) {
            this.popup();
        }
    }

    /**
     * Elementin ekran sınırları dışına taşmasını engeller.
     * @param {number} [padding=5] - Ekran kenarlarından bırakılacak boşluk.
     */
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
            this.setPosition(left, top); // Bu metodun Tlayer'da olduğundan emin olalım.
        }
    }

    // Tlayer'da zaten var olan show/hide metodlarını override ederek onShow/onHide callback'lerini tetikleyebiliriz.
    show() {
        super.show();
        this.onShow?.call(this);
    }
    
    hide() {
        super.hide();
        this.onHide?.call(this);
    }
}
window.TabsoluteElement = TabsoluteElement;
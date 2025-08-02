import { TabsoluteElement } from '../../dom/TabsoluteElement.js';
import { TmenuItem } from './TmenuItem.js';
import { menuManager } from './menuManager.js';
import { Ealign } from '../../core/enums.js';

/**
 * Tmenu: Konteyner görevi gören ana menü sınıfı.
 * TmenuItem nesnelerini barındırır ve bir popup veya context menü olarak görünebilir.
 */
export class Tmenu extends TabsoluteElement {
    /**
     * @param {object} options - Menü seçenekleri
     * @param {Array<object>} [options.items=[]] - Menü öğelerini tanımlayan veri dizisi.
     * @param {Tmenu} [options.parentMenu=null] - Bu menüyü açan üst menü (alt menüler için).
     */
    constructor(options = {}) {
        super({
            tag: 'div', // Artık TABLE değil, DIV kullanıyoruz
            ...options
        });

        this.parentMenu = options.parentMenu || null;
        this.items = []; // TmenuItem nesnelerini tutar
        this.htmlObject.className = 't-menu';
        
        this.contentContainer = document.createElement('ul');
        this.htmlObject.appendChild(this.contentContainer);

        if (options.items && options.items.length > 0) {
            this.buildFromData(options.items);
        }
    }

    /**
     * Veri dizisinden menü öğelerini oluşturur.
     * @param {Array<object>} itemsData - Menü öğesi seçenekleri dizisi.
     */
    buildFromData(itemsData) {
        this.contentContainer.innerHTML = '';
        this.items = [];
        itemsData.forEach(itemData => {
            this.addItem(itemData);
        });
    }

    /**
     * Menüye yeni bir öğe ekler.
     * @param {object} options - TmenuItem için seçenekler.
     * @returns {TmenuItem} Oluşturulan TmenuItem nesnesi.
     */
    addItem(options) {
        const TmenuItem = new TmenuItem(this, options);
        this.items.push(TmenuItem);
        this.contentContainer.appendChild(TmenuItem.htmlObject);
        return TmenuItem;
    }

    /**
     * Menüyü bir hedef elemente göre konumlandırarak gösterir.
     * @param {object} options - Konumlandırma seçenekleri
     * @param {HTMLElement} options.targetElement - Hizalanacak hedef element.
     * @param {'left-top'|'right-top'|'bottom-left'} [options.align='bottom-left'] - Hizalama şekli.
     * @param {number} [options.x] - Mutlak X koordinatı.
     * @param {number} [options.y] - Mutlak Y koordinatı.
     */
    popup({ targetElement, align = 'bottom-left', x, y } = {}) {
        if (this.status.visible) return;

        // Menüyü DOM'a ekle (eğer daha önce eklenmediyse)
        if (!this.htmlObject.parentElement) {
            DOM.baseLayer.subLayers.popup.appendChild(this);
        }

        this.show(); // Tlayer'dan gelen metot
        menuManager.register(this);

        if (targetElement) {
            let alignFlags = Ealign.inner;
            if (align === 'right-top') {
                alignFlags |= Ealign.right | Ealign.top;
            } else { // bottom-left (default)
                alignFlags |= Ealign.left | Ealign.bottom;
            }
            this.rect.alignTo(targetElement, alignFlags);
        } else if (x !== undefined && y !== undefined) {
            this.rect.left = x;
            this.rect.top = y;
        }
        
        this.ensureOnScreen(); // Ekran dışına taşmayı engelle
    }

    /**
     * Menüyü gizler.
     */
    hide() {
        if (!this.status.visible) return;
        
        // Tüm alt menüleri de gizle
        this.items.forEach(item => item.subMenu?.hide());
        
        super.hide(); // Tlayer'dan gelen metot
        menuManager.unregister(this);
    }

    /**
     * Bu menüyü bir elementin sağ tık menüsü olarak bağlar.
     * @param {HTMLElement|Telement} target - Sağ tık olayının dinleneceği hedef.
     */
    bindToContextMenu(target) {
        const targetEl = target.htmlObject || target;
        targetEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            menuManager.closeAll(); // Diğer tüm menüleri kapat
            this.popup({ x: e.clientX, y: e.clientY });
        });
    }
}
window.Tmenu = Tmenu;s
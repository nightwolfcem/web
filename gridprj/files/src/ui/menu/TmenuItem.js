import { Tmenu } from './Menu.js';
import { menuManager } from './menuManager.js';

/**
 * TmenuItem: Bir menü içindeki tek bir öğeyi temsil eder.
 * Bu sınıf doğrudan bir Telement değildir, Tmenu tarafından yönetilen bir yardımcıdır.
 */
export class TmenuItem {
    /**
     * @param {Tmenu} parentMenu - Bu öğenin ait olduğu menü.
     * @param {object} options - Öğe seçenekleri.
     * @param {string} [options.caption] - Görünen metin.
     * @param {string} [options.icon] - İkon için bir sınıf adı veya karakter.
     * @param {string} [options.shortcut] - Kısayol metni (örn: Ctrl+S).
     * @param {Function} [options.onClick] - Tıklandığında çalışacak fonksiyon.
     * @param {boolean} [options.disabled=false] - Öğe pasif mi?
     * @param {boolean} [options.checkable=false] - İşaretlenebilir mi?
     * @param {boolean} [options.checked=false] - Başlangıçta işaretli mi?
     * @param {Array<object>} [options.items] - Bu öğeye ait alt menü öğeleri.
     * @param {'item'|'separator'} [options.type='item'] - Öğe türü.
     */
    constructor(parentMenu, options) {
        this.parentMenu = parentMenu;
        this.options = options;
        this.checked = options.checked || false;
        
        this.htmlObject = document.createElement('li');
        this.htmlObject.className = 't-menu-item';

        if (options.type === 'separator') {
            this.htmlObject.classList.add('is-separator');
            return;
        }

        if (options.disabled) {
            this.htmlObject.classList.add('is-disabled');
        }
        
        // İkon alanı
        const iconEl = document.createElement('span');
        iconEl.className = 't-menu-icon';
        if (options.checkable) {
            iconEl.innerHTML = this.checked ? '✓' : '';
        } else if (options.icon) {
            iconEl.innerHTML = options.icon;
        }
        
        // Başlık alanı
        const captionEl = document.createElement('span');
        captionEl.className = 't-menu-caption';
        captionEl.textContent = options.caption || '';
        
        // Kısayol alanı
        const shortcutEl = document.createElement('span');
        shortcutEl.className = 't-menu-shortcut';
        shortcutEl.textContent = options.shortcut || '';

        this.htmlObject.append(iconEl, captionEl, shortcutEl);

        // Alt menü varsa
        if (options.items && options.items.length > 0) {
            this.htmlObject.classList.add('has-submenu');
            const subMenuArrow = document.createElement('span');
            subMenuArrow.className = 't-menu-arrow';
            subMenuArrow.innerHTML = '&#9654;'; // ►
            this.htmlObject.appendChild(subMenuArrow);
            
            this.subMenu = new Tmenu({
                items: options.items,
                parentMenu: this.parentMenu // Ebeveyn zincirini koru
            });
        }
        
        this._addEventListeners();
    }

    _addEventListeners() {
        if (this.options.disabled) return;

        this.htmlObject.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.options.checkable) {
                this.toggleCheck();
            }

            if (typeof this.options.onClick === 'function') {
                this.options.onClick.call(this);
            }
            
            if (!this.subMenu) {
                menuManager.closeAll();
            }
        });

        this.htmlObject.addEventListener('mouseover', () => {
             // Diğer açık alt menüleri kapat
            menuManager.closeSubsequentMenus(this.parentMenu);
            if (this.subMenu) {
                this.subMenu.popup({ targetElement: this.htmlObject, align: 'right-top' });
            }
        });
    }

    toggleCheck() {
        this.checked = !this.checked;
        const iconEl = this.htmlObject.querySelector('.t-menu-icon');
        if (iconEl) {
            iconEl.innerHTML = this.checked ? '✓' : '';
        }
    }
}

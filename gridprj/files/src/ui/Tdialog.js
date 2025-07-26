import { TabsoluteElement } from '../dom/TabsoluteElement.js';

/**
 * Tdialog: Başlık, içerik ve butonlar içeren basit bir diyalog kutusu.
 */
export class Tdialog extends TabsoluteElement {
    /**
     * @param {Object} options - TabsoluteElement'ten gelen tüm seçeneklere ek olarak:
     * @param {string} [options.title=""] - Diyalog başlığı.
     * @param {string|HTMLElement} [options.content=""] - Diyalog içeriği.
     * @param {Array<Object>} [options.buttons=[]] - Butonlar. Örn: [{text, value, action}]
     */
    constructor({
        title = "",
        content = "",
        buttons = [],
        ...options
    } = {}) {
        super(options); // TabsoluteElement'in constructor'ını çağırır.
        
        this.htmlObject.classList.add('tdialog');

        // Başlık (Caption)
        const caption = document.createElement('div');
        caption.className = "tdialog-caption";
        caption.textContent = title;
        this.htmlObject.appendChild(caption);

        // İçerik (Body)
        const body = document.createElement('div');
        body.className = "tdialog-body";
        if (typeof content === "string") {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }
        this.htmlObject.appendChild(body);

        // Butonlar (Buttons)
        if (buttons.length > 0) {
            const btnsContainer = document.createElement('div');
            btnsContainer.className = "tdialog-buttons";
            buttons.forEach(btnConfig => {
                const button = document.createElement('button');
                button.textContent = btnConfig.text || btnConfig.value || "OK";
                button.onclick = () => {
                    if (typeof btnConfig.action === 'function') {
                        btnConfig.action.call(this, btnConfig.value);
                    }
                    this.hide(); // Diyalogu gizle
                };
                btnsContainer.appendChild(button);
            });
            this.htmlObject.appendChild(btnsContainer);
        }
    }
}
window.Tdialog = Tdialog;
import { TabsoluteElement } from '../dom/TabsoluteElement.js';
import { Ealign } from '../core/enums.js';
import { DOM } from '../dom/dom.js';

export class TsuggestionBox extends TabsoluteElement {
    static #instance;

    static getInstance() {
        if (!TsuggestionBox.#instance) {
            TsuggestionBox.#instance = new TsuggestionBox();
        }
        return TsuggestionBox.#instance;
    }

    constructor() {
        if (TsuggestionBox.#instance) {
            return TsuggestionBox.#instance;
        }
        super({
            align: Ealign.bottom | Ealign.left | Ealign.right,
            parent: DOM.baseLayer?.subLayers.dropdown || document.body,
            className: 'suggestion-box',
            style: {
                border: '1px solid #ccc',
                background: '#fff',
                maxHeight: '150px',
                overflowY: 'auto',
                boxSizing: 'border-box'
            }
        });
        this.hide();
        this.items = [];
        this.selectedIndex = -1;
        TsuggestionBox.#instance = this;
    }

    showFor(input, suggestions, onSelect) {
        if (!suggestions || suggestions.length === 0) {
            this.hide();
            return;
        }
        this.targetElement = input;
        this.htmlObject.style.width = input.getBoundingClientRect().width + 'px';
        this.update(suggestions, onSelect);
        this.popup();
    }

    update(suggestions, onSelect) {
        this.htmlObject.innerHTML = '';
        this.items = suggestions;
        this.selectedIndex = -1;
        this.onSelect = onSelect;
        suggestions.forEach((s, i) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = s;
            item.style.padding = '5px';
            item.style.cursor = 'pointer';
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.onSelect?.(s);
                this.hide();
            });
            this.htmlObject.appendChild(item);
        });
    }

    moveSelection(step) {
        if (!this.items.length) return;
        this.selectedIndex = (this.selectedIndex + step + this.items.length) % this.items.length;
        Array.from(this.htmlObject.children).forEach((el, idx) => {
            el.style.background = idx === this.selectedIndex ? '#bde4ff' : '';
        });
    }

    getSelected() {
        return this.items[this.selectedIndex] ?? null;
    }
}

window.TsuggestionBox = TsuggestionBox;

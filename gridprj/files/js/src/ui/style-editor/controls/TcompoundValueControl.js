import { TbaseControl } from './TbaseControl.js';
import { cssProps } from '../../../data/cssProperties.js';
import { TabsoluteElement } from '../../../dom/TabsoluteElement.js';
import { Ealign } from '../../../core/enums.js';
import { DOM } from '../../../dom/dom.js';

let sharedSuggestionBox;

export class TcompoundValueControl extends TbaseControl {
    render() {
        const container = document.createElement('div');
        container.style.position = 'relative';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.initialValue;
        input.placeholder = this.meta.syntax || 'Değerleri boşlukla ayırarak girin...';
        container.appendChild(input);

        const getSuggestionBox = () => {
            if (!sharedSuggestionBox) {
                sharedSuggestionBox = new TabsoluteElement({
                    align: Ealign.bottom | Ealign.left | Ealign.right | Ealign.offset,
                    parent: DOM.baseLayer.subLayers.dropdown,
                    className: 'suggestion-box',
                    style: {
                        border: '1px solid #ccc',
                        background: '#fff',
                        maxHeight: '150px',
                        overflowY: 'auto',
                        boxSizing: 'border-box'
                    }
                });
                sharedSuggestionBox.hide();
            }
            sharedSuggestionBox.targetElement = input;
            return sharedSuggestionBox;
        };

        const expectedTokens = [];
        const staticOptions = [];
        (this.meta.values || []).forEach(tok => {
            if (tok.startsWith('[prop:')) {
                expectedTokens.push(tok.slice(6, -1));
            } else if (tok === 'initial' || tok === 'inherit') {
                staticOptions.push(tok);
            }
        });

        const dynamicTokens = ['[length]','[percent]','[time]','[number]','[string]'];

        const getSuggestions = () => {
            const val = input.value;
            const tokens = val.split(/\s+/);
            if (val.endsWith(' ')) tokens.push('');
            const current = tokens[tokens.length - 1].toLowerCase();
            const suggestions = new Set();

            expectedTokens.forEach(subProp => {
                const subMeta = cssProps.properties[subProp];
                if (!subMeta) return;
                (subMeta.values || []).forEach(v => {
                    if (dynamicTokens.includes(v)) return;
                    if (v === '[color]') {
                        (cssProps.colorNames || []).forEach(c => suggestions.add(c));
                    } else if (v === '[family-name]') {
                        (cssProps.familyNames || []).forEach(f => suggestions.add(f));
                    } else if (v === '[generic-family]') {
                        (cssProps.genericFamilies || []).forEach(g => suggestions.add(g));
                    } else if (v.startsWith('[fn:')) {
                        suggestions.add(v.slice(4, -1) + '()');
                    } else if (!v.startsWith('[')) {
                        suggestions.add(v);
                    }
                });
            });

            staticOptions.forEach(opt => suggestions.add(opt));

            return Array.from(suggestions).filter(s => s.toLowerCase().startsWith(current));
        };

        const updateSuggestions = () => {
            const box = getSuggestionBox();
            const suggestions = getSuggestions();
            box.htmlObject.innerHTML = '';
            if (suggestions.length === 0) {
                box.hide();
                return;
            }
            suggestions.forEach(sugg => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.textContent = sugg;
                item.style.padding = '5px';
                item.style.cursor = 'pointer';

                item.addEventListener('mousedown', e => {
                    e.preventDefault();
                    const text = input.value;
                    const tokens = text.trim() === '' ? [] : text.trim().split(/\s+/);
                    const editingIndex = text.endsWith(' ') ? tokens.length : tokens.length - 1;
                    tokens[editingIndex] = sugg;
                    let newValue = tokens.join(' ');
                    if (!staticOptions.includes(sugg)) {
                        newValue += ' ';
                    }
                    input.value = newValue;
                    box.hide();
                    input.focus();
                    this.onChange(input.value.trim());
                });
                box.appendChild(item);
            });
            box.htmlObject.style.width = `${input.offsetWidth}px`;
            box.popup();
        };

        input.addEventListener('input', updateSuggestions);
        input.addEventListener('change', () => this.onChange(input.value.trim()));
        input.addEventListener('blur', () => setTimeout(() => sharedSuggestionBox?.hide(), 200));

        return container;
    }
}
window.TcompoundValueControl = TcompoundValueControl;

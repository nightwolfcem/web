import { TbaseControl } from './TbaseControl.js';
import { cssProps } from '../../../data/cssProperties.js';

export class TcompoundValueControl extends TbaseControl {
    render() {
        const container = document.createElement('div');
        container.style.position = 'relative';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.initialValue;
        input.placeholder = this.meta.syntax || 'Değerleri boşlukla ayırarak girin...';
        container.appendChild(input);

        const suggestionBox = document.createElement('div');
        suggestionBox.className = 'suggestion-box';
        Object.assign(suggestionBox.style, {
            position: 'absolute', top: '100%', left: 0, width: '100%',
            border: '1px solid #ccc', background: '#fff', maxHeight: '150px',
            overflowY: 'auto', zIndex: '1000', display: 'none', boxSizing: 'border-box'
        });
        container.appendChild(suggestionBox);

        const orderedProps = [];
        const staticOptions = [];
        (this.meta.values || []).forEach(tok => {
            if (tok.startsWith('[prop:')) {
                orderedProps.push(tok.slice(6, -1));
            } else if (tok === 'initial' || tok === 'inherit') {
                staticOptions.push(tok);
            }
        });

        const dynamicTokens = ['[length]','[percent]','[time]','[number]','[string]'];

        const getSuggestions = () => {
            const text = input.value;
            const tokens = text.trim() === '' ? [] : text.trim().split(/\s+/);
            const editingIndex = text.endsWith(' ') ? tokens.length : tokens.length - 1;
            const currentPart = text.endsWith(' ') ? '' : (tokens[editingIndex] || '');
            const suggestions = new Set();

            if (editingIndex === 0) {
                staticOptions.forEach(opt => suggestions.add(opt));
            }

            if (editingIndex >= 0 && editingIndex < orderedProps.length) {
                const subProp = orderedProps[editingIndex];
                const subMeta = cssProps.properties[subProp];
                if (subMeta) {
                    (subMeta.values || []).forEach(val => {
                        if (dynamicTokens.includes(val)) return;
                        if (val === '[color]') {
                            (cssProps.colorNames || []).forEach(c => suggestions.add(c));
                        } else if (val === '[family-name]') {
                            (cssProps.familyNames || []).forEach(f => suggestions.add(f));
                        } else if (val === '[generic-family]') {
                            (cssProps.genericFamilies || []).forEach(g => suggestions.add(g));
                        } else if (val.startsWith('[fn:')) {
                            suggestions.add(val);
                        } else if (!val.startsWith('[')) {
                            suggestions.add(val);
                        }
                    });
                }
            }

            return Array.from(suggestions).filter(s => s.toLowerCase().startsWith(currentPart.toLowerCase()));
        };

        const updateSuggestions = () => {
            const suggestions = getSuggestions();
            suggestionBox.innerHTML = '';
            if (suggestions.length === 0) {
                suggestionBox.style.display = 'none';
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
                    const replacement = sugg.startsWith('[fn:') && sugg.endsWith(']')
                        ? sugg.slice(4, -1) + '()'
                        : sugg;
                    tokens[editingIndex] = replacement;
                    let newValue = tokens.join(' ');
                    const isStatic = staticOptions.includes(sugg);
                    if (!isStatic && editingIndex < orderedProps.length - 1) {
                        newValue += ' ';
                    }
                    input.value = newValue;
                    suggestionBox.style.display = 'none';
                    input.focus();
                    this.onChange(input.value.trim());
                });
                suggestionBox.appendChild(item);
            });
            suggestionBox.style.display = 'block';
        };

        input.addEventListener('input', updateSuggestions);
        input.addEventListener('change', () => this.onChange(input.value.trim()));
        input.addEventListener('blur', () => setTimeout(() => suggestionBox.style.display = 'none', 200));

        return container;
    }
}
window.TcompoundValueControl = TcompoundValueControl;

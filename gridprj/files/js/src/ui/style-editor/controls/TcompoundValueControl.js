import { cssProps } from '../../../data/cssProperties.js';
import { TsuggestionBox } from '../../TsuggestionBox.js';

export class TcompoundValueControl extends TbaseControl {
    render() {
        const container = document.createElement('div');
        container.style.position = 'relative';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.initialValue;
        input.placeholder = this.meta.syntax || 'Değerleri boşlukla ayırarak girin...';
        container.appendChild(input);

        const suggestionBox = TsuggestionBox.getInstance();

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

        const applySuggestion = (sugg) => {
            const text = input.value;
            const tokens = text.trim() === '' ? [] : text.trim().split(/\s+/);
            const editingIndex = text.endsWith(' ') ? tokens.length : tokens.length - 1;
            tokens[editingIndex] = sugg;
            let newValue = tokens.join(' ');
            if (!staticOptions.includes(sugg)) {
                newValue += ' ';
            }
            input.value = newValue;
            suggestionBox.hide();
            input.focus();
            this.onChange(input.value.trim());
        };

        const updateSuggestions = () => {
            const suggestions = getSuggestions();
            suggestionBox.showFor(input, suggestions, applySuggestion);
        };

        input.addEventListener('input', updateSuggestions);
        input.addEventListener('keydown', e => {
            if (!suggestionBox.status.visible) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                suggestionBox.moveSelection(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                suggestionBox.moveSelection(-1);
            } else if (e.key === 'Enter') {
                const sel = suggestionBox.getSelected();
                if (sel) {
                    e.preventDefault();
                    applySuggestion(sel);
                }
            }
        });
        input.addEventListener('change', () => this.onChange(input.value.trim()));
        input.addEventListener('blur', () => setTimeout(() => suggestionBox.hide(), 200));

        return container;
    }
}
window.TcompoundValueControl = TcompoundValueControl;


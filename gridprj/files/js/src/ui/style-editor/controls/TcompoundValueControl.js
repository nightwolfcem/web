import { cssProps } from '../../../data/cssProperties.js';
import { TsuggestionBox } from '../../TsuggestionBox.js';
import { TbaseControl } from './TbaseControl.js';

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
            const tokens = val.trim() === '' ? [] : val.trim().split(/\s+/);
            // If cursor is at a new token, include empty string for matching
            if (val.endsWith(' ')) tokens.push('');
            const current = tokens.length ? tokens[tokens.length - 1].toLowerCase() : '';
            const usedTokens = new Set(tokens.slice(0, -1).map(t => t.toLowerCase()));
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

            return Array.from(suggestions).filter(s => {
                const lower = s.toLowerCase();
                if (usedTokens.has(lower)) return false;
                return lower.startsWith(current);
            });
        };

        const applySuggestion = (sugg) => {
            const text = input.value;
            const tokens = text.trim() === '' ? [] : text.trim().split(/\s+/);
            const editingIndex = text.endsWith(' ') ? tokens.length : tokens.length - 1;

            if (sugg.endsWith('()')) {
                tokens[editingIndex] = sugg;
                input.value = tokens.join(' ');
                // place caret inside parentheses for immediate editing
                const pos = input.value.lastIndexOf('()');
                input.setSelectionRange(pos + 1, pos + 1);
            } else {
                tokens[editingIndex] = sugg;
                let newValue = tokens.join(' ');
                if (!staticOptions.includes(sugg)) {
                    newValue += ' ';
                }
                input.value = newValue;
            }

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


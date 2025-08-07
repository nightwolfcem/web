import { cssProps } from '../../../data/cssProperties.js';
import { cssFunctions } from '../../../data/cssFunctions.js';
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
            const caret = input.selectionStart || 0;

            // --- Function parameter suggestions ---
            const beforeCaret = val.slice(0, caret);
            const openIdx = beforeCaret.lastIndexOf('(');
            const closeIdx = val.indexOf(')', openIdx);
            if (openIdx !== -1 && (closeIdx === -1 || caret <= closeIdx)) {
                const fnMatch = beforeCaret.slice(0, openIdx).match(/([a-zA-Z-]+)\s*$/);
                const fnName = fnMatch ? fnMatch[1] : null;
                const fnMeta = fnName ? cssFunctions[fnName] : null;
                if (fnMeta) {
                    const paramsBefore = beforeCaret.slice(openIdx + 1);
                    const paramIndex = paramsBefore.split(/,(?![^()]*\))/).length - 1;
                    const allParams = val.slice(openIdx + 1, closeIdx === -1 ? val.length : closeIdx).split(/,(?![^()]*\))/);
                    const currentParam = (allParams[paramIndex] || '').trim();
                    const tokenType = fnMeta.params[paramIndex] || fnMeta.params[fnMeta.params.length - 1];
                    let suggestions = [];
                    if (tokenType === '[color]') {
                        suggestions = cssProps.colorNames || [];
                    } else if (tokenType === '[angle]') {
                        suggestions = ['to top', 'to bottom', 'to left', 'to right', '0deg', '45deg', '90deg', '180deg'];
                    }
                    return suggestions.filter(s => s.toLowerCase().startsWith(currentParam.toLowerCase()));
                }
            }

            // --- Standard token suggestions ---
            const tokens = val.trim() === '' ? [] : val.trim().split(/\s+/);
            if (val.endsWith(' ')) tokens.push('');
            const current = tokens.length ? tokens[tokens.length - 1].toLowerCase() : '';
            const usedTokens = new Set(tokens.slice(0, -1).map(t => t.toLowerCase()));
            const suggestions = new Set();
            const functionTokens = new Set();
            (this.meta.values || []).forEach(tok => {
                if (tok.startsWith('[fn:')) {
                    functionTokens.add(tok.slice(4, -1));
                }
            });

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
                        const fnName = v.slice(4, -1);
                        if (cssFunctions[fnName]) functionTokens.add(fnName);
                    } else if (!v.startsWith('[')) {
                        suggestions.add(v);
                    }
                });
            });

            functionTokens.forEach(fn => suggestions.add(fn + '()'));
            staticOptions.forEach(opt => suggestions.add(opt));

            return Array.from(suggestions).filter(s => {
                const lower = s.toLowerCase();
                if (usedTokens.has(lower)) return false;
                return lower.startsWith(current);
            });
        };

        const applySuggestion = (sugg) => {
            const text = input.value;
            const caret = input.selectionStart || 0;
            const beforeCaret = text.slice(0, caret);
            const openIdx = beforeCaret.lastIndexOf('(');
            const closeIdx = text.indexOf(')', openIdx);
            if (openIdx !== -1 && (closeIdx === -1 || caret <= closeIdx)) {
                const fnMatch = beforeCaret.slice(0, openIdx).match(/([a-zA-Z-]+)\s*$/);
                const fnName = fnMatch ? fnMatch[1] : null;
                const fnMeta = fnName ? cssFunctions[fnName] : null;
                if (fnMeta) {
                    const paramsBefore = beforeCaret.slice(openIdx + 1);
                    const paramIndex = paramsBefore.split(/,(?![^()]*\))/).length - 1;
                    const fullParams = text.slice(openIdx + 1, closeIdx === -1 ? text.length : closeIdx).split(/,(?![^()]*\))/);
                    fullParams[paramIndex] = sugg;
                    const newInside = fullParams.map(p => p.trim()).join(', ');
                    const after = closeIdx === -1 ? ')' : text.slice(closeIdx);
                    input.value = text.slice(0, openIdx + 1) + newInside + after;
                    const parts = newInside.split(/,(?![^()]*\))/).slice(0, paramIndex + 1);
                    const newPos = openIdx + 1 + parts.join(', ').length + (paramIndex);
                    input.setSelectionRange(newPos, newPos);
                    suggestionBox.hide();
                    input.focus();
                    this.onChange(input.value.trim());
                    return;
                }
            }

            // --- Default token replacement ---
            const tokens = text.trim() === '' ? [] : text.trim().split(/\s+/);
            const editingIndex = text.endsWith(' ') ? tokens.length : tokens.length - 1;

            if (sugg.endsWith('()')) {
                tokens[editingIndex] = sugg;
                input.value = tokens.join(' ');
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


import { TbaseControl } from './TbaseControl.js';
import { cssProps } from '../../../data/cssProperties.js';

export class TcompoundValueControl extends TbaseControl {
    render() {
        const container = document.createElement("div");
        container.style.position = 'relative';

        const input = document.createElement("input");
        input.type = "text";
        input.value = this.initialValue;
        input.placeholder = this.meta.syntax || "Değerleri boşlukla ayırarak girin...";
        container.appendChild(input);

        const suggestionBox = document.createElement("div");
        suggestionBox.className = "suggestion-box"; // CSS için
        Object.assign(suggestionBox.style, {
            position: 'absolute', top: '100%', left: 0, width: '100%',
            border: '1px solid #ccc', background: '#fff', maxHeight: '150px',
            overflowY: 'auto', zIndex: '1000', display: 'none', boxSizing: 'border-box'
        });
        container.appendChild(suggestionBox);

        const getSuggestions = () => {
            const currentText = input.value;
            const parts = currentText.split(/\s+/);
            const currentPart = currentText.endsWith(' ') ? '' : parts.pop() || '';
            const suggestionSet = new Set();
            
            (this.meta.values || []).forEach(token => {
                if (token.startsWith('[prop:')) {
                    const subPropName = token.slice(6, -1);
                    const subMeta = cssProps.properties[subPropName];
                    if (subMeta) {
                        (subMeta.values || []).forEach(val => {
                            if (val === '[color]') {
                                cssProps.colorNames.forEach(c => suggestionSet.add(c));
                            } else if (val === '[family-name]') {
                                cssProps.familyNames.forEach(f => suggestionSet.add(f));
                            } else if (!val.startsWith('[')) {
                                suggestionSet.add(val);
                            }
                        });
                    }
                } else if (!token.startsWith('[')) {
                    suggestionSet.add(token);
                }
            });

            return Array.from(suggestionSet).filter(s => s.toLowerCase().startsWith(currentPart.toLowerCase()));
        };

        const updateSuggestions = () => {
            const suggestions = getSuggestions();
            suggestionBox.innerHTML = "";
            if (suggestions.length === 0) {
                suggestionBox.style.display = "none";
                return;
            }
            
            suggestions.forEach(sugg => {
                const item = document.createElement("div");
                item.className = "suggestion-item"; // CSS için
                item.textContent = sugg;
                item.style.padding = '5px';
                item.style.cursor = 'pointer';
                
                item.addEventListener("mousedown", (e) => {
                    e.preventDefault();
                    let parts = input.value.split(/\s+/);
                    if (input.value.endsWith(' ')) {
                        parts.push(sugg);
                    } else {
                        parts[parts.length - 1] = sugg;
                    }
                    input.value = parts.join(" ") + " ";
                    suggestionBox.style.display = "none";
                    input.focus();
                    this.onChange(input.value);
                });
                suggestionBox.appendChild(item);
            });
            suggestionBox.style.display = "block";
        };

        input.addEventListener("input", updateSuggestions);
        input.addEventListener("change", () => this.onChange(input.value));
        input.addEventListener("blur", () => setTimeout(() => suggestionBox.style.display = "none", 200));

        return container;
    }
}

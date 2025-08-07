
import { cssProps } from '../../../data/cssProperties.js';
import { TbaseControl } from './TbaseControl.js';
// --- OTOMATİK TAMAMLAMA KONTROLÜ ---
export class TautoCompleteControl extends TbaseControl {
    constructor(styleProp, values, targetElement, onChange) {
        super(styleProp, { values }, targetElement, onChange);
        this.values = values;
    }

    render() {
        const container = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.initialValue;
        
        const dataListId = `${this.styleProp}-list-${Math.random().toString(36).substr(2, 9)}`;
        input.setAttribute('list', dataListId);
        
        const dataList = document.createElement('datalist');
        dataList.id = dataListId;
        
       this.values.forEach(val => {
            const option = document.createElement('option');
            option.value = val.startsWith('[fn:') && val.endsWith(']')
                ? val.slice(4, -1) + '()'
                : val;
            dataList.appendChild(option);
        });

        input.addEventListener('change', () => {
            let val = input.value.trim();

            // Normalize [fn:*] tokens or bare function calls
            const fnTokenMatch = val.match(/^\[fn:([a-zA-Z-]+)\]$/);
            const fnCallMatch = val.match(/^([a-zA-Z-]+)\(\)$/);
            const fnName = fnTokenMatch ? fnTokenMatch[1] : (fnCallMatch ? fnCallMatch[1] : null);

            if (fnName) {
                const template = (cssProps.functions && cssProps.functions[fnName]) || `${fnName}()`;
                input.value = template;
                val = template;

                const placeholderMatch = /<[^>]+>/.exec(template);
                if (placeholderMatch) {
                    const start = placeholderMatch.index + 1;
                    const end = start + placeholderMatch[0].length - 2;
                    input.setSelectionRange(start, end);
                } else {
                    const pos = template.indexOf('()') + 1;
                    if (pos > 0) input.setSelectionRange(pos, pos);
                }
                input.focus();
            }

            this.onChange(val);
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Tab') {
                const value = input.value;
                const placeholders = Array.from(value.matchAll(/<[^>]+>/g));
                if (placeholders.length) {
                    const idx = placeholders.findIndex(p => input.selectionStart >= p.index && input.selectionStart <= p.index + p[0].length);
                    if (idx > -1 && idx < placeholders.length - 1) {
                        e.preventDefault();
                        const ph = placeholders[idx + 1];
                        input.setSelectionRange(ph.index + 1, ph.index + ph[0].length - 1);
                    } else if (idx === placeholders.length - 1) {
                        e.preventDefault();
                        const end = value.length;
                        input.setSelectionRange(end, end);
                    }
                }
            }
        });
        
        container.append(input, dataList);
        return container;
    }
}
window.TautoCompleteControl = TautoCompleteControl;


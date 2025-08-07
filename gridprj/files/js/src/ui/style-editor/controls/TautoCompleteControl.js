
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
            if (val.startsWith('[fn:') && val.endsWith(']')) {
                val = val.slice(4, -1) + '()';
                input.value = val;
            }
            this.onChange(val);
            if (val.endsWith('()')) {
                const pos = val.indexOf('()') + 1;
                input.setSelectionRange(pos, pos);
                input.focus();
            }
        });
        
        container.append(input, dataList);
        return container;
    }
}
window.TautoCompleteControl = TautoCompleteControl;


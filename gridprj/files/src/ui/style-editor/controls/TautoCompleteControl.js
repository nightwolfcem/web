
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
            option.value = val;
            dataList.appendChild(option);
        });

        input.addEventListener('change', () => this.onChange(input.value));
        
        container.append(input, dataList);
        return container;
    }
}


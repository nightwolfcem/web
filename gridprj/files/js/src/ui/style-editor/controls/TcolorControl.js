// Bu dosya, bir CSS özelliğini düzenlemek için akıllı UI kontrolleri oluşturan sınıfları içerir.
// Her kontrol, özelliğin türüne göre (renk, sayı, bileşik değer vb.) özelleşmiştir.
import { TbaseControl } from './TbaseControl.js';
import { TtabbedColorPicker } from '../../colorpicker/TtabbedColorPicker.js';
// Renk isimleri listesi için cssProps'u ekliyoruz.
import { cssProps } from '../../../data/cssProperties.js';

export class TcolorControl extends TbaseControl {
    render() {
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; align-items: center; gap: 5px;';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = this.initialValue;
        textInput.style.flex = '1';

        // Hazır CSS renk isimlerini sunmak için datalist kullanıyoruz.
        const listId = `${this.styleProp}-colors-${Math.random().toString(36).slice(2)}`;
        textInput.setAttribute('list', listId);
        const dataList = document.createElement('datalist');
        dataList.id = listId;
        (cssProps.colorNames || []).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            dataList.appendChild(opt);
        });
        
        const colorBox = document.createElement('div');
        colorBox.style.cssText = 'width: 28px; height: 28px; border: 1px solid #888; cursor: pointer;';
        colorBox.style.backgroundColor = this.initialValue;

        // İki yönlü veri bağlama
        textInput.addEventListener('change', () => {
            colorBox.style.backgroundColor = textInput.value;
            this.onChange(textInput.value);
        });

        colorBox.addEventListener('click', () => {
            const picker = TtabbedColorPicker.getInstance({
                targetInput: textInput,
                defaultColor: textInput.value,
                onChange: (color) => {
                    colorBox.style.backgroundColor = color;
                    textInput.value = color;
                    this.onChange(color);
                }
            });
            picker.popup(colorBox);
            picker.show();
        });

        container.append(textInput, colorBox, dataList);
        return container;
    }
}
window.TcolorControl = TcolorControl;
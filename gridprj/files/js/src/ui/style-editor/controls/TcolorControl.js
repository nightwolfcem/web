// Bu dosya, bir CSS özelliğini düzenlemek için akıllı UI kontrolleri oluşturan sınıfları içerir.
// Her kontrol, özelliğin türüne göre (renk, sayı, bileşik değer vb.) özelleşmiştir.
import { TbaseControl } from './TbaseControl.js';
import { TtabbedColorPicker } from '../../colorpicker/TtabbedColorPicker.js';
// Renk isimleri listesi için cssProps'u ekliyoruz.
import { cssProps } from '../../../data/cssProperties.js';

export class TcolorControl extends TbaseControl {
    render() {
        const container = document.createElement('div');
        // Match the property editor's row height and avoid extra borders
        // so that color controls do not stretch the table rows.
        container.style.cssText = 'display:flex;align-items:center;height:100%;';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = this.initialValue;
        // Remove default borders/padding and fit the row height
        textInput.style.cssText = 'flex:1;height:100%;box-sizing:border-box;border:none;margin:0;padding:0;border-right:1px solid #ccc;';

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
        // Use a compact swatch that aligns with the editor row size
        colorBox.style.cssText = 'width:18px;height:18px;cursor:pointer;box-sizing:border-box;border:1px solid #ccc;';
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
            picker.showModal();
        });

        container.append(textInput, colorBox, dataList);
        return container;
    }
}
window.TcolorControl = TcolorControl;
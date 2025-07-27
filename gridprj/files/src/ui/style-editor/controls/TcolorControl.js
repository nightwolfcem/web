// Bu dosya, bir CSS özelliğini düzenlemek için akıllı UI kontrolleri oluşturan sınıfları içerir.
// Her kontrol, özelliğin türüne göre (renk, sayı, bileşik değer vb.) özelleşmiştir.
import { TbaseControl } from './TbaseControl.js';
import { TsingleColorPicker } from '../../colorpicker/TsingleColorPicker.js';

export class TcolorControl extends TbaseControl {
    render() {
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; align-items: center; gap: 5px;';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = this.initialValue;
        textInput.style.flex = '1';
        
        const colorBox = document.createElement('div');
        colorBox.style.cssText = 'width: 28px; height: 28px; border: 1px solid #888; cursor: pointer;';
        colorBox.style.backgroundColor = this.initialValue;

        // İki yönlü veri bağlama
        textInput.addEventListener('change', () => {
            colorBox.style.backgroundColor = textInput.value;
            this.onChange(textInput.value);
        });

        colorBox.addEventListener('click', () => {
            // Merkezi PickerManager'ı kullanarak TsingleColorPicker'ı açıyoruz.
            TsingleColorPicker.pick(TsingleColorPicker, {
                targetInput: textInput, // Picker'ı doğrudan input'a bağlıyoruz
                defaultColor: textInput.value,
                onChange: (color) => {
                    colorBox.style.backgroundColor = color;
                    this.onChange(color);
                }
            });
        });

        container.append(textInput, colorBox);
        return container;
    }
}

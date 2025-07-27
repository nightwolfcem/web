import { ControlFactory } from './ControlFactory.js';
import { cssProps } from '../../data/cssProperties.js';

/**
 * StyleEditor: Bir hedef elementin CSS özelliklerini dinamik olarak
 * düzenlemek için bir arayüz oluşturan ana sınıf.
 */
export class StyleEditor {
    /**
     * @param {HTMLElement} targetElement - Stilleri düzenlenecek hedef element.
     * @param {HTMLElement} editorContainer - Düzenleme arayüzünün yerleştirileceği konteyner.
     */
    constructor(targetElement, editorContainer) {
        if (!targetElement || !editorContainer) {
            throw new Error("StyleEditor için hedef element ve konteyner gereklidir.");
        }
        this.targetElement = targetElement;
        this.editorContainer = editorContainer;
        this.currentProp = '';
    }

    /**
     * Belirli bir CSS özelliği için düzenleme arayüzünü oluşturur ve gösterir.
     * @param {string} styleProp - Düzenlenecek CSS özelliği (örn: 'backgroundColor').
     */
    renderControl(styleProp) {
        this.currentProp = styleProp;
        this.editorContainer.innerHTML = ''; // Önceki kontrolü temizle

        const meta = cssProps.properties[styleProp];
        if (!meta) {
            this.editorContainer.textContent = `Hata: "${styleProp}" özelliği desteklenmiyor.`;
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'control-wrapper';

        const label = document.createElement('label');
        label.textContent = `${styleProp}:`;
        wrapper.appendChild(label);

        // Değer değiştiğinde hedef elementin stilini güncelleyecek olan callback fonksiyonu
        const onChangeCallback = (newValue) => {
            this.targetElement.style[styleProp] = newValue;
        };

        // Fabrikayı kullanarak doğru kontrolü oluştur
        const control = ControlFactory.createControl(styleProp, this.targetElement, onChangeCallback);
        wrapper.appendChild(control);

        this.editorContainer.appendChild(wrapper);
    }
}

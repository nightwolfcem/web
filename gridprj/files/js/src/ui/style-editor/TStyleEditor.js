import { TControlFactory } from './TControlFactory.js';
import { cssProps } from '../../data/cssProperties.js';
import { TBoxModelPanel } from './TBoxModelPanel.js';

export class TStyleEditor {
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

    
    bindPropertySelector(selectEl, triggerEl) {
        if (!selectEl) return;

        // Select içerisini tüm bilinen CSS özellikleriyle doldur.
        selectEl.innerHTML = '';
        Object.keys(cssProps.properties).forEach(prop => {
            const opt = document.createElement('option');
            opt.value = prop;
            opt.textContent = prop;
            selectEl.appendChild(opt);
        });

        const loadSelected = () => {
            const selected = selectEl.value;
            if (selected) {
                this.renderControl(selected);
            }
        };

        if (triggerEl) {
            triggerEl.addEventListener('click', loadSelected);
        } else {
            selectEl.addEventListener('change', loadSelected);
        }
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
            if (typeof this.targetElement.style.setProperty === 'function') {
                this.targetElement.style.setProperty(styleProp, newValue);
            } else {
                this.targetElement.style[styleProp] = newValue;
            }
        };

        // Fabrikayı kullanarak doğru kontrolü oluştur
        const control = TControlFactory.createControl(styleProp, this.targetElement, onChangeCallback);
        wrapper.appendChild(control);

        this.editorContainer.appendChild(wrapper);
    }

    /**
     * Birden fazla CSS özelliğini tablo halinde düzenlemek için genel bir yardımcı.
     * Özellik adı solda, düzenleme kontrolü sağda yer alır.
     * Sonuç, içeriği gizli yerel bir "scrollbox" ile sarılmış olarak sunulur.
     * @param {string[]} propList - Düzenlenecek CSS özelliklerinin listesi.
     */
    renderProperties(propList) {
        this.editorContainer.innerHTML = '';

        const viewport = document.createElement('div');
        viewport.style.cssText = 'position:relative;height:300px;overflow:hidden;border:1px solid #ccc;';
        const content = document.createElement('div');
        content.style.cssText = 'position:absolute;top:0;left:0;right:0;';
        viewport.appendChild(content);

        propList.forEach(prop => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;padding:4px 8px;gap:8px;';

            const label = document.createElement('div');
            label.textContent = prop;
            label.style.cssText = 'flex:1;white-space:nowrap;';

            const controlWrap = document.createElement('div');
            controlWrap.style.cssText = 'flex:1;';
            const control = TControlFactory.createControl(prop, this.targetElement, val => {
                if (typeof this.targetElement.style.setProperty === 'function') {
                    this.targetElement.style.setProperty(prop, val);
                } else {
                    this.targetElement.style[prop] = val;
                }
            });
            controlWrap.appendChild(control);

            row.append(label, controlWrap);
            content.appendChild(row);
        });

        // Basit özel scroll çubuğu
        const track = document.createElement('div');
        track.style.cssText = 'position:absolute;top:0;right:2px;width:8px;height:100%;background:rgba(0,0,0,0.1);border-radius:4px;';
        const thumb = document.createElement('div');
        thumb.style.cssText = 'position:absolute;top:0;left:0;width:100%;background:rgba(0,0,0,0.4);border-radius:4px;';
        track.appendChild(thumb);
        viewport.appendChild(track);

        let contentTop = 0;
        const updateScrollbar = () => {
            const total = content.scrollHeight;
            const view = viewport.clientHeight;
            const maxScroll = total - view;
            if (maxScroll <= 0) {
                track.style.display = 'none';
                contentTop = 0;
                content.style.top = '0px';
                return;
            }
            track.style.display = '';
            const ratio = view / total;
            const thumbHeight = Math.max(ratio * view, 20);
            thumb.style.height = thumbHeight + 'px';
            const thumbMax = view - thumbHeight;
            thumb.style.top = (-contentTop / maxScroll) * thumbMax + 'px';
        };

        const scrollBy = delta => {
            const total = content.scrollHeight;
            const view = viewport.clientHeight;
            const maxScroll = total - view;
            contentTop = Math.min(0, Math.max(-maxScroll, contentTop - delta));
            content.style.top = contentTop + 'px';
            updateScrollbar();
        };

        viewport.addEventListener('wheel', e => {
            e.preventDefault();
            scrollBy(e.deltaY);
        });

        let startY = 0;
        let startTop = 0;
        const onMouseMove = e => {
            const view = viewport.clientHeight;
            const thumbHeight = thumb.offsetHeight;
            const thumbMax = view - thumbHeight;
            let newTop = startTop + (e.clientY - startY);
            newTop = Math.max(0, Math.min(thumbMax, newTop));
            thumb.style.top = newTop + 'px';
            const total = content.scrollHeight;
            const maxScroll = total - view;
            contentTop = -(newTop / thumbMax) * maxScroll;
            content.style.top = contentTop + 'px';
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        thumb.addEventListener('mousedown', e => {
            e.preventDefault();
            startY = e.clientY;
            startTop = parseFloat(thumb.style.top) || 0;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        requestAnimationFrame(updateScrollbar);
        this.editorContainer.appendChild(viewport);
    }

    /**
     * Tüm bilinen CSS özellikleri için bir düzenleme listesi oluşturur.
     */
    renderAll() {
        this.renderProperties(Object.keys(cssProps.properties));
    }

    /**
     * Kutu modelini görsel olarak düzenlemek için özel bir panel oluşturur.
     */
    renderBoxModel() {
        this.editorContainer.innerHTML = '';
        this.boxModelPanel = new TBoxModelPanel(this.targetElement, this.editorContainer);
    }
}

window.TStyleEditor = TStyleEditor;


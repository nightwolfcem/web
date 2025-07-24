import { TbasePicker } from './TbasePicker.js';
import { TsingleColorPicker } from './TsingleColorPicker.js';
import { TgradientPicker } from './TgradientPicker.js';
import { TmultiRadialGradientPicker } from './TmultiRadialGradientPicker.js';

export class TtabbedColorPicker extends TbasePicker {
    constructor(opts = {}) {
        const defaultOptions = {
            title: 'Gelişmiş Renk Seçici',
            width: 450, // Biraz daha geniş
            height: 380, // Biraz daha yüksek
            defaultPicker: 'single', // 'single', 'gradient', 'multiRadial'
            ...opts
        };
        super(defaultOptions);

        this.pickers = {};
        this.activePickerType = defaultOptions.defaultPicker;
    }

    buildSpecificUI() {
        // Bu ana picker'ın kendi preview box'ına ihtiyacı yok, onu gizleyelim.
        this.previewBox.style.display = 'none';

        // Sekme (Tab) Butonlarını Oluştur
        this.tabContainer = document.createElement('div');
        this.tabContainer.style.cssText = 'display: flex; gap: 1px; background-color: #ccc; padding: 1px;';
        this.contentPanel.appendChild(this.tabContainer);

        this.tabButtons = {
            single: this.createTabButton('Renk'),
            gradient: this.createTabButton('Gradyan'),
            multiRadial: this.createTabButton('Çoklu Radyal')
        };

        Object.entries(this.tabButtons).forEach(([type, button]) => {
            this.tabContainer.appendChild(button);
            button.onclick = () => this.switchTab(type);
        });

        // Picker'ların içeriğinin gösterileceği ana alan
        this.pickerContainer = document.createElement('div');
        this.pickerContainer.style.cssText = 'border: 1px solid #ccc; border-top: none; padding: 5px;';
        this.contentPanel.appendChild(this.pickerContainer);

        // Her bir picker'ı kendi container'ı içinde oluştur
        this.createPickers();

        // Varsayılan sekmeyi göster
        this.switchTab(this.activePickerType);
    }

    createTabButton(text) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = 'flex: 1; padding: 8px; border: none; background-color: #f0f0f0; cursor: pointer;';
        return button;
    }
    
    createPickers() {
        const commonOptions = {
            parent: this.pickerContainer, // Tüm picker'lar bu container'a gömülecek
            onChange: (value) => {
                // Herhangi bir alt picker'dan gelen değeri ana onChange'e iletiyoruz
                this.onChange(value);
                if (this.targetElement) this.targetElement.style[this.targetStyle] = value;
                if (this.targetInput) this.targetInput.value = value;
            }
        };

        this.pickers.single = new TsingleColorPicker({ ...commonOptions, title: '' });
        this.pickers.gradient = new TgradientPicker({ ...commonOptions, title: '' });
        this.pickers.multiRadial = new TmultiRadialGradientPicker({ ...commonOptions, title: '' });

        // Oluşturulan picker'ları body'ye ekleyerek DOM'a dahil ediyoruz
        Object.values(this.pickers).forEach(picker => {
            picker.body();
            picker.htmlObject.style.position = 'relative'; // Gömülü mod için
            picker.htmlObject.style.border = 'none';
            picker.htmlObject.style.boxShadow = 'none';
            picker.htmlObject.style.width = '100%';
            picker.htmlObject.style.height = '100%';
        });
    }

    switchTab(type) {
        this.activePickerType = type;
        // Tüm picker'ları gizle
        Object.values(this.pickers).forEach(picker => picker.hide());
        // Tüm butonların stilini sıfırla
        Object.values(this.tabButtons).forEach(button => {
            button.style.backgroundColor = '#f0f0f0';
            button.style.fontWeight = 'normal';
        });

        // Sadece aktif olanı göster ve butonunu vurgula
        this.pickers[type].show();
        this.tabButtons[type].style.backgroundColor = '#fff';
        this.tabButtons[type].style.fontWeight = 'bold';
    }

    // Değer atama (set) ve input'a bağlanma (attach) metotları
    set(value) {
        if (typeof value !== 'string') return;
        
        // Gelen değerin türünü analiz edip doğru sekmeyi açalım
        if (value.includes('radial-gradient')) {
            this.switchTab('multiRadial');
            this.pickers.multiRadial.points = this.parseMultiRadial(value); // Değeri parse et
            this.pickers.multiRadial.renderPoints();
            this.pickers.multiRadial.renderStopButtons();
        } else if (value.includes('gradient')) {
            this.switchTab('gradient');
            // TgradientPicker'ın parse metodu varsa onu kullanabiliriz.
            // Şimdilik basitçe bırakalım, TgradientPicker kendi içinde halleder.
        } else {
            this.switchTab('single');
            this.pickers.single.hsva = Tcolor.hexToHsva(Tcolor.toHex(value));
            this.pickers.single.updatePreview();
        }
    }

    attach(input) {
        this.targetInput = input;
        input.addEventListener('focus', () => this.show());
        input.addEventListener('change', () => this.set(input.value));
        this.set(input.value); // Başlangıç değerini ayarla
    }
    
    // updatePreview, alt picker'lar tarafından yönetildiği için burada boş bırakılabilir.
    updatePreview() {
        // No-op
    }
}
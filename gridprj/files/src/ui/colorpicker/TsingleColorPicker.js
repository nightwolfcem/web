import { TbaseColorPicker } from './TbaseColorPicker.js';
import { colorNameToHex } from './utils.js';

export class TsingleColorPicker extends TbaseColorPicker {
 static #inst; // Singleton örneğini tutmak için özel statik alan

    /**
     * Sınıfın tek bir örneğini alır veya oluşturur (Singleton Deseni).
     * Eğer örnek zaten varsa, yeni seçeneklerle günceller.
     * @param {object} opts - Picker için yeni seçenekler.
     */
    static getInstance(opts = {}) {
        if (!this.#inst || (opts.parent && this.#inst.parent !== opts.parent)) {
            this.#inst = new TsingleColorPicker(opts);
        } else {
            // DÜZELTME: Mevcut singleton'ı yeni seçeneklerle yeniden yapılandır.
            // Bu, .pick() metodunun her çağrıldığında doğru çalışmasını sağlar.
            this.#inst.targetElement = opts.targetElement ?? null;
            this.#inst.targetInput = opts.targetInput ?? null;
            this.#inst.onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
            this.#inst.onClose = typeof opts.onClose === 'function' ? opts.onClose : () => {};
            
            // Yeni rengi ayarla, bu UI'ı da güncelleyecektir.
            this.#inst.set(opts.defaultColor || '#ff0000');
        }
        return this.#inst;
    }

    /**
     * Renk seçiciyi tek satırda oluşturur, hedefe bağlar ve gösterir.
     * @param {object} opts - targetInput, targetElement, defaultColor gibi seçenekler.
     */
    static pick(opts = {}) {
        const p = this.getInstance(opts); // Bu metot artık örneği doğru bir şekilde güncelliyor.
        
        if (opts.targetInput) p.attach(opts.targetInput);
        
        p.popup(opts.targetElement || opts.targetInput || null);
        p.show();
        return p;
    }

    constructor(opts = {}) {
        super({
            title: "Renk Seçici",
            defaultColor: "#ff0000",
            ...opts
        });

        const detected =
            (this.targetInput && this.targetInput.value) ||
            (this.targetElement && getComputedStyle(this.targetElement)[this.targetStyle]) ||
            opts.defaultColor;

        this.set(detected);
    }
    
    /**
     * Picker'ın rengini programatik olarak ayarlar. Gelen değer HEX, RGB veya renk ismi olabilir.
     * @param {string} value - Ayarlanacak renk değeri.
     */
    set(value) {
        if (!value || typeof value !== 'string') {
            value = '#000000';
        }
        // Renk ismini HEX'e çevir, HEX ise dokunma.
        const startHex = colorNameToHex(value);
        this.initData(startHex); // initData, BaseColorPicker'dan gelir ve hsva'yı ayarlar.
        
        // Eğer UI daha önce oluşturulmuşsa (loaded=true), görsel elemanları güncelle.
        if (this.loaded) {
            this.updatePreview();
            this._drawHueSlider();
            this._drawSVCanvas();
        }
    }
}
window.TsingleColorPicker = TsingleColorPicker;
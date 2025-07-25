import { TbaseColorPicker } from './TbaseColorPicker.js';
import { Tcolor } from '../../utils/colorUtils.js';

export class TsingleColorPicker extends TbaseColorPicker {
    static #inst; // Singleton örneğini tutacak özel statik alan

    /**
     * Sınıfın tek bir örneğini alır veya oluşturur (Singleton Deseni).
     */
    static getInstance(opts = {}) {
        if (!this.#inst) {
            this.#inst = new TsingleColorPicker(opts);
        }
        return this.#inst;
    }

    /**
     * Renk seçiciyi tek satırda oluşturur, hedefe bağlar ve gösterir.
     */
    static pick(opts = {}) {
        const p = this.getInstance(opts);
        if (opts.targetInput) p.attach(opts.targetInput);
        if (opts.targetElement) p.targetElement = opts.targetElement;
        
        p.popup(opts.targetElement || opts.targetInput || null);
        p.show();
        return p;
    }

    constructor(opts = {}) {
        super({
            title: "Single Color Picker",
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
     * Picker'ı bir input elementine iki yönlü bağlar.
     */
    attach(input) {
        this.targetInput = input;
        input.addEventListener('change', e => this.set(e.target.value));
        this.onChange = value => {
            if (this.targetInput) this.targetInput.value = value;
        };
        this.set(input.value);
    }

    /**
     * Picker'ın rengini ayarlar. Gelen değer HEX, RGB veya renk ismi olabilir.
     */
    set(value) {
        if (!value || typeof value !== 'string') {
            value = '#000000';
        }
        const startHex = Tcolor.toHex(value);
        this.initData(startHex); // initData TbaseColorPicker'dan gelir (hsva'yı ayarlar)
        
        // Eğer UI oluşturulmuşsa, görsel elemanları güncelle
        if (this.loaded) {
            this.updatePreview();
            this._drawHueSlider();
            this._drawSVCanvas(); // Bu metot private olduğu için TbaseColorPicker'da protected olmalıydı
        }
    }
}
window.TsingleColorPicker = TsingleColorPicker;
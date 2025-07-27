import { TbaseColorPicker } from './TbaseColorPicker.js';
import { colorNameToHex } from './utils.js';
import { Tcolor } from '../../utils/colorUtils.js';

export class TsingleColorPicker extends TbaseColorPicker {
 static #inst; // Singleton örneğini tutmak için özel statik alan

    /**
     * Sınıfın tek bir örneğini alır veya oluşturur (Singleton Deseni).
     * Eğer örnek zaten varsa, yeni seçeneklerle günceller.
     * @param {object} opts - Picker için yeni seçenekler.
     */
    static getInstance(opts = {}) {
        const inst = super.getInstance(opts);
        inst.targetElement = opts.targetElement ?? inst.targetElement ?? null;
        inst.targetInput = opts.targetInput ?? inst.targetInput ?? null;
        inst.onChange = typeof opts.onChange === 'function' ? opts.onChange : inst.onChange;
        inst.onClose = typeof opts.onClose === 'function' ? opts.onClose : inst.onClose;
        if (opts.defaultColor) {
            inst.set(opts.defaultColor);
        }
        return inst;
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
        const rgba = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
        if (rgba) {
            const r = parseInt(rgba[1]), g = parseInt(rgba[2]), b = parseInt(rgba[3]);
            const a = rgba[4] !== undefined ? parseFloat(rgba[4]) : 1;
            this.hsva = Tcolor.rgbToHsva(r, g, b, a);
        } else {
            const hex = Tcolor.toHex(colorNameToHex(value));
            this.initData(hex);
        }
        
        // Eğer UI daha önce oluşturulmuşsa (loaded=true), görsel elemanları güncelle.
        if (this.loaded) {
            this.updatePreview();
            this._drawHueSlider();
            this._drawSVCanvas();
        }
    }
}
window.TsingleColorPicker = TsingleColorPicker;
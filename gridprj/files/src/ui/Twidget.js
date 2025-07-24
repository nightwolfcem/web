import { TpositionedElement } from '../dom/TpositionedElement.js';

/**
 * Twidget: Basit state ve data yönetimi içeren temel bir UI bileşeni.
 * Genellikle daha karmaşık bileşenler için bir başlangıç noktası olarak kullanılır.
 */
export class Twidget extends TpositionedElement {
    /**
     * @param {string|HTMLElement} tagOrElement - Oluşturulacak HTML tag'ı veya mevcut bir element.
     * @param {Object} options - TpositionedElement'ten gelen tüm seçeneklere ek olarak:
     * @param {Object} [options.data={}] - Bileşenin statik verileri.
     * @param {Object} [options.state={}] - Bileşenin dinamik, değişebilir durumu.
     * @param {Function} [options.onCreate] - Bileşen oluşturulduğunda çağrılacak fonksiyon.
     * @param {string} [options.parentLayerName="widget"] - Ekleneceği varsayılan katman.
     */
    constructor(tagOrElement = "div", options = {}) {
        // Varsayılan parentLayerName'i ayarla
        const opts = {
            parentLayerName: "widget",
            ...options
        };
        super(tagOrElement, opts);

        this.data = opts.data || {};
        this.state = opts.state || {};

        // Lifecycle kancası (hook)
        if (typeof opts.onCreate === 'function') {
            opts.onCreate.call(this);
        }
    }

    /**
     * Bileşenin durumunu günceller ve onStateChange kancasını tetikler.
     * @param {Object} newState - Yeni durum (mevcut durumla birleştirilir).
     */
    setState(newState) {
        Object.assign(this.state, newState);
        if (typeof this.onStateChange === "function") {
            this.onStateChange(this.state);
        }
    }

    /**
     * Bileşenin verilerini günceller ve onDataChange kancasını tetikler.
     * @param {Object} newData - Yeni veri (mevcut veriyle birleştirilir).
     */
    setData(newData) {
        Object.assign(this.data, newData);
        if (typeof this.onDataChange === "function") {
            this.onDataChange(this.data);
        }
    }

    /**
     * Olay dinleyicisi eklemek için bir kısayol.
     * @param {string} event - Olay adı (örn: 'click').
     * @param {Function} handler - Olay işleyici fonksiyon.
     * @returns {this}
     */
    on(event, handler) {
        this.htmlObject.addEventListener(event, handler);
        return this;
    }

    /**
     * Olay dinleyicisini kaldırmak için bir kısayol.
     * @param {string} event - Olay adı.
     * @param {Function} handler - Olay işleyici fonksiyon.
     * @returns {this}
     */
    off(event, handler) {
        this.htmlObject.removeEventListener(event, handler);
        return this;
    }
}
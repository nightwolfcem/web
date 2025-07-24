import { TabsoluteElement } from '../dom/TabsoluteElement.js';

/**
 * Tstick: Bir hedef elemente "yapışan" ve sayfa hareketlerinde onu akıllıca takip eden bir element.
 * Tooltip, popover gibi UI bileşenleri için idealdir.
 * Performans için throttle mekanizması ve hedef görünürlüğünü kontrol için IntersectionObserver kullanır.
 */
export class Tstick extends TabsoluteElement {
    #observer = null; // IntersectionObserver örneğini tutmak için
    #isFollowing = false; // Olay dinleyicilerinin aktif olup olmadığını takip eder

    /**
     * @param {Object} options - TabsoluteElement'ten gelen tüm seçeneklere ek olarak:
     * @param {string} [options.content] - Yapışkan elementin içeriği.
     * @param {number} [options.throttleLimit=16] - Takip etme fonksiyonunun ne sıklıkla çalışacağını belirleyen limit (ms). 60fps için ~16ms.
     * @param {boolean} [options.hideOnTargetInvisible=true] - Hedef element ekrandan çıktığında otomatik olarak gizlensin mi?
     */
    constructor(options = {}) {
        super(options);
        
        this.htmlObject.classList.add('tstick');
        
        if (options.content) {
            this.htmlObject.innerHTML = options.content;
        }

        this.throttleLimit = options.throttleLimit ?? 16;
        this.hideOnTargetInvisible = options.hideOnTargetInvisible ?? true;
        let lastCall = 0;
        
        // Performans için throttle edilmiş takip fonksiyonu.
        // Bu sayede olaylar çok sık tetiklense bile fonksiyon saniyede en fazla ~60 kez çalışır.
        this._followHandler = () => {
            const now = Date.now();
            if (now - lastCall < this.throttleLimit) {
                return;
            }
            lastCall = now;
            
            if (this.targetElement && this.status.visible) {
                this.popup(); // TabsoluteElement'in popup metodu pozisyonu günceller.
            }
        };

        // Hedef elementin görünürlüğünü izlemek için IntersectionObserver kurulumu.
        // Bu, scroll olayını dinlemekten çok daha performanslıdır.
        if (this.hideOnTargetInvisible) {
            this.#observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        // Eğer hedef element viewport'a giriyorsa göster, çıkıyorsa gizle.
                        if (entry.isIntersecting) {
                            this.show();
                        } else {
                            this.hide();
                        }
                    });
                },
                { root: null, threshold: 0 } // root: null -> viewport'a göre izle
            );
        }

        // Eğer başlangıçta bir hedef element varsa, takibi başlat.
        if (this.targetElement) {
            this.startFollowing();
        }
    }

    /**
     * Takip etme ve görünürlük izleme mekanizmalarını başlatır.
     */
    startFollowing() {
        if (this.#isFollowing || !this.targetElement) return;

        window.addEventListener('scroll', this._followHandler, true);
        window.addEventListener('resize', this._followHandler, true);
        
        if (this.#observer) {
            this.#observer.observe(this.targetElement);
        }

        this.#isFollowing = true;
    }

    /**
     * Takip etme ve görünürlük izleme mekanizmalarını durdurur.
     */
    stopFollowing() {
        if (!this.#isFollowing) return;

        window.removeEventListener('scroll', this._followHandler, true);
        window.removeEventListener('resize', this._followHandler, true);

        if (this.#observer) {
            this.#observer.disconnect(); // Tüm gözlemleri durdurur
        }
        
        this.#isFollowing = false;
    }

    /**
     * Tstick elementini gösterir ve takibi (yeniden) başlatır.
     */
    show() {
        super.show(); // Ana sınıftaki show metodu (visible = true yapar)
        this.startFollowing();
        return this; // Zincirleme kullanım için (chaining)
    }

    /**
     * Tstick elementini gizler ve takibi durdurur.
     */
    hide() {
        super.hide(); // Ana sınıftaki hide metodu (visible = false yapar)
        this.stopFollowing();
        return this; // Zincirleme kullanım için
    }

    /**
     * Bileşen yok edildiğinde tüm olay dinleyicilerini ve observer'ları temizler.
     */
    destroy() {
        this.stopFollowing();
        super.destroy();
    }
}

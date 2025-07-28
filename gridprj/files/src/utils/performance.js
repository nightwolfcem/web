/**
 * Bir fonksiyonun belirli bir zaman aralığında en fazla bir kez çalışmasını sağlar.
 * Sık tetiklenen olaylarda (resize, scroll) performansı artırmak için kullanılır.
 * @param {Function} func - Çalışması kısıtlanacak fonksiyon.
 * @param {number} limit - Bekleme süresi (milisaniye).
 * @returns {Function} Throttled (kısıtlanmış) yeni fonksiyon.
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

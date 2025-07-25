// Çalıştırılacak fonksiyonları tutan dizi.
const loadFuncs = [];

/**
 * DOM tamamen yüklendiğinde çalıştırılmak üzere bir fonksiyon kaydeder.
 * @param {Function} func - DOM hazır olduğunda çalıştırılacak fonksiyon.
 */
export function onDOMLoad(func) {
    if (typeof func === 'function') {
        loadFuncs.push(func);
    }
}

// Ana yükleyici fonksiyon. Kayıtlı tüm fonksiyonları sırayla çalıştırır.
function runAll() {
    for (const func of loadFuncs) {
        try {
            func();
        } catch (e) {
            console.error("[Loader] Başlangıç fonksiyonu çalıştırılırken hata oluştu:", e);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
} else {
    runAll();
}
/**
 * Renk seçicilerin kullandığı genel yardımcı fonksiyonlar, sabitler ve sınıflar.
 * Bu modül, renk seçicinin görsel sunumu için gerekli araçları sağlar.
 */

/**
 * Verilen bir HEX renk koduna göre en iyi okunabilir metin rengini (siyah veya beyaz) döndürür.
 * @param {string} hex - # ile başlayan veya başlamayan 6 haneli HEX renk kodu.
 * @returns {'#000' | '#fff'} Siyah veya beyaz renk kodu.
 */
export function getContrastColor(hex) {
    if (hex.charAt(0) === "#") {
        hex = hex.slice(1);
    }
    const r = parseInt(hex.substr(0, 2), 16) || 0;
    const g = parseInt(hex.substr(2, 2), 16) || 0;
    const b = parseInt(hex.substr(4, 2), 16) || 0;
    // YIQ renk formülüne dayalı parlaklık hesaplaması
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000" : "#fff";
}

/**
 * CSS'te şeffaflığı temsil etmek için kullanılan dama tahtası desenini bir canvas olarak oluşturur.
 * @param {number} [size=10] - Her bir karenin piksel cinsinden boyutu.
 * @param {string} [color1='#fff'] - Birinci kare rengi.
 * @param {string} [color2='#ccc'] - İkinci kare rengi.
 * @returns {HTMLCanvasElement} Deseni içeren canvas elementi.
 */
export function createTransparencyPattern(size = 10, color1 = '#fff', color2 = '#ccc') {
    const canvas = document.createElement('canvas');
    canvas.width = size * 2;
    canvas.height = size * 2;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, size * 2, size * 2);
    
    ctx.fillStyle = color2;
    ctx.fillRect(0, 0, size, size);
    ctx.fillRect(size, size, size, size);
    
    return canvas;
}

// Oluşturulan deseni bir CSS `url()` olarak dışa aktar. Bu, tekrar tekrar oluşturulmasını önler.
const transparencyPatternUrl = `url(${createTransparencyPattern().toDataURL()})`;

/**
 * Bir elementin arka planına, şeffaflık deseninin üzerine bir renk veya gradyan katmanı ekler.
 */
export const translayer = {
    setForeColor: function(colorOrGradient, element) {
        // CSS background-image özelliği virgülle birden çok katman alabilir.
        // İlk katman renk/gradyan, ikinci katman şeffaflık deseni olur.
        element.style.backgroundImage = `${colorOrGradient}, ${transparencyPatternUrl}`;
        element.style.backgroundRepeat = 'no-repeat, repeat';
        element.style.backgroundPosition = 'center, top left';
    }
};

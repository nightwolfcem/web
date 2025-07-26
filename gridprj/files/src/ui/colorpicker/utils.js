/**
 * src/ui/colorpicker/utils.js (Düzeltilmiş)
 * Bu modül, renk seçicinin görsel sunumu için gerekli araçları sağlar.
 * translayer fonksiyonu, artık hem tek renkleri hem de gradyanları doğru şekilde işler.
 */

import { cssProps } from '../../data/cssProperties.js';

export function getContrastColor(hex) {
    if (hex.charAt(0) === "#") hex = hex.slice(1);
    const r = parseInt(hex.substr(0, 2), 16) || 0;
    const g = parseInt(hex.substr(2, 2), 16) || 0;
    const b = parseInt(hex.substr(4, 2), 16) || 0;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000" : "#fff";
}

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

const transparencyPatternUrl = `url(${createTransparencyPattern().toDataURL()})`;

export const translayer = {
    /**
     * Bir elementin arka planına, şeffaflık deseninin üzerine bir renk veya gradyan katmanı ekler.
     * @param {string} colorOrGradient - 'rgba(255,0,0,1)' gibi bir renk veya 'linear-gradient(...)' gibi bir gradyan.
     * @param {HTMLElement} element - Stil uygulanacak element.
     */
    setForeColor: function(colorOrGradient, element) {
        if (typeof colorOrGradient !== 'string') return;

        element.style.backgroundImage = `${colorOrGradient}, ${transparencyPatternUrl}`;
            element.style.backgroundColor = ''; // Düz rengi temizle
    
    }
};

/**
 * Verilen bir renk ismini HEX koduna çevirir.
 * @param {string} colorName - 'red', 'blue' gibi bir renk adı.
 * @returns {string} HEX formatında renk kodu.
 */
export function colorNameToHex(colorName) {
    // Renk isimleri listesini kontrol et
    if (!cssProps.colorNames.some(name => name.toLowerCase() === colorName.toLowerCase())) {
        return colorName; // Geçerli bir isim değilse, orijinal değeri döndür
    }
    const dummy = document.createElement("div");
    dummy.style.color = colorName;
    document.body.appendChild(dummy);
    const computed = getComputedStyle(dummy).color;
    document.body.removeChild(dummy);
    const rgb = computed.match(/\d+/g);
    if (rgb) {
        return "#" +
               parseInt(rgb[0]).toString(16).padStart(2, "0") +
               parseInt(rgb[1]).toString(16).padStart(2, "0") +
               parseInt(rgb[2]).toString(16).padStart(2, "0");
    }
    return colorName;
}

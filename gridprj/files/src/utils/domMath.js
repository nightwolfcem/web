/**
 * DOM ile ilgili matematiksel hesaplamalar ve birim dönüşümleri için yardımcı fonksiyonlar.
 */

// Birimden santimetreye dönüşüm oranları
const toCmRates = {
    'in': 2.54,
    'pc': 2.54 / 6,
    'pt': 2.54 / 72,
    'px': 2.54 / 96,
    'mm': 0.1,
    'q': 0.025,
    'cm': 1
};

// Santimetreden hedeflenen birime dönüşüm oranları
const fromCmRates = {
    'in': 1 / 2.54,
    'pc': 6 / 2.54,
    'pt': 72 / 2.54,
    'px': 96 / 2.54,
    'mm': 10,
    'q': 40,
    'cm': 1
};

/**
 * CSS uzunluk birimleri arasında güvenli bir şekilde dönüşüm yapar.
 * eval() kullanımı tamamen kaldırılmıştır.
 * @param {number|string} inputValue - Dönüştürülecek değer (örn: "10px" veya 10).
 * @param {string} [inputUnit] - Eğer inputValue number ise, giriş birimi (örn: "px").
 * @param {string} outputUnit - Hedeflenen çıkış birimi (örn: "cm").
 * @returns {number} Dönüştürülmüş sayısal değer.
 */
export function lengthUnitConvert(inputValue, inputUnit, outputUnit) {
    let value;
    let unit;

    if (typeof inputValue === 'string') {
        const match = inputValue.trim().match(/^(-?[\d.]+)([a-z%]+)$/i);
        if (!match) return NaN;
        value = parseFloat(match[1]);
        unit = match[2].toLowerCase();
    } else {
        value = inputValue;
        unit = inputUnit?.toLowerCase();
    }

    if (!toCmRates[unit] || !fromCmRates[outputUnit]) {
        console.error(`Desteklenmeyen birim: ${unit} veya ${outputUnit}`);
        return NaN;
    }

    // 1. Adım: Gelen değeri her zaman santimetreye çevir
    const valueInCm = value * toCmRates[unit];

    // 2. Adım: Santimetre cinsinden değeri hedef birime çevir
    return valueInCm * fromCmRates[outputUnit];
}

/**
 * Radyanı dereceye çevirir.
 * @param {number} r - Radyan değeri.
 */
export const radToDeg = (r) => (r * 180) / Math.PI;

/**
 * Dereceyi radyana çevirir.
 * @param {number} a - Derece değeri.
 */
export const degToRad = (a) => (a * Math.PI) / 180;

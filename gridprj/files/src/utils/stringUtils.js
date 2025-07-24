/**
 * String işlemleri için yardımcı fonksiyonlar içerir.
 * Prototype kirliliğini önlemek için bu modül kullanılır.
 */

/**
 * Bir string'i güvenli bir şekilde tırnak içine alır ve özel karakterlerden kaçar.
 * @param {string} str - İşlenecek string.
 * @returns {string} Tırnak içine alınmış ve güvenli hale getirilmiş string.
 */
export function quote(str) {
    const escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    const meta = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"': '\\"', '\\': '\\\\' };
    escapable.lastIndex = 0;
    return escapable.test(str) ? '"' + str.replace(escapable, a => {
        const c = meta[a];
        return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + str + '"';
}

/**
 * String içindeki sayısal değeri bulup Number tipine çevirir.
 * Arapça ve Farsça rakamları da destekler.
 * @param {string} str - Sayıya çevrilecek string.
 * @returns {number} Elde edilen sayı veya NaN.
 */
export function toNumber(str) {
    if (typeof str !== 'string') return NaN;
    let s = str;
    if (/[٠١٢٣٤٥٦٧٨٩۵۶]/.test(s)) {
        s = s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => d.charCodeAt(0) - 1632)
             .replace(/[۴۵۶]/g, d => d.charCodeAt(0) - 1776);
    }
    const match = s.match(/[+-]?[\d\s,.]+/g);
    if (!match) return NaN;
    // Grup ayırıcılarını (virgül gibi) temizle, ondalık ayırıcı olarak noktayı koru
    const cleaned = match[0].replace(/\s/g, '').replace(/,(?=\d{3})/g, '');
    return parseFloat(cleaned);
}

/**
 * String formatındaki bir tarihi Date nesnesine çevirir.
 * @param {string} str - Tarih string'i.
 * @returns {Date} Date nesnesi.
 */
export function toDate(str) {
    return new Date(Date.parse(str));
}

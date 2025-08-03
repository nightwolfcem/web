import { TautoCompleteControl } from './controls/TautoCompleteControl.js';
import { TcolorControl } from './controls/TcolorControl.js';
import { TnumericControl } from './controls/TnumericControl.js';
import { TcompoundValueControl } from './controls/TcompoundValueControl.js';
import { cssProps } from '../../data/cssProperties.js';

/**
 * ControlFactory: Bir CSS özelliğinin meta verisine bakarak
 * doğru UI kontrolünü (örn: renk seçici, sayısal giriş) oluşturan bir fabrika.
 */
export class ControlFactory {
    /**
     * @param {string} styleProp - Düzenlenecek CSS özelliği (örn: 'backgroundColor').
     * @param {HTMLElement|CSSStyleDeclaration} targetElement - Stilin uygulanacağı hedef element veya doğrudan stil deklarasyonu.
     * @param {Function} onChange - Değer değiştiğinde çağrılacak callback.
     * @returns {HTMLElement} Oluşturulan kontrolün ana HTML elementi.
     */
    static createControl(styleProp, targetElement, onChange) {
        const meta = cssProps.properties[styleProp];
        if (!meta) {
            console.warn(`"${styleProp}" için meta veri bulunamadı. Basit bir metin kutusu oluşturuluyor.`);
            // Meta veri yoksa, genel bir autocomplete kontrolü oluşturabiliriz.
            return new TautoCompleteControl(styleProp, [], targetElement, onChange).render();
        }

        const initialValue = (targetElement.style ? targetElement.style[styleProp] : targetElement[styleProp]) || meta.initial;
        const allValues = meta.values || [];

        // 1. Bileşik Değer Kontrolü (örn: border, animation)
        if (allValues.some(v => v.startsWith('[prop:'))) {
            return new TcompoundValueControl(styleProp, meta, targetElement, onChange).render();
        }

        // 2. Renk Kontrolü
        if (allValues.includes('[color]')) {
            return new TcolorControl(styleProp, initialValue, targetElement, onChange).render();
        }

        // 3. Sayısal/Uzunluk Kontrolü
        if (allValues.includes('[length]') || allValues.includes('[percent]') || allValues.includes('[time]')) {
            return new TnumericControl(styleProp, meta, targetElement, onChange).render();
        }

        // 4. Standart Autocomplete Kontrolü (diğer tüm durumlar için)
        return new TautoCompleteControl(styleProp, allValues, targetElement, onChange).render();
    }
}

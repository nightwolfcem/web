import { TsingleColorPicker } from '../colorpicker/TsingleColorPicker.js';
import { Tord } from '../../core/enums.js';
// StyleEditor'ın akıllı kontrol fabrikasını import ediyoruz.
import { ControlFactory } from '../style-editor/ControlFactory.js';

// --- TEMEL EDİTÖR SINIFI ---
class TbaseEditor {
    constructor(parentObject, propertyKey) {
        this.parent = parentObject;
        this.key = propertyKey;
        this.initialValue = this.parent[this.key];
    }
    render() {
        throw new Error("Render metodu alt sınıfta tanımlanmalıdır.");
    }
    _updateValue(newValue) {
        this.parent[this.key] = newValue;
    }
}

// --- EDİTÖR TÜRLERİ ---

class TtextEditor extends TbaseEditor {
    render() {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.initialValue;
        input.addEventListener('change', () => this._updateValue(input.value));
        return input;
    }
}

class TnumberEditor extends TbaseEditor {
    render() {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = this.initialValue;
        input.addEventListener('change', () => this._updateValue(parseFloat(input.value)));
        return input;
    }
}

class TbooleanEditor extends TbaseEditor {
    render() {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = this.initialValue;
        input.addEventListener('change', () => this._updateValue(input.checked));
        return input;
    }
}

class TselectEditor extends TbaseEditor {
    render() {
        const select = document.createElement('select');
        const enumList = window[this.initialValue._$list];
        
        for (const key in enumList) {
            if (typeof enumList[key] === 'number') {
                const option = document.createElement('option');
                option.value = enumList[key];
                option.textContent = key;
                if (enumList[key] === Number(this.initialValue)) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        }
        
        select.addEventListener('change', () => {
             this.parent[this.key] = parseInt(select.value, 10);
        });
        return select;
    }
}

// YENİ: StyleEditor'ın kontrollerini PropEditor içinde kullanmak için bir köprü sınıfı.
class TstylePropertyEditor extends TbaseEditor {
    render() {
        // parent: style nesnesi
        // parent.owner: stilin ait olduğu Telement
        const targetElement = this.parent.owner?.htmlObject || null;
        if (!targetElement) {
            return new TtextEditor(this.parent, this.key).render();
        }

        const onChangeCallback = (newValue) => {
            this._updateValue(newValue);
        };

        // StyleEditor'ın akıllı fabrikasını çağırıyoruz.
        return ControlFactory.createControl(this.key, targetElement, onChangeCallback);
    }
}


// --- KAYIT SİSTEMİ ---
class TeditorRegistry {
    constructor() {
        this.registry = new Map();
        this.registerDefaults();
    }

    registerDefaults() {
        // YENİ: Stil özellikleri için özel bir kural ekliyoruz.
        // Bu kural, diğer tüm kurallardan önce kontrol edilmeli.
        this.register(
            (value, key, parent) => parent instanceof CSSStyleDeclaration,
            TstylePropertyEditor
        );

        // Standart tip kontrolleri
        this.register('string', TtextEditor);
        this.register('number', TnumberEditor);
        this.register('boolean', TbooleanEditor);
        
        // Özel nesne tipi kontrolleri
        this.register((value) => value instanceof Tord, TselectEditor);
    }

    register(type, component) {
        this.registry.set(type, component);
    }

    /**
     * Verilen bir değere, anahtara ve ebeveyne uygun editör sınıfını bulur.
     * @param {*} value - Değer.
     * @param {string} key - Özellik adı.
     * @param {object} parentObject - Özelliğin ait olduğu nesne.
     * @returns {TbaseEditor | null} Uygun editör sınıfı.
     */
    getEditorFor(value, key, parentObject) {
        // Önce koşullu fonksiyonları kontrol et (en spesifik olanlar)
        for (const [condition, component] of this.registry.entries()) {
            if (typeof condition === 'function' && condition(value, key, parentObject)) {
                return component;
            }
        }

        // Sonra doğrudan tip eşleşmesini kontrol et
        const type = typeof value;
        if (this.registry.has(type)) {
            return this.registry.get(type);
        }
        
        return null; // Uygun editör bulunamadı
    }
}

export const editorRegistry = new TeditorRegistry();

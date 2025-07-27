/**
 * src/dom/eventHandling.js (Yeniden Yapılandırıldı)
 * Bu modül, tüm olay dinleyici (event listener) yönetimini merkezileştirir.
 * Prototip'leri değiştirmek yerine, güvenli ve modüler fonksiyonlar sunar.
 * Serileştirme (serialization) için fonksiyonlara ID atama ve meta veri
 * ekleme mantığını korur.
 */

import { AllClass } from '../core/classUtils.js';

// --- Dahili Fonksiyon Havuzu (Serialization için) ---

// Uygulamadaki her bir benzersiz olay dinleyici fonksiyonuna bir ID atar.
// Bu sayede fonksiyonun kendisi yerine sadece ID'si serileştirilebilir.
const FN_POOL = [];
const FN_TO_ID = new WeakMap();

function getOrAddId(fn) {
    if (FN_TO_ID.has(fn)) {
        return FN_TO_ID.get(fn);
    }
    const id = FN_POOL.length;
    FN_POOL.push(fn);
    FN_TO_ID.set(fn, id);
    return id;
}

/**
 * Verilen bir ID'ye karşılık gelen fonksiyonu havuzdan bulur.
 * @param {number} id - Fonksiyon ID'si.
 * @returns {Function | undefined}
 */
export function getFnById(id) {
    return FN_POOL[id];
}


// --- Olay Haritası Yönetimi ---

// Her bir DOM elementine bağlı olan olay dinleyicilerini bir WeakMap'te saklar.
const _eventMap = new WeakMap();

/**
 * Bir elemente ait olay dinleyici haritasını (Map) döndürür.
 * @param {EventTarget} el - HTML elementi, document veya window.
 * @returns {Map<string, Array<object>>}
 */
export function getEventMap(el) {
    let map = _eventMap.get(el);
    if (!map) {
        map = new Map();
        _eventMap.set(el, map);
    }
    return map;
}


// --- Ana Olay Bağlama ve Çözme Fonksiyonları ---

/**
 * Bir fonksiyonu bir olaya güvenli bir şekilde bağlar, 'this' bağlamını korur
 * ve serileştirme için gerekli meta verileri ekler.
 * @param {Function} handler - Çalıştırılacak orijinal fonksiyon.
 * @param {HTMLElement} element - Olayın dinleneceği element.
 * @param {string} eventType - Olayın adı (örn: 'click').
 * @param {object} context - Fonksiyon içinde 'this' olarak kullanılacak nesne.
 * @param {...*} boundArgs - Fonksiyona önceden bağlanacak argümanlar.
 * @returns {Function} Oluşturulan ve elemente bağlanan sarmalayıcı (wrapper) fonksiyon.
 */
export function bindEvent(handler, element, eventType, context, ...boundArgs) {
    const wrapper = function(event, ...runtimeArgs) {
        const res = handler.call(context, event, ...boundArgs, ...runtimeArgs);
        if (res === false) {
            event.preventDefault?.();
            event.stopPropagation?.();
        }
        return res;
    };

    // Serileştirme ve unbind işlemleri için kritik olan meta verileri
    wrapper._meta = {
        original: handler,
        args: boundArgs,
        objId: context?.id ?? -1
    };

    element.addEventListener(eventType, wrapper);
    return wrapper;
}

/**
 * `bindEvent` ile bağlanmış bir olay dinleyicisini kaldırır.
 * @param {Function} handler - Kaldırılacak orijinal fonksiyon.
 * @param {HTMLElement} element - Olay dinleyicisinin bağlı olduğu element.
 * @param {string} [eventType] - Belirli bir olay türü. Belirtilmezse, fonksiyon tüm olaylardan kaldırılır.
 */
export function unbindEvent(handler, element, eventType) {
    const map = getEventMap(element);
    const typesToRemove = eventType ? [eventType] : [...map.keys()];

    typesToRemove.forEach(type => {
        const listeners = map.get(type);
        if (!listeners) return;

        for (let i = listeners.length - 1; i >= 0; i--) {
            const listenerInfo = listeners[i];
            const listenerFunc = listenerInfo.listener || listenerInfo.wrapper;

            if (listenerFunc === handler || listenerFunc?._meta?.original === handler) {
                element.removeEventListener(type, listenerFunc, listenerInfo.options);
                // removeEventListener'daki yama, haritadan silme işlemini otomatik yapacaktır.
            }
        }
    });
}


// --- EventTarget Prototip Yamaları ---
// Bu fonksiyon, main.js'de bir kez çağrılarak add/removeEventListener'ı
// olay takibi yapacak şekilde günceller.

let isPatched = false;
export function patchEventTargetPrototypes() {
    if (isPatched) return;

    const origAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        origAdd.call(this, type, listener, options);
        if (!listener) return;

        const map = getEventMap(this);
        const list = map.get(type) || [];
        if (!list.some(rec => rec.listener === listener)) {
            list.push({
                listener: listener,
                id: getOrAddId(listener),
                options: options
            });
            map.set(type, list);
        }
    };

    const origRemove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
        origRemove.call(this, type, listener, options);
        const map = getEventMap(this);
        const list = map.get(type);
        if (!list) return;

        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i].listener === listener) {
                list.splice(i, 1);
                break;
            }
        }
        if (list.length === 0) {
            map.delete(type);
        }
    };

    isPatched = true;
    console.log("EventTarget prototypes patched for tracking.");
}

'use strict';
// eventHandling.js — Cem-spec unified (deep-clean)

// --- Dahili Fonksiyon Havuzu (Serialization iÃ§in) ---

// Uygulamadaki her bir benzersiz olay dinleyici fonksiyonuna bir ID atar.
// Bu sayede fonksiyonun kendisi yerine sadece ID'si serileÅŸtirilebilir.
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
 * Verilen bir ID'ye karÅŸÄ±lÄ±k gelen fonksiyonu havuzdan bulur.
 * @param {number} id - Fonksiyon ID'si.
 * @returns {Function | undefined}
 */
export function getFnById(id) {
    return FN_POOL[id];
}

// --- Olay HaritasÄ± YÃ¶netimi ---

// Her bir DOM elementine baÄŸlÄ± olan olay dinleyicilerini bir WeakMap'te saklar.
const _eventMap = new WeakMap();

/**
 * Bir elemente ait olay dinleyici haritasÄ±nÄ± (Map) dÃ¶ndÃ¼rÃ¼r.
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

// --- Ana Olay BaÄŸlama ve Ã‡Ã¶zme FonksiyonlarÄ± ---

/**
 * Bir fonksiyonu bir olaya gÃ¼venli bir ÅŸekilde baÄŸlar, 'this' baÄŸlamÄ±nÄ± korur
 * ve serileÅŸtirme iÃ§in gerekli meta verileri ekler.
 * @param {Function} handler - Ã‡alÄ±ÅŸtÄ±rÄ±lacak orijinal fonksiyon.
 * @param {HTMLElement} element - OlayÄ±n dinleneceÄŸi element.
 * @param {string} eventType - OlayÄ±n adÄ± (Ã¶rn: 'click').
 * @param {object} context - Fonksiyon iÃ§inde 'this' olarak kullanÄ±lacak nesne.
 * @param {...*} boundArgs - Fonksiyona Ã¶nceden baÄŸlanacak argÃ¼manlar.
 * @returns {Function} OluÅŸturulan ve elemente baÄŸlanan sarmalayÄ±cÄ± (wrapper) fonksiyon.
 */
export function bindEvent(handler, element, eventType, context, ...boundArgs) {
  // Design-mode capture: notify global hook if present

    // opsiyon paramÄ±nÄ± son argÃ¼man olarak destekle (opsiyonel)
    let options = undefined;
    // ensure owner has a stable id and is registered for rebind
    if (context) { try { ensureId(context);  } catch {} }
    if (boundArgs.length && typeof boundArgs[boundArgs.length - 1] === 'object' && boundArgs[boundArgs.length - 1] !== null) {
        options = boundArgs.pop();
    }

    const wrapper = function(event, ...runtimeArgs) {
        const res = handler.call(context, event, ...boundArgs, ...runtimeArgs);
        if (res === false) {
            (event.preventDefault) && event.preventDefault();
            (event.stopPropagation) && event.stopPropagation();
        }
        return res;
    };

    wrapper._meta = {
        original: handler,
        args: boundArgs,
        objId: context?.id ?? -1
    };

    element.addEventListener(eventType, wrapper, options);
    return wrapper;
}
/**
 * `bindEvent` ile baÄŸlanmÄ±ÅŸ bir olay dinleyicisini kaldÄ±rÄ±r.
 * @param {Function} handler - KaldÄ±rÄ±lacak orijinal fonksiyon.
 * @param {HTMLElement} element - Olay dinleyicisinin baÄŸlÄ± olduÄŸu element.
 * @param {string} [eventType] - Belirli bir olay tÃ¼rÃ¼. Belirtilmezse, fonksiyon tÃ¼m olaylardan kaldÄ±rÄ±lÄ±r.
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
                // removeEventListener'daki yama, haritadan silme iÅŸlemini otomatik yapacaktÄ±r.
            }
        }
    });
}

// --- EventTarget Prototip YamalarÄ± ---
// Bu fonksiyon, main.js'de bir kez Ã§aÄŸrÄ±larak add/removeEventListener'Ä±
// olay takibi yapacak ÅŸekilde gÃ¼nceller.

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

/* eventList getter (debug/read-only): returns the internal event map. */
try {
  [HTMLElement.prototype, Document.prototype, Window.prototype].forEach(proto => {
    if (!Object.prototype.hasOwnProperty.call(proto, 'eventList')) {
      Object.defineProperty(proto, 'eventList', {
        get() {
          const m = getEventMap(this);
          // return a shallow copy to avoid external mutation
          const out = new Map();
          if (m) for (const [k,v] of m.entries()) out.set(k, Array.isArray(v) ? v.slice() : v);
          return out;
        },
        enumerable: false,
        configurable: true
      });
    }
  });
} catch(e) { /* ignore */ }
Function.prototype.bindToEvent = function (elem, type, ctx = null, ...args) {
    const original = this;
    const wrapper = function (ev) {
        const res = original.apply(ctx || elem, [ev, ...args]);
        if (res === false) { ev.preventDefault(); ev.stopPropagation(); }
    };
    wrapper._meta = { original, args, objId: (ctx || elem).id || -1 };
    
    const map = getEventMap(elem);
    const list = map.get(type) || [];
    map.set(type, list);
    list.push({ wrapper, options: false });
    
    elem.addEventListener(type, wrapper, false);
    return wrapper;
};

Function.prototype.toEventFunc = function(obj = null, ...boundArgs) {
    const original = this;
    const context = obj || window;
    const wrapper = function(event, ...runtimeArgs) {
        event = event || window.event;
        const res = original.call(context, event, ...boundArgs, ...runtimeArgs);
        if (res === false) {
            (event.preventDefault) && event.preventDefault();
            (event.stopPropagation) && event.stopPropagation();
        }
        return res;
    };
    wrapper._meta = { original: original, args: boundArgs, objId: this.id ?? -1 };
    return wrapper;
};
// === Cem-spec APPEND (non-breaking): Registry-aware event snapshot/restore =========
(function(){
  try{
    // Prefer existing exports if available
    const hasExportedGetEventMap = (typeof getEventMap === 'function');

    // Global getFnById that supports string ids via TfunctionRegistry, falls back to local pool
    if (typeof globalThis.getFnById !== 'function'){
      // Note: module-scoped getFnById (numeric) is already exported above; we wrap gracefully.
      globalThis.getFnById = function(id){
        try {
          if (typeof id === 'string' && globalThis.TfunctionRegistry && typeof globalThis.TfunctionRegistry.getById === 'function'){
            const fn = globalThis.TfunctionRegistry.getById(id);
            if (typeof fn === 'function') return fn;
          }
        } catch {}
        // numeric pool fallback (same module export)
        try {
          const n = typeof id === 'number' ? id : Number(id);
          if (!isNaN(n)) return (typeof getFnById === 'function') ? getFnById(n) : undefined;
        } catch {}
        return undefined;
      };
    }

    // Helper: ensure each record in getEventMap has a registry id (rid)
    function ensureRegistryIds(el){
      try {
        if (!hasExportedGetEventMap || !globalThis.TfunctionRegistry) return;
        const FR = globalThis.TfunctionRegistry;
        const map = getEventMap(el);
        if (!map) return;
        map.forEach((list, type)=>{
          for (const rec of (list||[])){
            if (!rec) continue;
            if (!rec.rid && rec.listener){
              try {
                const name = rec.listener.name || 'event';
                const rid = FR.register('events', name, rec.listener);
                if (rid) rec.rid = rid;
              } catch {}
            }
          }
        });
      } catch {}
    }

    // Exported snapshot: { type:[{ id, o }] } where id is registry id if present, else numeric
    if (typeof globalThis.eventSnapshot !== 'function'){
      globalThis.eventSnapshot = function(el, { includeOptions = true } = {}){
        try {
          if (!hasExportedGetEventMap) return null;
          ensureRegistryIds(el);
          const map = getEventMap(el);
          if (!map) return null;
          const out = {};
          map.forEach((list, type)=>{
            const arr = [];
            for (const rec of (list||[])){
              if (!rec) continue;
              const id = rec.rid || rec.id;
              if (id == null) continue;
              const item = { id };
              if (includeOptions && rec.options) item.o = rec.options;
              arr.push(item);
            }
            if (arr.length) out[type] = arr;
          });
          return Object.keys(out).length ? out : null;
        } catch { return null; }
      };
    }

    // Exported restore that resolves ids via TfunctionRegistry if string, else local pool
    if (typeof globalThis.eventRestore !== 'function'){
      globalThis.eventRestore = function(el, snap){
        if (!el || !snap) return;
        for (const type of Object.keys(snap)){
          const arr = snap[type] || [];
          for (const rec of arr){
            const id = rec && rec.id;
            let fn = null;
            try { fn = globalThis.getFnById(id); } catch {}
            if (typeof fn === 'function'){
              try { el.addEventListener(type, fn, rec.o); } catch {}
            }
          }
        }
      };
    }
  }catch{}
})();
// === END APPEND ====================================================================

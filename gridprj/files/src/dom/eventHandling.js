const EVENT_METHOD_POOL = []; 
const FN2ID = new WeakMap();

function getOrAddId(fn) {
    let id = FN2ID.get(fn);
    if (id !== undefined) return id;
    id = EVENT_METHOD_POOL.length;
    EVENT_METHOD_POOL.push(fn);
    FN2ID.set(fn, id);
    return id;
}

export const getFnById = id => EVENT_METHOD_POOL[id];

class TlistenerMap extends Map {
    hasSameListener(eventType, candidate) {
        const list = this.get(eventType);
        if (!list) return false;

        const norm = fn => (fn.listenerStr || fn.toString()).replace(/\s+/g, ' ');

        return list.some(rec => {
            if (rec.listener === candidate) return true;
            if (rec.listener?._meta?.original && candidate?._meta?.original && rec.listener._meta.original === candidate._meta.original)
                return true;
            return norm(rec.listener) === norm(candidate);
        });
    }
}

const _eventMap = new WeakMap();

export function getEventMap(el) {
    let m = _eventMap.get(el);
    if (!m) {
        m = new TlistenerMap();
        _eventMap.set(el, m);
    }
    return m;
}

// Bu dosya da ana girişte bir kez import edilmelidir.
// This file should also be imported once in the main entry point.
export function patchPrototypesForEvents() {
    [HTMLElement.prototype, Document.prototype, Window.prototype].forEach(proto => {
        if (!Object.prototype.hasOwnProperty.call(proto, 'eventList')) {
            Object.defineProperty(proto, 'eventList', {
                get() { return getEventMap(this); },
                enumerable: false,
                configurable: false
            });
        }
    });

    Function.prototype.bindToEvent = function (elem, type, ctx = null, ...args) {
        const original = this;
        const wrapper = function (ev) {
            const res = original.apply(ctx || elem, [ev, ...args]);
            if (res === false) { ev.preventDefault(); ev.stopPropagation(); }
        };

        wrapper._meta = { original, args };

        const map = getEventMap(elem);
        const list = map.get(type) || [];
        map.set(type, list);
        list.push({ wrapper, options: false });

        elem.addEventListener(type, wrapper, false);
        return wrapper;
    };

    Function.prototype.unBindEvent = function (elem, type = null) {
        const original = this;
        const map = getEventMap(elem);
        if (!map) return;

        const types = type ? [type] : [...map.keys()];

        types.forEach(evType => {
            const list = map.get(evType);
            if (!list) return;
            for (let i = list.length - 1; i >= 0; i--) {
                const rec = list[i];
                const w = rec.wrapper ?? rec.listener ?? rec;
                const same = w === original || w._meta?.original === original;

                if (same) {
                    elem.removeEventListener(evType, w, rec.options || false);
                    list.splice(i, 1);
                }
            }
            if (list.length === 0) map.delete(evType);
        });
    };

    Function.prototype.toEventFunc = function(obj = null, ...boundArgs) {
        const original = this;
        const context = obj || window;

        const wrapper = function(event, ...runtimeArgs) {
            event = event || window.event;
            // jQuery event fix might be removed if not using jQuery
            if (typeof $ !== 'undefined' && $.event && typeof $.event.fix === 'function') {
                event = $.event.fix(event);
            }
            const res = original.call(context, event, ...boundArgs, ...runtimeArgs);
            if (res === false) {
                event.preventDefault?.();
                event.stopPropagation?.();
            }
            return res;
        };
        
        wrapper._meta = {
            original: original, 
            args: boundArgs,
            objId: this.id ?? -1
        };

        return wrapper;
    };

    const origAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        origAddEventListener.call(this, type, listener, options);
        if (!listener) return;

        const map = getEventMap(this);
        const list = map.get(type) || [];
        map.set(type, list);

        if (list.some(rec => rec.listener === listener)) return;

        list.push({
            listener,
            id: getOrAddId(listener),
            options
        });
    };

    const origRemoveEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
        origRemoveEventListener.call(this, type, listener, options);

        const map = _eventMap.get(this);
        if (!map || !map.has(type)) return;

        const list = map.get(type);
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i].listener === listener) {
                list.splice(i, 1);
            }
        }
        if (list.length === 0) map.delete(type);
    };
}
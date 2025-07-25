/**
 * Bu modül, JavaScript'in yerleşik nesnelerinin prototiplerini genişleten
 * tüm yardımcı fonksiyonları merkezi bir yerde toplar.
 * Bu modül, uygulamanın ana giriş noktasında (main.js) SADECE BİR KEZ
 * import edilerek tüm projenin bu fonksiyonlara erişmesi sağlanır.
 */

import { deepCopy } from '../utils/objectUtils.js';
import { getEventMap } from '../dom/eventHandling.js';

// --- Object.prototype Genişletmeleri ---

Object.prototype.assign = function(obj, full = false, visited = new WeakSet()) {
    if (visited.has(obj)) return;
    visited.add(obj);
    if (this.__proto__.constructor.name === "ajax") {
        return;
    }
    Object.keys(obj).forEach(key => {
        let value = obj[key];
        if (value === this) return;
        if ((this[key] !== undefined && typeof this[key] === typeof value) || (this[key] === undefined && full)) {
            if (value !== null && typeof value === "object") {
                if (!visited.has(value)) {
                    if (this[key] === undefined && full) {
                        this[key] = typeof value.copy === "function" ? value.copy() : value;
                    } else if (this[key] !== undefined && typeof this[key].assign === 'function') {
                        this[key].assign(value, full, visited);
                    } else {
                        this[key] = value;
                    }
                }
            } else {
                this[key] = value;
            }
        }
    });
};

Object.prototype.merge = function(obj) {
    for (let val in obj)
        if (!(val in this) && Object.prototype.hasOwnProperty.call(obj, val))
            this[val] = obj[val];
};

Object.prototype.compare = function(Obj) {
    if (this.__proto__.constructor.name == "ajax") { return; }
    var rtn = true;
    var p;
    for (var P in Obj) {
        if (Object.prototype.hasOwnProperty.call(Obj, P) && !Function.prototype[P]) {
            var inv = false;
            if (/^NOT/.exec(P) != null) {
                inv = true;
                p = P.replace(/^NOT/, "");
            } else
                p = P;
            if (typeof this[p] == "object") {
                rtn = this[p].compare(Obj[P]);
                if (rtn == false)
                    return false;
            }
            else if (this[p] === undefined) {
                rtn = false;
                return false;
            }
            else if (!((inv && this[p] != Obj[P]) || (!inv && this[p] == Obj[P]))) {
                return false;
            }
        }
    }
    return rtn;
};

Object.prototype.defineProp = function (p, getf, setf, enumerable, configurable, writable, value) {
    let descriptor = {};
    if (typeof getf === "object" && getf !== null) {
        descriptor = getf;
    } else {
        const args = Array.from(arguments).slice(2);
        if (typeof getf === 'function') {
            if (getf.length === 0) descriptor.get = getf;
            else descriptor.set = getf;
        }
        if (typeof setf === 'function') descriptor.set = setf;
        
        const propNames = ['enumerable', 'configurable', 'writable', 'value'];
        let argIndex = 0;
        if(typeof setf === 'function') argIndex = 1;

        for (let i = 0; i < propNames.length; i++) {
            const argVal = args[argIndex + i];
            if (argVal !== undefined) {
                if (propNames[i] === 'writable' && (descriptor.get || descriptor.set)) continue;
                descriptor[propNames[i]] = argVal;
            }
        }
    }
    if (descriptor.configurable === undefined) descriptor.configurable = true;
    if (descriptor.enumerable === undefined) descriptor.enumerable = true;
    Object.defineProperty(this, p, descriptor);
};

Object.defineProperty(Object.prototype, 'copy', {
    value: function (skipKeys) { return deepCopy(this, skipKeys); },
    writable: true, configurable: true, enumerable: false
});


// --- Function.prototype Genişletmeleri ---

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
            event.preventDefault?.();
            event.stopPropagation?.();
        }
        return res;
    };
    wrapper._meta = { original: original, args: boundArgs, objId: this.id ?? -1 };
    return wrapper;
};


// --- String.prototype Genişletmeleri ---

String.prototype.toNumber = function(s) {
    var arb, str = s ? s : this;
    arb = /[٠١٢٣٤٥٦٧٨٩۵۶]/.test(str);
    if (arb) str = str.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => d.charCodeAt(0) - 1632)
        .replace(/[۴۵۶]/g, d => d.charCodeAt(0) - 1776);
    str = (str.match(/[+-]?[\d\s,.]+/g) || [''])[0]
    if (str == null) return NaN;
    return parseFloat(str.replace(/,/g, ''));
};

String.prototype.toDate = function() {
    return new Date(Date.parse(this));
};


// --- Array.prototype Genişletmeleri ---

Array.prototype.filterRemove = function(predicate) {
    let rtn = [];
    for (let i = this.length - 1; i >= 0; i--) {
        if (predicate(this[i], i, this)) {
            rtn.push(...this.splice(i, 1));
        }
    }
    return rtn.reverse();
};

// --- Date.prototype Genişletmeleri ---

Date.prototype.daysinMonth = function (iMonth, iYear) {
    const month = this === Date.prototype ? iMonth : this.getMonth();
    const year = this === Date.prototype ? iYear : this.getFullYear();
    return new Date(year, month + 1, 0).getDate();
};

  Date.prototype.formatText = function (date, format) {
        var d = format ? date : this;
        format = format ? format : date;
        var y = String(d.getFullYear());
        var m = String(d.getMonth() + 1);
        var dd = String(d.getDate());
        var g = d.geOday();
        var h = String(d.getHours());
        var n = String(d.getMinutes());
        var s = String(d.getSeconds());
        var fmtp = /[ymdhns]*[^\/\\ *-:._]/g;
        var rtn, rtnf, lp, x, ek = "";
        rtnf = "";
        lp = 0;
        while (x = fmtp.exec(format)) {
            if (lp != 0)
                ek = format.substring(lp, x.index);
            rtn = "";
            lp = x.index + x[0].length;
            if (x[0].charAt(0) == "y")
                rtn = x[0].length <= 2 ? y.substring(2, 4) : y;
            else if (x[0].charAt(0) == "m")
                rtn = x[0].length == 1 ? m : x[0].length == 2 ? (m.length == 1 ? "0" + m : m) : x[0].length == 3 ? Intl.DateTimeFormat(Intl.locate().dateFormat.locale, { month: "short" }).format(d) : Intl.DateTimeFormat(Intl.locate().dateFormat.locale, { month: "long" }).format(d);
            else if (x[0].charAt(0) == "d") {
                rtn = x[0].length == 1 ? dd : x[0].length == 2 ? (dd.length == 1 ? "0" + dd : dd) : x[0].length == 3 ? Intl.DateTimeFormat(Intl.locate().dateFormat.locale, { weekday: "short" }).format(d) : Intl.DateTimeFormat(Intl.locate().dateFormat.locale, { weekday: "long" }).format(d);
            }
            if (x[0].charAt(0) == "h")
                rtn = x[0].length == 1 ? h : (h.length == 1 ? "0" + h : h);
            else if (x[0].charAt(0) == "n")
                rtn = x[0].length == 1 ? n : (n.length == 1 ? "0" + n : n);
            else if (x[0].charAt(0) == "s")
                rtn = x[0].length == 1 ? s : (s.length == 1 ? "0" + s : s);
            if (rtn != "" && rtnf != "") rtnf = rtnf + (ek ? ek : "") + rtn; else if (rtn != "") rtnf += rtn;
        }
        return rtnf;
    }



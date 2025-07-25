import './prototypes.js'; // For defineProp
export class Tord extends Number {
    constructor(o) {
        super(o);
        this.index = 0;
        this.onchange = null;
        this.defineProp("_$list", {
            enumerable: false,
            writable: true
        });
        this.defineProp("length", () => {
            return Object.keys(window[this._$list]).length - 1
        });
    }
    next(v) {
        v = v || 1;
        this.index = (this.index + v) % this.length;
        return this
    }
    prev(v) {
        v = v || -1;
        this.index = (this.length + this.index - v) % this.length;
        return this
    }
    first() {
        this.index = 0;
        return this
    }
    last() {
        this.index = window[this._$list].length - 2;
        return this
    }
    ord() {
        return Object.keys(window[this._$list])[this.index]
    }
    forEach(func) {
        let m, l = window[this._$list];
        for (m in l) {
            func(m, l[m]);
        }
    }
    toString() {
        return Object.keys(window[this._$list])[this.index];
    }
    _$toStr() {
        return this.index != window[this._$list][0] ? '{"_$parent":' + quote(this._$list) + ',"value":' + this.index + "}" : "";
    }
    [Symbol.toPrimitive](hint) {
        if (hint === 'object') {
            return this;
        } else
            if (hint === 'string') {
                return this.toString();
            } else
                return Number(window[this._$list][Object.keys(window[this._$list])[this.index]]);
    }
}
export function createOrdList(listName, listitems) {
    var s, s1, v1;
    s = window[listName] = {};
    if (typeof listitems == "string") {
        s1 = listitems.split(/[,|;]/);
        for (var i = 0; i < s1.length; i++) {
            s[s1[i]] = i;
        }
    } else {
        s1 = Object.keys(listitems);
        for (var i = 0; i < s1.length; i++) {
            s[s1[i]] = listitems[s1[i]];
        }
    }
    s.forEach = function (func) {
        let m, l = s;
        for (m in l) {
            if (typeof l[m] == "number")
                func(m, l[m]);
        }
    }
    s.bindTo = function (propName, obj) {
        var x = new Tord(s[s1[0]]);
        x._$list = listName;
        obj.defineProp(propName, function () {
            return x;
        },
            function (v) {
                var f = false;
                let ov = x.value;
                for (var i = 0; i < s1.length; i++) {
                    if (s[s1[i]] == v) {
                        f = true;
                        x.index = i;
                        x.value = v;
                        break;
                    }
                }
                if (f && x.onchange) x.onchange(ov, v);
            }
        );
    };
    Object.freeze(s);
}
export class Tenum extends Number {
    constructor() {
        super();
        this.onchange = null;
        this.defineProp("_$list", {
            enumerable: false,
            writable: true
        });
        this.defineProp("self", {
            get: () => {
                return this
            },
            enumerable: false
        });
        this.value = 0;
    }
    static inEnum(enm, v) {
        return (enm & v) === v;
    }
    inEnum(v) {
        return Tenum.inEnum(this.value, v)
    }
    toString() {
        const s = this.self;
        const keys = [];
        for (let k in s) {
            if (s.hasOwnProperty(k) && typeof s[k] === "boolean" && s[k]) {
                keys.push(k);
            }
        }
        return "[" + keys.join(",") + "]";
    }
    toStr() {
        return {
            _ctor: 'Tenum',
            value: this.value,
            list: this._$list,
        };
    }
    fromStr(patch, parentObj, isNew, parentKey = null, base) {
        if (isNew) {
            window[patch.list].bindTo(parentKey, parentObj);
        } else
            parentObj[parentKey].value = patch.value;
    }
    _$toStr() {
        return '{"_$parent":' + quote(this._$list) + ',"value":' + this.value + "}";
    };
    add(v) {
        var a = this.value;
        a = a | v;
        this.value = a;
        return a;
    }
    forEach(func) {
        let m, l = window[this._$list];
        for (m in l) {
            if (m != "bindTo")
                func(m, l[m]);
        }
    }
    subtract(v) {
        this.value &= ~v;
        return this.value;
    }
    [Symbol.toPrimitive](hint) {
        if (hint === 'object') {
            return this;
        }
        return Number(this.value);
    }
    [
        Symbol.has
    ](t, n) {
        return this.inEnum(n)
    }
}
export function createEnumList(listName, listitems) {
    var s = window[listName] = {};
    if (typeof listitems == "string") {
        var arr = listitems.split(/[,|;]/).map(x => x.trim());
        for (var i = 0; i < arr.length; i++) {
            s[arr[i]] = i == 0 ? 0 : (1 << (i - 1)); // 0, 1, 2, 4, 8... flag-style
        }
    } else if (typeof listitems == "object" && listitems !== null) {
        for (var k in listitems) {
            if (listitems.hasOwnProperty(k)) {
                s[k] = listitems[k];
            }
        }
    }
    s.bindTo = function (propName, obj) {
        var o = 0,
            x = new Tenum(o),
            prx = new Proxy(x, {
                has: function (t, n) {
                    return x.inEnum(n)
                }
            })
        x._$list = listName;
        var p = 0;
        for (let n in s) {
            if (s.hasOwnProperty(n) && typeof s[n] == "number") {
                obj.defineProp.call(x, n, function (k) {
                    var a = 1 << k - 1;
                    return Boolean((p == 0 && x.value == 0) || (x.value & a) != 0)
                }.bind(x, p),
                    function (v, k) {
                        let ov = x.value;
                        var a = 1 << v - 1;
                        if (k)
                            x.value |= a
                        else
                            x.value &= ~a;
                        if (Number(ov) != Number(x) && x.onchange) {
                            let c = {};
                            c[n] = k;
                            x.onchange(c)
                        };
                    }.bind(x, p)
                );
                p = p + 1;
            }
        }
        obj.defineProp(propName, function () {
            return prx;
        }.bind(x),
            function (v) {
                const _parseEnum = v => {
                    if (typeof v === 'number') return v;
                    if (typeof v === 'string')
                        return v.split(/[+|;, ]+/).reduce((m, t) => m | (s[t.trim()] || 0), 0);
                    return 0;
                };
                let ov = {
                    ...x
                };
                v = _parseEnum(v);
                x.value = v < 0 ? -v : v;
                if (x.onchange) {
                    let y = {};
                    x.forEach((n, v) => {
                        if (ov[n] != x[n]) y[n] = x[n]
                    });
                    x.onchange(y);
                }
            }
        );
    };
    Object.freeze(s);
};
createOrdList("Omonth", "January,February,March,April,May,June,July,August,September,October,November,December");
createOrdList("Oday", "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday");
createOrdList("OdragMode", "none,copy,remove,transfer");
createOrdList("Obutton", {
    none: -1,
    left: 0,
    middle: 1,
    right: 2,
    back: 3,
    forward: 4
});
createOrdList('Olayers', 'background,base,content,tools,widget,mainMenu,dropdown,tooltip,contextMenu,popup,windows,overlay,modal,selection,dragPreview,notification,guide,dialog');
createEnumList("EwindowStatus", "none,show,showmodal,hide,active,minizime,maximize");
createEnumList("EcaptionButton", "none,close,maximize,minizime,restore,help");
createEnumList("EelementStatus", "none,sizable,movable,draggable,insideDrag,dockable,scrollable,selectable,lockable,disable,visible");
createEnumList("Eborder", {
    none: 0,
    left: 1,
    right: 2,
    top: 4,
    bottom: 8,
    leftTop: 1 | 4,
    leftBottom: 1 | 8,
    rightTop: 2 | 4,
    rightBottom: 2 | 8,
    topBottom: 4 | 8,
    leftRight: 1 | 2,
    all: 1 | 2 | 4 | 8
});
createEnumList("Ealign", "none,left,right,top,bottom,center,middle,client,inner,offset");

createEnumList("EcaptionButton", "none,close,maximize,minizime,restore,help");
export const Omonth = window.Omonth;
export const Oday = window.Oday;
export const OdragMode = window.OdragMode;
export const Obutton = window.Obutton;
export const Olayers = window.Olayers;
export const EwindowStatus = window.EwindowStatus;
export const EcaptionButton = window.EcaptionButton;
export const EelementStatus = window.EelementStatus;
export const Eborder = window.Eborder;
export const Ealign = window.Ealign;
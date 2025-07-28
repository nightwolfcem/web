import {Ealign} from '../core/enums.js';
export class Tpoint {
constructor(x = 0, y = 0) {
this.x = x;
this.y = y;
}
distanceTo(point) {
return Math.hypot(this.x - point.x, this.y - point.y);
}
clone() {
return new Tpoint(this.x, this.y);
}
add(point) {
this.x += point.x;
this.y += point.y;
return this;
}
subtract(point) {
this.x -= point.x;
this.y -= point.y;
return this;
}
equals(point) {
return this.x === point.x && this.y === point.y;
}
toString() {
return `(${this.x}, ${this.y})`;
}
}
export class Trect extends DOMRect {
constructor(left = 0, top = 0, width = 0, height = 0) {
super(left, top, width, height);
try {
Object.defineProperties(this, Trect._accessors);
} catch (e) {
return Trect._proxify(this);
}
}
clone() {
return new Trect(this.x, this.y, this.width, this.height);
}
inflate(dx, dy = dx) {
return new Trect(this.x - dx, this.y - dy,
this.width + 2 * dx, this.height + 2 * dy);
}
move(dx, dy) {
return new Trect(this.x + dx, this.y + dy, this.width, this.height);
}
contains(x, y) {
if (typeof x === 'object') {
y = x.y;
x = x.x;
}
return x >= this.left && y >= this.top &&
x <= this.right && y <= this.bottom;
}
static fromElement(el) {
const r = el.getBoundingClientRect();
return new Trect(r.x, r.y, r.width, r.height);
}
toString() {
return `Trect(x:${this.x}, y:${this.y}, w:${this.width}, h:${this.height})`;
}
static _accessors = (() => {
const d = {};
d.left = {
enumerable: true,
configurable: true,
get() {
return this.x;
},
set(v) {
this.x = v;
}
};
d.top = {
enumerable: true,
configurable: true,
get() {
return this.y;
},
set(v) {
this.y = v;
}
};
d.right = {
enumerable: true,
configurable: true,
get() {
return this.x + this.width;
},
set(v) {
this.width = v - this.x;
}
};
d.bottom = {
enumerable: true,
configurable: true,
get() {
return this.y + this.height;
},
set(v) {
this.height = v - this.y;
}
};
return d;
})();
static _proxify(obj) {
return new Proxy(obj, {
get(t, p, r) {
if (p === 'left') return t.x;
if (p === 'top') return t.y;
if (p === 'right') return t.x + t.width;
if (p === 'bottom') return t.y + t.height;
return Reflect.get(t, p, r);
},
set(t, p, v) {
switch (p) {
case 'left':
t.x = v;
break;
case 'top':
t.y = v;
break;
case 'right':
t.width = v - t.x;
break;
case 'bottom':
t.height = v - t.y;
break;
default:
t[p] = v;
}
return true;
}
});
}
}
function _layoutRect(el, useOffset) {
if (useOffset)
return new Trect(
el.offsetLeft + scrollX,
el.offsetTop + scrollY,
el.offsetWidth,
el.offsetHeight
);
return el.clientRect ? el.clientRect() : Trect.fromElement(el);
}
export class TelementPoint extends Tpoint {
#el;
constructor(element) {
const {
x,
y
} = TelementPoint.pagePos(element);
super(x, y);
this.#el = element;
const apply = () => {
const style = this.#el.style;
style.position = style.position || 'absolute';
style.left = this.x + 'px';
style.top = this.y + 'px';
};
['x', 'y'].forEach(k => {
let _val = this[k];
Object.defineProperty(this, k, {
get() {
return _val;
},
set(v) {
_val = v;
apply();
}
});
});
}
static pagePos(el) {
let x = 0,
y = 0,
n = el;
while (n) {
x += n.offsetLeft - n.scrollLeft;
y += n.offsetTop - n.scrollTop;
n = n.offsetParent;
}
return {
x: x + scrollX,
y: y + scrollY
};
}
static viewToElement(el, xOrPt = 0, y = 0) {
const p = el.offsetParent || document.body;
const r = p.getBoundingClientRect();
const X = (xOrPt.x ?? xOrPt) - (r.left + scrollX);
const Y = (xOrPt.y ?? y) - (r.top + scrollY);
return new Tpoint(X, Y);
}
static elementToView(el) {
const p = el.offsetParent || document.body;
const r = p.getBoundingClientRect();
return new Tpoint(r.left + scrollX, r.top + scrollY);
}
static relPos(src, dst) {
const s = TelementPoint.pagePos(src);
const d = TelementPoint.pagePos(dst);
return new Tpoint(s.x - d.x, s.y - d.y);
}
pagePos() {
return TelementPoint.pagePos(this.#el);
}
toPage() {
return this.pagePos();
}
viewToElement(xOrPt = 0, y = 0) {
return TelementPoint.viewToElement(this.#el, xOrPt, y);
}
elementToView() {
return TelementPoint.elementToView(this.#el);
}
relTo(dst) {
return TelementPoint.relPos(this.#el, dst);
}
}
export class TelementRect extends Trect {
#el;
constructor(element) {
super();
this.#el = element;
this.#wireDomSync();
}
#pull() {
const r = this.#el.getBoundingClientRect();
super.x = r.left + scrollX;
super.y = r.top + scrollY;
super.width = r.width;
super.height = r.height;
}
#push(changes) {
if (!changes) changes = ['left', 'top', 'width', 'height'];
if (typeof changes === 'string')
changes = changes.split('+-,;|').map(s => s.trim());
this.suppressRefresh = true;
const s = this.#el.style;
if (s.position === '' || s.position === 'static') {
s.position = 'absolute';
}
if (changes.includes('left') || changes.includes('x')) s.left = super.x + 'px';
if (changes.includes('top') || changes.includes('y')) s.top = super.y + 'px';
if (changes.includes('width')) s.width = super.width + 'px';
if (changes.includes('height')) s.height = super.height + 'px';
delete this.suppressRefresh;
}
#wireDomSync() {
['left', 'top', 'right', 'bottom', 'width', 'height', 'x', 'y'].forEach(prop => {
Object.defineProperty(this, prop, {
get: () => super[prop],
set: v => {
if (prop === 'left') super.x = v;
else if (prop === 'top') super.y = v;
else if (prop === 'right') super.width = v - super.x;
else if (prop === 'bottom') super.height = v - super.y;
else super[prop] = v;
this.#push(prop);
},
enumerable: true,
configurable: true
});
});
}
refresh() {
this.#pull();
}
commit() {
this.#push();
}
static pageRect(el) {
const p = TelementPoint.pagePos(el);
return new Trect(p.x, p.y, el.offsetWidth, el.offsetHeight);
}
static clientRect(el) {
const p = TelementPoint.pagePos(el);
return new Trect(
p.x + el.clientLeft,
p.y + el.clientTop,
el.clientWidth,
el.clientHeight
);
}
static offsetRect(el) {
return TelementRect.pageRect(el);
}
static relRect(src, dst) {
const sr = TelementRect.pageRect(src);
const dr = TelementRect.pageRect(dst);
sr.x -= dr.x;
sr.y -= dr.y;
return sr;
}
static applyPageRect(el, r) {
const pp = TelementPoint.pagePos(el);
el.style.position = 'absolute';
el.style.left = (r.left - pp.x) + 'px';
el.style.top = (r.top - pp.y) + 'px';
el.style.width = r.width + 'px';
el.style.height = r.height + 'px';
}
static alignTo(src, dst, flags = 0, offsetX = 0, offsetY = 0) {
const dRect = ((flags & Ealign.offset) === Ealign.offset) ?
TelementRect.pageRect(dst) :
TelementRect.clientRect(dst);
if (((flags & Ealign.client) === Ealign.client)) {
const t = {
left: dRect.left + offsetX,
top: dRect.top + offsetY,
width: dRect.width,
height: dRect.height
};
return Object.fromEntries(
Object.entries(t).filter(([k, v]) => v != null)
);
}
const orig = {
left: src.offsetLeft,
top: src.offsetTop,
width: src.offsetWidth,
height: src.offsetHeight
};
let left = orig.left,
top = orig.top,
width = orig.width,
height = orig.height;
const inner = ((flags & Ealign.inner) === Ealign.inner);
const L = ((flags & Ealign.left) === Ealign.left),
R = ((flags & Ealign.right) === Ealign.right),
T = ((flags & Ealign.top) === Ealign.top),
B = ((flags & Ealign.bottom) === Ealign.bottom),
C = ((flags & Ealign.center) === Ealign.center),
M = ((flags & Ealign.middle) === Ealign.middle);
if (L && R) {
left = dRect.left;
width = dRect.width;
} else if (L) left = inner ? dRect.left : dRect.left - orig.width;
else if (R) left = inner ? dRect.right - orig.width : dRect.right;
else if (C || (inner && !L && !R))
left = dRect.left + (dRect.width - orig.width) / 2;
if (T && B) {
top = dRect.top;
height = dRect.height;
} else if (T) top = inner ? dRect.top : dRect.top - orig.height;
else if (B) top = inner ? dRect.bottom - orig.height : dRect.bottom;
else if (M || (inner && !T && !B))
top = dRect.top + (dRect.height - orig.height) / 2;
left += offsetX;
top += offsetY;
const all = {
left,
top,
width,
height
};
return Object.fromEntries(
Object.entries(all).filter(([k, v]) => v !== orig[k])
);
}
move(dx, dy) {
super.move(dx, dy);
return this.#push();
}
inflate(dx, dy = dx) {
const inf = super.inflate(dx, dy);
Object.assign(this, inf);
return this.#push();
}
setSize(w, h) {
this.width = w;
this.height = h;
return this.#push();
}
setPosition(x, y) {
this.x = x;
this.y = y;
return this.#push();
}
centerInViewport(align = Ealign.center | Ealign.middle) {
const vw = document.documentElement.clientWidth;
const vh = document.documentElement.clientHeight;
const xMin = scrollX;
const yMin = scrollY;
const elW = this.#el.offsetWidth;
const elH = this.#el.offsetHeight;
let flags = typeof align === "string" ?
align.split(/[\+|,]+/).reduce((m, p) => m | (Ealign[p] || 0), 0) :
align;
let x = flags & Ealign.left ?
xMin :
flags & Ealign.right ?
xMin + vw - elW :
flags & Ealign.center ?
xMin + (vw - elW) / 2 :
this.x;
let y = flags & Ealign.top ?
yMin :
flags & Ealign.bottom ?
yMin + vh - elH :
flags & Ealign.middle ?
yMin + (vh - elH) / 2 :
this.y;
this.x = x;
this.y = y;
return this.#push();
}
#applyChanges(changes) {
const pp = TelementPoint.pagePos(this.#el);
if (changes.left != null) {
this.#el.style.left = `${changes.left - pp.x}px`;
super.x = changes.left;
}
if (changes.top != null) {
this.#el.style.top = `${changes.top - pp.y}px`;
super.y = changes.top;
}
if (changes.width != null) {
this.#el.style.width = `${changes.width}px`;
super.width = changes.width;
}
if (changes.height != null) {
this.#el.style.height = `${changes.height}px`;
super.height = changes.height;
}
}
alignTo(dst, flags = 0, offsetX = 0, offsetY = 0) {
const sc = ["screen", "document", "window", "viewport"];
const tag = typeof dst === "string" ? dst : dst.tagName.toLowerCase();
if (sc.includes(tag)) {
this.centerInViewport(flags);
return this;
}
const changes = TelementRect.alignTo(this.#el, dst, flags, offsetX, offsetY);
this.#applyChanges(changes);
return this;
}
applyPageRect(rect) {
TelementRect.applyPageRect(this.#el, rect);
this.#pull();
}
}
window.TelementRect = TelementRect;
window.TelementPoint = TelementPoint;
window.Trect = Trect;
window.Tpoint = Tpoint;
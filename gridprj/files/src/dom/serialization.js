import { getEventMap } from './eventHandling.js';
import { AllClass } from '../core/classUtils.js';
import { _ctorArgs } from './Telement.js';

const BASELINE = new WeakMap();
const SKIP_KEY = k => /^[_$]/.test(k) || k === '__proto__';

export function serialize(root) {
const seen = new WeakSet();
const ser = (n, parentKey = null, isNew = true) => {
if (n && typeof n.toStr === 'function' && n.toStr !== Object.prototype.toStr) {
const custom = n.toStr(parentKey, isNew);
if (custom !== undefined) return custom;
}
if (n === null || typeof n !== 'object') return n;
if (seen.has(n)) return;
seen.add(n);

if (n.nodeType === 3) return { _$type: 'Text', content: n.nodeValue };
if (n.nodeType === 8) return { _$type: 'Comment', content: n.nodeValue };
if (n.nodeType === 1) return serElement(n);

if (Array.isArray(n)) return { _$type: 'Array', items: n.map((x, i) => ser(x, i, true)) };

const ctor = n.constructor !== Object ? n.constructor.name : undefined;
const out = {};
if (n[_ctorArgs]) {
out._$args = n[_ctorArgs];
}
Object.keys(n).forEach(k => {
if (SKIP_KEY(k)) return;
const v = ser(n[k], k, true);
if (v !== undefined) out[k] = v;
});
if (ctor) out._$ctor = ctor;
return out;
};

function serElement(el) {
const attrs = Object.fromEntries(
[...el.attributes].filter(a => a.name !== 'style').map(a => [a.name, a.value]));
const events = [];
const map = getEventMap(el);
for (const [type, list] of map || []) {
list.forEach(rec => {
const listener = rec.listener;
if (listener && listener._meta && listener._meta.original) {
events.push({
event: type,
method: listener._meta.original.name,
objId: listener._meta.objId,
args: listener._meta.args
});
}
});
}

return {
_$_type: 'Element',
tag: el.tagName,
attrs,
style: el.style.cssText || '',
events,
children: [...el.childNodes].map((c, i) => ser(c, i, true))
};
}
return ser(root);
}

export function _diff(a, b, parentKey = null) {
if (b === undefined) return serialize(a);
if (a === b) return;

if (a && typeof a.toStr === 'function' && a.toStr !== Object.prototype.toStr) {
const custom = a.toStr(parentKey, false);
if (custom !== undefined) return custom;
}

if (a === null || typeof a !== 'object') return a;
if (a.nodeType === 1) return diffElement(a, b);
if (Array.isArray(a)) {
const out = [];
const N = Math.max(a.length, (b || []).length);
for (let i = 0; i < N; i++) {
const d = _diff(a[i], b?.[i], i);
if (d !== undefined) out[i] = d;
}
return out.some(Boolean) ? { _$type: 'Array', items: out } : undefined;
}
const out = {};
const keys = new Set([...Object.keys(a), ...Object.keys(b || {})]);
keys.forEach(k => {
if (SKIP_KEY(k)) return;
const d = _diff(a[k], b?.[k], k);
if (d !== undefined) out[k] = d;
});
return Object.keys(out).length ? out : undefined;
}

export function diff(curr, { reset = false } = {}) {
const base = BASELINE.get(curr);
const delta = _diff(curr, base) ?? {};
if (reset) {
BASELINE.set(curr, serialize(curr));
}
return delta;
}

export function diffElement(el, ref) {
const o = { _$type: 'Element' };
if (!ref || el.tagName !== ref.tag) o.tag = el.tagName;

const at = Object.fromEntries([...el.attributes]
.filter(a => a.name !== 'style').map(a => [a.name, a.value]));
if (JSON.stringify(at) !== JSON.stringify(ref?.attrs || {})) o.attrs = at;
if (el.style.cssText !== (ref?.style || '')) o.style = el.style.cssText || '';

const news = [];
const map = getEventMap(el);
for (const [type, list] of map || []) {
list.forEach(rec => {
const meta = rec.listener?._meta || {};
if (meta.original) {
const existed = (ref?.events || []).some(e => e.event === type &&
e.method === meta.original.name &&
e.objId === meta.objId);
if (!existed) {
news.push({ event: type, method: meta.original.name, objId: meta.objId, args: meta.args });
}
}
});
}
if (news.length) o.events = news;

const kids = [];
const L = Math.max(el.childNodes.length, (ref?.children || []).length);
for (let i = 0; i < L; i++) {
const d = _diff(el.childNodes[i], ref?.children?.[i], i);
if (d !== undefined) kids[i] = d;
}
if (kids.some(Boolean)) o.children = kids;

return Object.keys(o).length > 1 ? o : undefined;
}

export function applyPatch(base, patch, parentObj = null, parentKey = null) {
if (patch === undefined) return base;
if (patch === null || typeof patch !== 'object') return patch;

if (patch._ctor && window[patch._ctor]) {
const C = window[patch._ctor];
if (typeof C.fromStr === 'function' && C.fromStr !== Object.fromStr) {
const isNew = base === undefined || base === null;
return C.fromStr(patch, parentObj, parentKey, isNew, base);
}
const obj = new C(...(patch._args || []));
return applyPatch(obj, patch.diff, parentObj, parentKey);
}

if (patch._$_type === 'Element') return patchElement(base, patch);

if (patch._$type === 'Array') {
const arr = base || [];
patch.items?.forEach((p, i) => arr[i] = applyPatch(arr[i], p, arr, i));
return arr;
}

let obj = base;
if (!obj || patch._$ctor) {
const C = window[patch._$ctor] || Object;
obj = new C();
}
Object.entries(patch).forEach(([k, v]) => {
if (k.startsWith('_$')) return;
obj[k] = applyPatch(obj[k], v, obj, k);
});
return obj;
}

export function patchElement(base, p) {
let el = base?.htmlObject || document.createElement(p.tag || 'DIV');
if (p.attrs) Object.entries(p.attrs).forEach(([k, v]) => el.setAttribute(k, v));
if (p.style !== undefined) el.style.cssText = p.style;

if (p.events) {
p.events.forEach(e => {
const owner = AllClass.byId[e.objId] || null;
const fn = owner?.[e.method];
if (fn && typeof fn === 'function') {
fn.bindToEvent(el, e.event, owner, ...(e.args || []));
}
});
}
p.children?.forEach((c, i) => {
const childNode = el.childNodes[i];
const childBase = childNode?.owner || childNode;
const child = applyPatch(childBase, c, el, i);
if (!childNode && child) {
el.appendChild(child.htmlObject || child);
}
});
return base || { htmlObject: el };
}

export function annotatePatch(patchNode, currNode, baseNode) {
if (!patchNode || typeof patchNode !== 'object') return;

if (baseNode === undefined && patchNode._$ctor) {
const ctorName = patchNode._$ctor;
const args = Array.isArray(patchNode._$args) ? patchNode._$args : [];

const C = window[ctorName] || Object;
let freshBaseline = {};
try {
freshBaseline = serialize(new C(...args));
} catch (e) { /* ignore */ }

const rawCurr = currNode;
const minimal = _diff(rawCurr, freshBaseline) || {};

Object.keys(patchNode).forEach(k => delete patchNode[k]);
patchNode._ctor = ctorName;
if (args.length) patchNode._args = args;
patchNode.diff = minimal;

annotatePatch(patchNode.diff, rawCurr, freshBaseline);
return;
}

for (const key of Object.keys(patchNode)) {
if (key === '_$ctor' || key === '_$args') continue;
if (patchNode.diff && key === 'diff') {
annotatePatch(patchNode.diff, currNode, baseNode);
} else {
annotatePatch(
patchNode[key],
currNode ? currNode[key] : undefined,
baseNode ? baseNode[key] : undefined
);
}
}
}

export function patchPrototypesForSerialization() {
Object.prototype.track = function () {
BASELINE.set(this, serialize(this));
return this;
};

Object.defineProperty(Object.prototype, 'toStr', {
value: function () {
const base = BASELINE.get(this) || {};
const current = serialize(this);
const diff = _diff(current, base);
const output = {
_ctor: this.constructor.name,
_args: this[_ctorArgs] || [],
diff: diff || {}
};
return JSON.stringify(output, null, 2);
},
writable: true, configurable: true, enumerable: false
});

Object.defineProperty(Object.prototype, 'toMinStr', {
value: function () {
const baseTree = BASELINE.get(this) || {};
const currTree = serialize(this);
const rawDelta = _diff(currTree, baseTree) || {};
annotatePatch(rawDelta, currTree, baseTree);
const out = { _ctor: this.constructor.name };
if (Array.isArray(currTree._$args) && currTree._$args.length) {
out._args = currTree._$args;
}
out.diff = rawDelta;
return JSON.stringify(out, null, 2);
},
writable: true, configurable: true, enumerable: false
});

function fromMinStr(str) {
try {
const { _ctor, _args = [], diff } = JSON.parse(str);
const C = window[_ctor] || Object;
const obj = new C(..._args);
if (diff) applyPatch(obj, diff);
return obj;
} catch(e) {
console.error("Error parsing minStr:", e);
return null;
}
}

String.prototype.toMinObject = function () {
return fromMinStr(this);
};

String.prototype.toObject = function () {
try {
const parsed = JSON.parse(this);
const Ctor = window[parsed._ctor] || Object;
const instance = new Ctor(...(parsed._args || []));
if (parsed.diff) {
applyPatch(instance, parsed.diff);
}
return instance;
} catch(e) {
console.error("Error parsing string to object:", e);
return null;
}
};
}


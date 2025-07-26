import { getEventMap, getFnById } from '../dom/eventHandling.js';
import { AllClass } from '../core/classUtils.js';
const SKIP_KEYS = [
"parent", "owner", "parentNode", "parentElement",
"__proto__", "prototype", "style", "computedStyleMap",
];
export function deepCopy(root, skipKeys) {
const seen = new WeakMap(); // { orijinal → klon }
const rootId = root && root.id != null ? root.id : -1;
let rootClone;
function cloneAny(obj) {
if (obj === null || typeof obj !== "object") return obj;
if (seen.has(obj)) return seen.get(obj);
if (obj.nodeType) {
switch (obj.nodeType) {
case Node.TEXT_NODE: {
const out = document.createTextNode(obj.nodeValue ?? "");
seen.set(obj, out);
return out;
}
case Node.COMMENT_NODE: {
const out = document.createComment(obj.nodeValue ?? "");
seen.set(obj, out);
return out;
}
case Node.ELEMENT_NODE: {
const el = document.createElement(obj.tagName);
seen.set(obj, el);
Array.from(obj.attributes).forEach(attr => {
if (attr.name.toLowerCase() !== "style") {
el.setAttribute(attr.name, attr.value);
}
});
if (obj.style?.cssText) el.style.cssText = obj.style.cssText;
if (!obj.childNodes.length) el.textContent = obj.textContent ?? "";
const srcMap = getEventMap(obj);
if (srcMap) {
for (const [type, list] of srcMap) {
for (const rec of list) {
const wrapper = getFnById(rec.id);
if (wrapper?._meta?.original) {
const orig = wrapper._meta.original;
const args = wrapper._meta.args || [];
const objId = wrapper._meta.objId ?? -1;
let targetCtx = null;
if (objId !== -1) {
targetCtx = AllClass.byId[objId] || AllClass.byOrder[objId];
}
orig.bindToEvent(el, type, targetCtx, ...args);
} else {
el.addEventListener(type, wrapper, rec.options);
}
}
}
}
obj.childNodes.forEach(n => el.appendChild(cloneAny(n)));
return el;
}
}
}
if (typeof obj.copy === "function" && obj.copy !== Object.prototype.copy && !("nodeType" in obj)) {
seen.set(obj, {});
const out = obj.copy();
seen.set(obj, out);
return out;
}
if (Array.isArray(obj)) {
const arr = [];
seen.set(obj, arr);
obj.forEach((item, i) => arr[i] = cloneAny(item));
return arr;
}
const Ctor = typeof obj.constructor === "function" ? obj.constructor : Object;
const out = new Ctor();
seen.set(obj, out);
if (out.id != null) rootClone = out;
Object.keys(obj).forEach(k => {
if (SKIP_KEYS.includes(k) || skipKeys?.includes(k)) return;
out[k] = cloneAny(obj[k]);
});
return out;
}
return cloneAny(root);
}

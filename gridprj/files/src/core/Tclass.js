import {
AllClass,
OID,
incrementOid
} from './classUtils.js';
import {
extendsClass
} from './classUtils.js';
export class Tclass extends Object {
#id;
#name;
constructor() {
super();
this.#id = incrementOid();
var k = AllClass.byClass;
var p, z = new Array();
p = this.$parent;
z.unshift(p.constructor.name);
while (p) {
if (p.$parent && p.$parent.constructor.name != "Object") {
z.unshift(p.$parent.constructor.name);
p = p.$parent;
} else
break;
}
for (p = 0; p < z.length; p++) {
if (!k[z[p]])
k[z[p]] = new Array();
k = k[z[p]];
}
k.push(this);
// Dinamik isim
Object.defineProperty(this, "name", {
get: () => `${this.$parent?.constructor.name || "Root"}-${this.id}`,
enumerable: true,
});
AllClass.byId[this.id] = this;
AllClass.byOrder.push(this);
}
get id() {
if (this.#id === undefined) {
this.#id = incrementOid();
}
return this.#id;
}
get name() {
return this.constructor.name;
}
get $parent() {
return Object.getPrototypeOf(this);
}
destroy() {
// AllClass.byId’dan kaldır
if (AllClass.byId[this.id])
delete AllClass.byId[this.id];
// AllClass.byOrder’dan çıkar
if (AllClass.byOrder)
AllClass.byOrder = AllClass.byOrder.filter(x => x !== this);
// AllClass.byClass’tan çıkar (gerekirse recursive fonksiyonla)
function removeFromNestedArr(arr, obj) {
if (Array.isArray(arr)) {
const idx = arr.indexOf(obj);
if (idx > -1) arr.splice(idx, 1);
else arr.forEach(subArr => removeFromNestedArr(subArr, obj));
}
}
removeFromNestedArr(AllClass.byClass, this);
}
}

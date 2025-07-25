export const AllClass = {
byClass: {},
byId: [],
byOrder: []
};
export var OID = 0;
export function incrementOid() {
return ++OID;
}
/**
* Belirtilen sınıfa ait örnekleri, sınıf hiyerarşisine göre arar.
* @param {Object} cname - Sınıf nesnesi (ör. Telement).
* @param {boolean} [searchInParents=false] - Üst sınıflarda da arama yapılsın mı?
* @returns {Array|boolean} - Bulunan nesneler dizisi veya bulunamazsa false.
*/
export const classToObjects = (cname, searchInParents = false) => {
const names = [];
const instances = [];
const findSubInstances = (collection, searchSub) => {
for (const key in collection) {
if (Object.hasOwn(collection, key)) {
if (isNaN(key)) {
if (searchSub) findSubInstances(collection[key], searchSub);
} else {
instances.push(collection[key]);
}
}
}
};
let protoChain = cname;
if (protoChain && protoChain.name) {
names.unshift(protoChain.name);
while (protoChain) {
const pp = Object.getPrototypeOf(protoChain);
if (pp && pp.name && pp.name !== "Object") {
names.unshift(pp.name);
protoChain = pp;
} else {
break;
}
}
} else {
return false; // cname geçerli bir constructor değilse
}
let registry = AllClass.byClass;
for (const className of names) {
if (registry[className]) {
registry = registry[className];
} else {
return false;
}
}
findSubInstances(registry, searchInParents);
return instances;
};
/**
* ID ile nesne arama fonksiyonu.
* @param {number} id - Aranacak nesnenin benzersiz ID'si.
* @returns {Object|null} - Bulunan nesne veya bulunamazsa null.
*/
export const getObjectById = (id) => {
return AllClass.byId[id] || null;
};
// ... extendsClass ve overloadFunction kodları burada devam ediyor ...
export function extendsClass(...mixins) {
let s, i, str = "";
for (i = mixins.length - 1; i > 0; i--) {
s = (arguments[i - 1] + "");
if (!/constructor\s*\([^)]*\)\s*{\s*[^}]*\bsuper\b[^();]*/.test(s))
s = s.replace(/(constructor\s*\([^)]*\)\s*{)/, "$1super();");
str += (i == 1 ? "(" : "") + s.replace(RegExp(arguments[i - 1].name + "({|\\s.*{)?"), arguments[i - 1].name + " extends " + arguments[i].name + " {").replaceAll("//super", "super") + (i == 1 ? ")" : "");
}
const NewClass = eval(str);
const __Wrapped = class extends NewClass {
constructor(...args) {
super(...args);
const parents = [];
const Self = this.constructor;
parents.push(Self);
let inArray = function(name, array) {
let t;
for (let i = 0; i < array.length; i++) {
if (typeof array[i] === 'array') {
t = inArray(name, array[i]);
if (t) return true;
} else if (array[i].name === name) {
return true;
}
}
return false;
}
let proto = Object.getPrototypeOf(Self.prototype);
while (proto && proto.constructor !== Object) {
const Ctor = proto.constructor;
if (!(parents.includes(Ctor) || mixins.includes(Ctor) || inArray(Ctor.name, mixins) || Ctor === __Wrapped)) {
parents.push(Ctor);
}
proto = Object.getPrototypeOf(proto);
}
parents.push(mixins);
this.$parents = parents;
}
};
function patchHasInstance(C) {
Object.defineProperty(C, Symbol.hasInstance, {
value(inst) {
if (Function.prototype[Symbol.hasInstance].call(this, inst)) {
return true;
}
const pArr = inst?.$parents;
if (!Array.isArray(pArr)) return false;
return pArr.some(entry =>
entry === C ||
(Array.isArray(entry) && entry.includes(C))
);
},
configurable: true
});
}
[...mixins, __Wrapped].forEach(patchHasInstance);
return __Wrapped;
}

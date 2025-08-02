import {
deepCopy
} from '../utils/objectUtils.js'
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
if (typeof value.copy === "function") {
this[key] = value.copy();
} else {
this[key] = value;
}
} else if (this[key] !== undefined) {
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
if (!(val in this) && obj.hasOwnProperty(val))
this[val] = obj[val];
};
Object.prototype.compare = function(Obj) {
if (this.__proto__.constructor.name == "ajax") {
return;
}
var rtn = true;
var p;
for (var P in Obj) {
if (Obj.hasOwnProperty(P) && !Function.prototype[P]) {
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
} else
if (this[p] == undefined) {
rtn = false;
return false;
} else
if (!((inv && this[p] != Obj[P]) || (!inv && this[p] == Obj[P]))) {
return false;
}
}
}
return rtn;
};
Object.prototype.defineProp = function(p, getf = null, setf = null, enumerable = true, configurable = true, writable = true, value = undefined) {
var x = {};
if (typeof getf === "object" && getf !== null)
x = getf;
else {
let i = 1;
if (typeof getf === 'function')
if (getf.length === 0)
x.get = getf
else
x.set = getf;
i++;
if (typeof arguments[i] === 'function')
x.set = setf;
i++;
if (i < arguments.length)
x.enumerable = arguments[i];
i++;
if (i < arguments.length)
x.configurable = arguments[i];
i++;
if (i < arguments.length && !x.get && !x.set)
x.writable = arguments[i];
i++;
if (i < arguments.length && arguments[i] != undefined)
x.value = arguments[i];
}
if (x.enumerable === undefined) x.enumerable = true;
if (x.configurable === undefined) x.configurable = true;
Object.defineProperty(this, p, x);
};
Object.defineProperty(Object.prototype, 'copy', {
value: function(skipKeys) {
return deepCopy(this, skipKeys);
},
writable: false,
configurable: false,
enumerable: false
});

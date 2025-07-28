Array.prototype.filterRemove = function(predicate) {
let rtn = [];
for (let i = this.length - 1; i >= 0; i--) {
if (predicate(this[i], i, this)) {
rtn.push(...this.splice(i, 1));
}
}
return rtn;
};

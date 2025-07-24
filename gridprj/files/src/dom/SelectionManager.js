// Bu sınıf, seçilebilir nesnelerin durumunu yönetir.
// Hangi nesnenin seçili olduğunu takip eder ve seçim değişikliklerinde olay yayınlar.
export class TselectionManager extends EventTarget {
constructor() {
super();
this._selected = new Set();
}
/**
* Bir öğeyi seçer.
* @param {*} item - Seçilecek nesne.
* @param {object} options - Seçim opsiyonları (multi, silent, onSelect vb.).
*/
select(item, { multi = false, silent = false, scrollIntoView = false, onSelect, cssClass = 'selected', animate = false, filter } = {}) {
if (filter && !filter(item)) return;
// Çoklu seçim aktif değilse, mevcut seçimi temizle (tıklanan hariç).
if (!multi) this.clear({ silent, except: item });
if (!this._selected.has(item)) {
this._selected.add(item);
if (typeof onSelect === 'function') onSelect(item);
if (!silent) {
this.dispatchEvent(new CustomEvent('change', {
detail: { action: 'select', item, cssClass }
}));
}
if (scrollIntoView && item.htmlObject?.scrollIntoView) {
item.htmlObject.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}
if (animate && item.htmlObject?.classList) {
item.htmlObject.classList.add('select-animate');
setTimeout(() => item.htmlObject.classList.remove('select-animate'), 300);
}
}
}
/**
* Bir öğenin seçimini kaldırır.
* @param {*} item - Seçimi kaldırılacak nesne.
*/
deselect(item, { silent = false } = {}) {
if (this._selected.delete(item) && !silent) {
this.dispatchEvent(new CustomEvent('change', {
detail: { action: 'deselect', item }
}));
}
}
/**
* Tüm seçimi temizler.
* @param {object} options - Temizleme opsiyonları (silent, except).
*/
clear({ silent = false, except = null } = {}) {
for (let item of [...this._selected]) {
if (item === except) continue;
if (!silent) {
this.dispatchEvent(new CustomEvent('change', {
detail: { action: 'deselect', item }
}));
}
this._selected.delete(item);
}
}
/**
* Bir öğenin seçim durumunu değiştirir (seçiliyse kaldırır, değilse seçer).
* @param {*} item - Durumu değiştirilecek nesne.
*/
toggle(item, opts = {}) {
if (this._selected.has(item)) this.deselect(item, opts);
else this.select(item, opts);
}
/**
* Bir öğenin seçili olup olmadığını kontrol eder.
* @param {*} item - Kontrol edilecek nesne.
*/
has(item) {
return this._selected.has(item);
}
/**
* Seçili tüm öğeleri bir dizi olarak döndürür.
*/
get selection() {
return [...this._selected];
}
}


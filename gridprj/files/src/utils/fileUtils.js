export function saveFile(name, data, mime = 'application/json;charset=utf-8') {
const blob = data instanceof Blob ?
data :
new Blob(
[data instanceof Uint8Array ? data : String(data)], {
type: mime
}
);
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = name;
a.style.display = 'none';
document.body.appendChild(a);
a.click();
setTimeout(() => {
URL.revokeObjectURL(a.href);
a.remove();
}, 0);
}
export function openFile(accept = '.json,.txt') {
return new Promise((resolve, reject) => {
const input = document.createElement('input');
input.type = 'file';
input.accept = accept;
input.style.display = 'none';
input.onchange = () => {
const file = input.files[0];
if (!file) {
reject(new Error('Dosya seçilmedi.'));
return;
}
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.onerror = err => reject(err);
reader.readAsText(file);
input.remove();
};
document.body.appendChild(input);
input.click();
});
}

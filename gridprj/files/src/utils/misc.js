export async function loadJSON(fileURL) {
var rtn = await fetch(fileURL)
return await rtn.json()
};
export function quote(string) {
var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
const meta = { // table of character substitutions
'\b': '\\b',
'\t': '\\t',
'\n': '\\n',
'\f': '\\f',
'\r': '\\r',
'"': '\\"',
'\\': '\\\\'
};
escapable.lastIndex = 0;
return escapable.test(string) ? '"' + string.replace(escapable, function(a) {
var c = meta[a];
return typeof c === 'string' ?
c :
'\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
}) + '"' : '"' + string + '"';
}
export const is_gecko = /gecko/i.test(navigator.userAgent);
export const is_ie = /MSiE/.test(navigator.userAgent);

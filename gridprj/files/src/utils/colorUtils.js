function giveHex(s) {
s = s.toUpperCase();
return parseInt(s, 16);
}
export function hexTorgb(hex) {
var r, g, b, clrs = hex.match(/[^#]./g);
if (!clrs)
return false;
r = giveHex(clrs[0]);
g = clrs.length == 3 ? giveHex(clrs[1]) : r;
b = clrs.length == 3 ? giveHex(clrs[2]) : r;
return [r, g, b];
};
export function rgbTohex(r, g, b) {
return "#" + DecToHex(r) + DecToHex(g) + DecToHex(b);
};
var hexbase = "0123456789ABCDEF";
function DecToHex(number) {
return hexbase.charAt((number >> 4) & 0xf) + hexbase.charAt(number & 0xf);
}
export function calculateLuminance(hex) {
hex = hex.replace("#", "");
let [r, g, b] = hexTorgb(hex);
r = r / 255;
g = g / 255;
b = b / 255;
const transform = (value) =>
value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
const lumR = transform(r);
const lumG = transform(g);
const lumB = transform(b);
return 0.2126 * lumR + 0.7152 * lumG + 0.0722 * lumB;
}
export class Tcolor {
constructor(r = 0, g = 0, b = 0, a = 1) {
this.red = r;
this.green = g;
this.blue = b;
this.alpha = a;
}
toHex() {
return Tcolor.rgbToHex(this.red, this.green, this.blue);
}
toHsva() {
return Tcolor.rgbToHsva(this.red, this.green, this.blue, this.alpha);
}
toString() {
return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
}
inverse() {
return new Tcolor(
255 - this.red,
255 - this.green,
255 - this.blue,
this.alpha
);
}
static inverse(input) {
if (!input) throw new Error('Tcolor.inverse(input) requires a value.');
if (typeof input === 'string') {
const [r, g, b] = Tcolor.hexToRgb(input);
return new Tcolor(r, g, b).inverse();
}
if (input instanceof Tcolor) {
return input.inverse();
}
throw new TypeError('Expected a Tcolor instance or hex string');
}
grayScale() {
const gray = Math.round(
((this.red + this.green + this.blue) / 3)
);
return new Tcolor(gray, gray, gray, this.alpha);
}
static grayScale(input) {
if (!input) throw new Error('Tcolor.grayScale(input) requires a value.');
if (typeof input === 'string') {
const [r, g, b] = Tcolor.hexToRgb(input);
return Math.round(((r + g + b) / 3));
}
if (input instanceof Tcolor) {
return input.grayScale();
}
throw new TypeError('Expected a Tcolor instance or hex string');
}
clone() {
return new Tcolor(this.red, this.green, this.blue, this.alpha);
}
static fromHex(hex) {
const [r, g, b] = Tcolor.hexToRgb(hex);
return new Tcolor(r, g, b, 1);
}
static fromHsva(hsva) {
const {
r,
g,
b
} = Tcolor.hsvaToRgb(hsva);
return new Tcolor(r, g, b, hsva.a);
}
static rgbToHex(r, g, b) {
const toHex = v => v.toString(16).padStart(2, '0');
return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
static rgbToHsva(r, g, b, a = 1) {
r /= 255;
g /= 255;
b /= 255;
const max = Math.max(r, g, b),
min = Math.min(r, g, b);
let h = 0,
s = 0,
v = max;
const d = max - min;
s = max === 0 ? 0 : d / max;
if (d !== 0) {
if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
else if (max === g) h = (b - r) / d + 2;
else h = (r - g) / d + 4;
h *= 60;
}
return {
h,
s,
v,
a
};
}
static hexToHsva(hex) {
if (hex[0] === "#") hex = hex.slice(1);
let r = parseInt(hex.substring(0, 2), 16) / 255;
let g = parseInt(hex.substring(2, 4), 16) / 255;
let b = parseInt(hex.substring(4, 6), 16) / 255;
r = isNaN(r) ? 0 : r;
g = isNaN(g) ? 0 : g;
b = isNaN(b) ? 0 : b;
let max = Math.max(r, g, b),
min = Math.min(r, g, b);
let h, s, v = max;
const d = max - min;
s = max === 0 ? 0 : d / max;
if (max === min) {
h = 0;
} else {
switch (max) {
case r:
h = (g - b) / d + (g < b ? 6 : 0);
break;
case g:
h = (b - r) / d + 2;
break;
case b:
h = (r - g) / d + 4;
break;
}
h *= 60;
}
return {
h,
s,
v,
a: 1
};
}
static hexToRgb(hex) {
hex = hex.replace(/^#/, '');
if (hex.length === 3) {
hex = hex.split('').map(c => c + c).join('');
}
const bigint = parseInt(hex, 16);
return [
(bigint >> 16) & 255,
(bigint >> 8) & 255,
bigint & 255
];
}
static hsvaToRgb({
h,
s,
v
}) {
const c = v * s;
const x = c * (1 - Math.abs((h / 60) % 2 - 1));
const m = v - c;
let r1 = 0,
g1 = 0,
b1 = 0;
if (h >= 0 && h < 60)[r1, g1, b1] = [c, x, 0];
else if (h < 120)[r1, g1, b1] = [x, c, 0];
else if (h < 180)[r1, g1, b1] = [0, c, x];
else if (h < 240)[r1, g1, b1] = [0, x, c];
else if (h < 300)[r1, g1, b1] = [x, 0, c];
else [r1, g1, b1] = [c, 0, x];
return {
r: Math.round((r1 + m) * 255),
g: Math.round((g1 + m) * 255),
b: Math.round((b1 + m) * 255)
};
}
static hsvaToRgba(hsva) {
const rgb = this.hsvaToRgb(hsva);
return `rgba(${rgb.r},${rgb.g},${rgb.b},${hsva.a})`;
}
static toHex(color) {
if (!color) return "#ff0000";
if (color.startsWith("#")) return color;
const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
if (rgbMatch)
return (
"#" + [1, 2, 3]
.map(i => parseInt(rgbMatch[i]).toString(16).padStart(2, "0"))
.join("")
);
return color; // fallback
}
toRgb() {
return {
r: this.red,
g: this.green,
b: this.blue,
a: this.alpha
};
}
}

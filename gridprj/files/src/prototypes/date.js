Date.prototype.daysinMonth = function(iMonth, iYear) {
iMonth = this == Date.prototype ? iMonth : this.getMonth();
iYear = this == Date.prototype ? iYear : this.getFullYear();
return 32 - new Date(iYear, iMonth, 32).getDate();
}
Date.prototype.firsOdayinMonth = function(month, year) {
month = this == Date.prototype ? month : this.getMonth();
year = this == Date.prototype ? year : this.getFullYear();
var dt = new Date();
dt.setFullYear(year, month, 1);
return dt.getDay();
}
Date.prototype.strToDate = function(datestring) {
try {
let date = this == Date.prototype ? new Date() : this;
date.setTime(date.parse(datestring));
} catch (event) {
return false;
}
return date;
}
Date.prototype.formatText = function(date, format) {
var d = format ? date : this;
format = format ? format : date;
var y = String(d.getFullYear());
var m = String(d.getMonth() + 1);
var dd = String(d.getDate());
var g = d.getDay(); // Note: Original code has geOday(), assuming getDay()
var h = String(d.getHours());
var n = String(d.getMinutes());
var s = String(d.getSeconds());
var fmtp = /[ymdhns]*[^\/\\ *-:._]/g;
var rtn, rtnf, lp, x, ek = "";
rtnf = "";
lp = 0;
while (x = fmtp.exec(format)) {
if (lp != 0)
ek = format.substring(lp, x.index);
rtn = "";
lp = x.index + x[0].length;
if (x[0].charAt(0) == "y")
rtn = x[0].length <= 2 ? y.substring(2, 4) : y;
else if (x[0].charAt(0) == "m")
rtn = x[0].length == 1 ? m : x[0].length == 2 ? (m.length == 1 ? "0" + m : m) : x[0].length == 3 ? Intl.DateTimeFormat(Intl.locate().dateFormat.locale, {
month: "short"
}).format(d) : Intl.DateTimeFormat(Intl.locate().dateFormat.locale, {
month: "long"
}).format(d);
else if (x[0].charAt(0) == "d") {
rtn = x[0].length == 1 ? dd : x[0].length == 2 ? (dd.length == 1 ? "0" + dd : dd) : x[0].length == 3 ? Intl.DateTimeFormat(Intl.locate().dateFormat.locale, {
weekday: "short"
}).format(d) : Intl.DateTimeFormat(Intl.locate().dateFormat.locale, {
weekday: "long"
}).format(d);
}
if (x[0].charAt(0) == "h")
rtn = x[0].length == 1 ? h : (h.length == 1 ? "0" + h : h);
else if (x[0].charAt(0) == "n")
rtn = x[0].length == 1 ? n : (n.length == 1 ? "0" + n : n);
else if (x[0].charAt(0) == "s")
rtn = x[0].length == 1 ? s : (s.length == 1 ? "0" + s : s);
if (rtn != "" && rtnf != "") rtnf = rtnf + (ek ? ek : "") + rtn;
else if (rtn != "") rtnf += rtn;
}
return rtnf;
}

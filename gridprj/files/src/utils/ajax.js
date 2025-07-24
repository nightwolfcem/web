import {
Tclass
} from '../core/Tclass.js';
export const ct_form = "application/x-www-form-urlencoded",
ct_text = "text/plain",
ct_html = "text/html",
ct_xml = "application/xml, text/xml",
ct_json = "application/json, text/javascript";
export class Tajax extends Tclass {
constructor() {
super();
this.url = "";
this.htmlObject = new XMLHttpRequest();
this.xml = true;
this.method = "GET";
this.params = "";
this.username = "";
this.password = "";
this.async = true;
this.contentType = ct_form;
}
open() {
var urlx = this.url;
if (this.method == "GET")
urlx = urlx + "?" + this.params;
this.htmlObject.open(this.method, urlx, this.async, this.username, this.password);
if (this.htmlObject.overrideMimeType)
this.htmlObject.overrideMimeType("application/x-www-form-urlencoded");
this.htmlObject.setRequestHeader('Content-Type', "application/x-www-form-urlencoded");
if (this.method == "POST") {
this.htmlObject.send(this.params);
} else
this.htmlObject.send();
var o = this;
this.htmlObject.onreadystatechange = function() {
if (o.htmlObject.readyState == 4 && o.htmlObject.status == 200) {
o.result = o.htmlObject.responseText;
if (o.onresponse)
o.onresponse(o.htmlObject.responseText, o.htmlObject.responseXML);
}
};
}
};

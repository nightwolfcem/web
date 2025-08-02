export class TxmlParser {
constructor(xml) {
this.xml = "";
if (window.DOMParser) {
const parser = new DOMParser();
this.xmlDoc = parser.parseFromString(xml, "text/xml");
} else { // Internet Explorer
this.xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
this.xmlDoc.async = false;
this.xmlDoc.loadXML(xml);
}
}
forEach(tagName, func) {
const elem = this.xmlDoc.getElementsByTagName(tagName);
if (elem) {
for (var i = 0; i < elem.length; i++) {
func(i, elem[i]);
}
}
}
text(elem) {
for (var i = 0; i < elem.childNodes.length; i++) {
if (elem.childNodes[i].nodeType == 3) // TEXT_NODE
return elem.childNodes[i].nodeValue;
}
}
}
window.TxmlParser = TxmlParser;

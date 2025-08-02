import assert from 'assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;

// Load modules
// 'src' klasörü artık 'files/js/src' konumuna taşındı.
// Testlerdeki modül yollarını güncel konuma göre düzenliyoruz.
const { DOM } = await import('../files/js/src/dom/dom.js');
const { Twindow } = await import('../files/js/src/ui/Twindow.js');

// trigger DOM load handlers
document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

const win = new Twindow();
win.showModal();
assert.strictEqual(win.parent, DOM.baseLayer.subLayers.modal, 'placed in modal layer');
win.hide();
assert.strictEqual(win.parent, null, 'removed on hide');

const dlg = new Twindow();
dlg.showDialog();
const defLayer = DOM.baseLayer.subLayers.popup || DOM.baseLayer.subLayers.windows;
assert.strictEqual(dlg.parent, defLayer, 'dialog placed in popup/windows');
dlg.hide();
assert.strictEqual(dlg.parent, null, 'dialog removed on hide');

console.log('All tests passed');

import assert from 'assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.DOMRect = dom.window.DOMRect;
global.location = dom.window.location;
const { TpositionedElement } = await import('../files/js/src/dom/TpositionedElement.js');
global.TpositionedElement = TpositionedElement;

const { TBoxModelPanel } = await import('../files/js/src/ui/style-editor/TBoxModelPanel.js');

document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

const target = document.createElement('div');
document.body.appendChild(target);
const container = document.createElement('div');
document.body.appendChild(container);

const panel = new TBoxModelPanel(target, container);
panel.showControls('margin');

// Simulate user changing top margin through numeric control
const topInput = container.querySelector('.control.top input');
assert.ok(topInput, 'top control created');
topInput.value = '10';
topInput.dispatchEvent(new dom.window.Event('change'));

assert.strictEqual(target.style.marginTop, '10px', 'margin-top updated');

console.log('BoxModelPanel tests passed');

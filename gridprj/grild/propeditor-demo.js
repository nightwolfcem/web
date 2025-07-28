import '../files/js/src/main.js';
import { TpropEditor } from '../files/js/src/ui/prop-editor/TpropEditor.js';
import { Ttree } from '../files/js/src/ui/prop-editor/Ttree.js';
import { editorRegistry ,TbaseEditor} from '../files/js/src/ui/prop-editor/editorRegistry.js';

import { TtreeView } from '../files/js/src/ui/Ttreeview.js';
import { DOM } from '../files/js/src/dom/dom.js';
import { Tlayer } from '../files/js/src/dom/Tlayer.js';
import { selectionManager } from '../files/js/src/core/globals.js';
import { HTML_TAGS } from '../files/js/src/asset/HTML_TAGS.js';

class TsliderEditor extends TbaseEditor {
  render(){
    const input = document.createElement('input');
    input.type = 'range';
    input.min = 0;
    input.max = 1000;
    input.value = this.initialValue || 0;
    input.addEventListener('input', () => this._updateValue(parseFloat(input.value)));
    return input;
  }
}

editorRegistry.register(
  (v, k) => typeof v === 'number' && /(width|height|left|top)/i.test(k),
  TsliderEditor
);

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.style.flex = '1';
  app.style.display = 'flex';

  const left = document.createElement('div');
  left.style.cssText = 'width:220px;border-right:1px solid #ccc;display:flex;flex-direction:column;';
  const tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;';
  const btnElements = document.createElement('button');
  btnElements.textContent = 'Elemanlar';
  const btnLayers = document.createElement('button');
  btnLayers.textContent = 'Katmanlar';
  tabs.append(btnElements, btnLayers);
  const leftContent = document.createElement('div');
  leftContent.style.cssText = 'flex:1;overflow:auto;';
  left.append(tabs, leftContent);

  const designArea = document.createElement('div');
  designArea.style.cssText = 'flex:1;position:relative;overflow:auto;';

  const right = document.createElement('div');
  right.style.cssText = 'width:300px;border-left:1px solid #ccc;overflow:auto;';

  app.append(left, designArea, right);

  // Tab panel
  const elementTreeContainer = document.createElement('div');
  const elementTree = new Ttree(elementTreeContainer);

  // Build tree using parent relationships for better hierarchy
  function buildTree(parent) {
    const branch = {};
    for (const [tag, info] of Object.entries(HTML_TAGS)) {
      let parents = info.parentTag;
      if (!parents) parents = ['html'];
      if (!Array.isArray(parents)) parents = [parents];
      if (parents.some(p => (p || 'html').toLowerCase() === parent.toLowerCase())) {
        branch[tag] = buildTree(tag);
      }
    }
    return branch;
  }
  const treeData = { html: buildTree('html') };
  elementTree.build(treeData, 'HTML');

  // Decorate labels with icons (if any)
  elementTree.container.querySelectorAll('.tree-node').forEach(el => {
    const tag = el.treeNodeInstance.data.key.toLowerCase();
    const info = HTML_TAGS[tag];
    if (info && info.icon) {
      el.querySelector('.label').innerHTML = info.icon + ' ' + tag;
    }
  });

  const layerTreeContainer = document.createElement('div');
  let currentTab = null;
  function showTab(tab){
    leftContent.innerHTML = '';
    btnElements.classList.toggle('active', tab === 'elements');
    btnLayers.classList.toggle('active', tab === 'layers');
    currentTab = tab;
    if(tab === 'elements') leftContent.appendChild(elementTreeContainer);
    else leftContent.appendChild(layerTreeContainer);
  }
  btnElements.onclick = () => showTab('elements');
  btnLayers.onclick = () => showTab('layers');
  showTab('elements');

  // Root layer for design items
  const rootLayer = new Tlayer(designArea, { layerName: 'root' });
  const layerTree = new TtreeView(layerTreeContainer, rootLayer);

  // Prop editor
  const propEditor = new TpropEditor();
  propEditor.body(right);
  propEditor.show();

  // Add item when double clicked in element tree
  function allowedParent(childTag, parentTag) {
    const info = HTML_TAGS[childTag];
    if (!info || !info.parentTag) return true;
    const parents = Array.isArray(info.parentTag) ? info.parentTag : [info.parentTag];
    return parents.map(p => (p || '').toLowerCase()).includes(parentTag.toLowerCase());
  }

  elementTree.container.addEventListener('dblclick', e => {
    const nodeEl = e.target.closest('.tree-node');
    if (!nodeEl || !nodeEl.treeNodeInstance) return;
    const tag = nodeEl.treeNodeInstance.data.key.toLowerCase();

    let parentLayer = rootLayer;
    const selected = selectionManager.selection.slice(-1)[0];
    if (selected && allowedParent(tag, selected.tagName.toLowerCase())) {
      parentLayer = selected;
    } else if (selected) {
      const parent = selected.parent;
      if (parent && allowedParent(tag, parent.tagName.toLowerCase())) {
        parentLayer = parent;
      } else if (!allowedParent(tag, 'body')) {
        // not allowed anywhere sensible
        return;
      }
    }

    const layer = new Tlayer(tag, { parent: parentLayer });
    layer.htmlObject.classList.add('design-item');
    layer.htmlObject.textContent = tag;
    layer.moveOptions.handle = null;
    DOM.makeMovable(layer.htmlObject, null, designArea);
    layer.htmlObject.style.left = '10px';
    layer.htmlObject.style.top = '10px';
    layer.htmlObject.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      layer.select();
      propEditor.setTarget(layer, layer.layerName);
    });
  });

  // Update prop editor on selection change
  selectionManager.addEventListener('change', ({ detail }) => {
    if (detail.action === 'select') {
      propEditor.setTarget(detail.item, detail.item.layerName || 'Element');
    }
  });

  designArea.addEventListener('pointerdown', () => selectionManager.clear());
});

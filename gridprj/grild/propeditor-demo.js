import '../files/src/main.js';
import { TpropEditor } from '../files/src/ui/prop-editor/TpropEditor.js';
import { Ttree } from '../files/src/ui/prop-editor/Ttree.js';

import { TtreeView } from '../files/src/ui/Ttreeview.js';
import { DOM } from '../files/src/dom/dom.js';
import { Tlayer } from '../files/src/dom/Tlayer.js';
import { selectionManager } from '../files/src/core/globals.js';


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
  elementTree.container.addEventListener('dblclick', e => {
    const nodeEl = e.target.closest('.tree-node');
    if (!nodeEl || !nodeEl.treeNodeInstance) return;
    const tag = nodeEl.treeNodeInstance.data.key.toLowerCase();
    const layer = new Tlayer(tag, { parent: rootLayer });
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

import '../files/js/src/main.js';
import { TpropEditor } from '../files/js/src/ui/prop-editor/TpropEditor.js';
import { Ttree } from '../files/js/src/ui/prop-editor/Ttree.js';
import { editorRegistry, TbaseEditor } from '../files/js/src/ui/prop-editor/editorRegistry.js';

import { TtreeView } from '../files/js/src/ui/Ttreeview.js';
import { DOM } from '../files/js/src/dom/dom.js';
import { Tlayer } from '../files/js/src/dom/Tlayer.js';
import { selectionManager, globs } from '../files/js/src/core/globals.js';
import { HTML_TAGS } from '../files/js/src/asset/HTML_TAGS.js';

class TsliderEditor extends TbaseEditor {
  render() {
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
  const TEXT_EDITABLE = new Set(['div', 'span', 'p', 'b', 'i', 'u', 'em', 'strong', 'label', 'button', 'a', 'li', 'td', 'th']);
  let activeTextEdit = null;

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

  const elementTreeContainer = document.createElement('div');
  const elementTree = new Ttree(elementTreeContainer);

  function buildGroupedTree() {
    const groups = {};
    for (const [tag, info] of Object.entries(HTML_TAGS)) {
      const categories = info.groupName || ['Other'];
      for (let cat of categories) {
        cat = cat || 'Other';
        if (!groups[cat]) groups[cat] = {};
        groups[cat][tag] = {};
      }
    }
    const sorted = {};
    for (const g of Object.keys(groups).sort()) {
      const tags = groups[g];
      const sortedTags = {};
      for (const t of Object.keys(tags).sort()) {
        sortedTags[t] = tags[t];
      }
      sorted[g] = sortedTags;
    }
    return sorted;
  }

  const treeData = buildGroupedTree();
  elementTree.build(treeData, 'HTML');

  elementTree.container.querySelectorAll('.tree-node').forEach(el => {
    const tag = el.treeNodeInstance.data.key.toLowerCase();
    const info = HTML_TAGS[tag];
    const lbl = el.querySelector('.label');
    if (info && info.icon) {
      lbl.innerHTML = info.icon + ' ' + tag;
    } else {
      lbl.textContent = el.treeNodeInstance.data.key;
    }
  });

  const layerTreeContainer = document.createElement('div');
  let currentTab = null;
  function showTab(tab) {
    leftContent.innerHTML = '';
    btnElements.classList.toggle('active', tab === 'elements');
    btnLayers.classList.toggle('active', tab === 'layers');
    currentTab = tab;
    if (tab === 'elements') leftContent.appendChild(elementTreeContainer);
    else leftContent.appendChild(layerTreeContainer);
  }
  btnElements.onclick = () => showTab('elements');
  btnLayers.onclick = () => showTab('layers');
  showTab('elements');

  const rootLayer = new Tlayer(designArea, { layerName: 'root' });
  const layerTree = new TtreeView(layerTreeContainer, rootLayer);

  updateTreeDisabled();

  const propEditor = new TpropEditor();
  propEditor.body(right);
  propEditor.show();

  function allowedParent(childTag, parentTag) {
    const info = HTML_TAGS[childTag];
    if (!info) return true;
    parentTag = (parentTag || '').toLowerCase();
    if (parentTag === 'div' || parentTag === 'span') return true;
    if (!info.parentTag) return true;
    const parents = Array.isArray(info.parentTag) ? info.parentTag : [info.parentTag];
    const normalized = parents.map(p => (p || '').toLowerCase());
    if (normalized.includes(parentTag)) return true;
    if (info.groupName && info.groupName.includes('TextFormat')) return true;
    return false;
  }

  function updateTreeDisabled() {
    const selected = selectionManager.selection.slice(-1)[0];
    const selTag = selected === rootLayer ? 'body' : selected?.htmlObject?.tagName?.toLowerCase();
    elementTree.container.querySelectorAll('.tree-node').forEach(el => {
      const tag = el.treeNodeInstance.data.key.toLowerCase();
      if (!HTML_TAGS[tag]) return;
      const allowed = allowedParent(tag, selTag || 'body');
      el.classList.toggle('disabled', !allowed);
    });
  }

  elementTree.container.addEventListener('dblclick', e => {
    const nodeEl = e.target.closest('.tree-node');
    if (!nodeEl || !nodeEl.treeNodeInstance) return;
    const tag = nodeEl.treeNodeInstance.data.key.toLowerCase();
    if (!HTML_TAGS[tag]) return;

    let parentLayer = rootLayer;
    const selected = selectionManager.selection.slice(-1)[0];
    const selTag = selected === rootLayer ? 'body' : selected?.htmlObject?.tagName?.toLowerCase();
    if (selected && allowedParent(tag, selTag)) {
      parentLayer = selected;
    } else if (selected) {
      const parent = selected.parent;
      if (parent && allowedParent(tag, parent.htmlObject.tagName.toLowerCase())) {
        parentLayer = parent;
      } else if (!allowedParent(tag, 'body')) {
        return;
      }
    } else if (!allowedParent(tag, 'body')) {
      return;
    }

    const layer = new Tlayer(tag, { parent: parentLayer });
    const info = HTML_TAGS[tag];
    const isLayout = info?.groupName?.includes('Layout');
    layer.htmlObject.classList.add('design-item');
    if (isLayout) {
      layer.htmlObject.classList.add('layout-item');
      layer.moveOptions.handle = null;
      DOM.makeMovable(layer.htmlObject, null, designArea);
      layer.htmlObject.style.left = '10px';
      layer.htmlObject.style.top = '10px';
    }
    layer.htmlObject.textContent = tag;
    if (TEXT_EDITABLE.has(tag)) {
      layer.htmlObject.classList.add('placeholder');
    }

    layer.htmlObject.addEventListener('pointerdown', ev => {
      if (activeTextEdit) return;
      ev.stopPropagation();
      layer.select();
      propEditor.setTarget(layer, layer.layerName);
    });

    layer.htmlObject.addEventListener('dblclick', ev => {
      ev.stopPropagation();
      if (activeTextEdit) return;
      if (!TEXT_EDITABLE.has(tag)) return;

      const rootEl = layer.htmlObject;
      let target = rootEl;
      if (rootEl.children.length > 0) {
        target = rootEl.querySelector('[data-textedit]');
        if (!target) {
          target = document.createElement('span');
          target.dataset.textedit = '1';
          const text = Array.from(rootEl.childNodes)
            .filter(n => n.nodeType === 3)
            .map(n => n.textContent)
            .join('');
          target.textContent = text || '';
          rootEl.prepend(target);
        }
      }

      activeTextEdit = { element: target, prevMode: globs.designMode };
      DOM.setDesignMode(false);
      target.contentEditable = true;
      if (rootEl.classList.contains('placeholder')) {
        target.textContent = '';
        rootEl.classList.remove('placeholder');
      }
      target.focus();
      const finish = () => {
        target.removeEventListener('blur', finish);
        target.contentEditable = false;
        DOM.setDesignMode(activeTextEdit.prevMode);
        activeTextEdit = null;
        if (!target.textContent.trim()) {
          target.textContent = tag;
          rootEl.classList.add('placeholder');
        }
      };
      target.addEventListener('blur', finish);
    });

    updateTreeDisabled();
  });

  selectionManager.addEventListener('change', ({ detail }) => {
    if (detail.action === 'select') {
      propEditor.setTarget(detail.item, detail.item.layerName || 'Element');
    }
    updateTreeDisabled();
  });

  designArea.addEventListener('pointerdown', () => selectionManager.clear());
});

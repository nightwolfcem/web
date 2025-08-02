﻿import { DOM } from '../dom/dom.js';
import { selectionManager } from '../core/globals.js';

let treeviewStyles = false;

export class TtreeView {
    /**
     * @param {string|HTMLElement} containerSelector - Ağacın konulacağı DOM elemanı (veya CSS selector).
     * @param {Tlayer} rootLayer - Kök Layer nesnesi.
     */
    constructor(containerSelector, rootLayer) {
        this.container = typeof containerSelector === 'string'
            ? document.querySelector(containerSelector)
            : containerSelector;
        if (!this.container) throw new Error('TreeView container not found');

        this.treeElement = document.createElement('ul');
        this.container.setAttribute('data-treeview', 'true');
        this.container.appendChild(this.treeElement);

        this.rootLayer = rootLayer;
        this.rootLayer.addChangeListener(() => this.refreshTree());

        this.#injectStyles();
        this.#setupEvents();
        this.#setupDragAndDrop();

        this.refreshTree();

        selectionManager.addEventListener('change', (e) => {
            const { action, item } = e.detail;
            const node = this.treeElement.querySelector(`[data-id="${item.id}"]`);
            if (node) {
                node.classList.toggle("selected", action === 'select');
            }
        });
    }

    #injectStyles() {
        if (treeviewStyles) return;
        const css = `
      [data-treeview] ul { list-style:none; padding-left:20px; margin:0; }
      [data-treeview] li { padding:4px; cursor:pointer; position:relative; transition: background-color 0.2s; border: 1px solid transparent; }
      [data-treeview] li.selected { background:#d0eaff; border:1px solid #80bfff; }
      [data-treeview] li.locked { opacity: 0.6; color: #b71c1c; }
      [data-treeview] li.dragging { opacity: 0.5; }
      [data-treeview] .toggle { width:1.2em; display:inline-block; text-align:center; user-select:none; }
      [data-treeview] .expanded > .toggle::before { content:'▼'; }
      [data-treeview] .collapsed > .toggle::before { content:'►'; }
      [data-treeview] .leaf > .toggle { visibility: hidden; }
      [data-treeview] ul ul { display:none; }
      [data-treeview] .expanded > ul { display:block; }
      [data-treeview] .drag-over-above { border-top: 2px dashed #4CAF50; }
      [data-treeview] .drag-over-below { border-bottom: 2px dashed #4CAF50; }
      [data-treeview] .drag-over-inside { background-color: rgba(76, 175, 80, 0.1); }
      .drag-image { position: absolute; pointer-events:none; z-index:9999; background: white; padding:4px 8px; border-radius:4px; box-shadow:0 2px 10px rgba(0,0,0,0.2); transform:translate(-50%, -50%); }
      .drag-count { background:#2196F3; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:12px; position:absolute; top:-10px; right:-10px; }
        `;
        DOM.addStyle(css);
        treeviewStyles = true;
    }

    #createTreeNode(layer) {
        const li = document.createElement('li');
        li.dataset.id = layer.id;
        li.draggable = layer !== this.rootLayer && !layer.htmlObject?.dataset?.baseLayer;

        const toggle = document.createElement('span');
        toggle.className = 'toggle';

        const hasChildren = layer.children.length > 0;
        li.classList.add(hasChildren ? 'expanded' : 'leaf');

        const lbl = document.createElement('span');
        lbl.className = 'label';
        lbl.textContent = layer.layerName || layer.name || `Layer ${layer.id}`;

        li.append(toggle, lbl);

        if (layer.isSelected) li.classList.add('selected');
        if (layer.status?.lockable) li.classList.add('locked');

        return li;
    }

    refreshTree() {
        this.treeElement.innerHTML = '';
        const rootLi = this.#createTreeNode(this.rootLayer);
        const subUl = document.createElement('ul');
        rootLi.appendChild(subUl);
        this.treeElement.appendChild(rootLi);
        this.#buildTree(this.rootLayer, subUl);
    }

    #buildTree(parentLayer, parentUl) {
        for (const layer of parentLayer.children) {
            const li = this.#createTreeNode(layer);
            const sub = document.createElement('ul');
            li.appendChild(sub);
            parentUl.appendChild(li);
            this.#buildTree(layer, sub);
        }
    }

    #setupEvents() {
        this.treeElement.addEventListener('click', e => {
            const li = e.target.closest('li');
            if (!li) return;
            const layer = this.rootLayer.findById(li.dataset.id);
            if (!layer) return;

            if (e.target.closest('.toggle')) {
                e.stopPropagation();
                if (li.classList.contains('leaf')) return;
                li.classList.toggle('expanded');
                li.classList.toggle('collapsed');
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                selectionManager.toggle(layer);
            } else {
                selectionManager.clear({ except: layer });
                if (!layer.isSelected) {
                    selectionManager.select(layer);
                }
            }
        });
    }

    #setupDragAndDrop() {
        let draggedItems = [];
        let dragStartX = 0;
        let dragStartY = 0;
        let dragImage = null;

        const clearDragState = () => {
            this.treeElement.querySelectorAll('.drag-source, .drag-over-above, .drag-over-below, .drag-over-inside')
                .forEach(el => el.classList.remove('drag-source', 'drag-over-above', 'drag-over-below', 'drag-over-inside'));
            draggedItems = [];
            if (dragImage && document.body.contains(dragImage)) document.body.removeChild(dragImage);
            dragImage = null;
        };

        const createDragImage = (count) => {
            const img = document.createElement('div');
            img.className = 'drag-image';
            img.innerHTML = `<div class="drag-count">${count}</div><div class="drag-preview"></div>`;
            document.body.appendChild(img);
            return img;
        };

        this.treeElement.addEventListener('dragstart', (e) => {
            const li = e.target.closest('li');
            if (!li || li.dataset.id === this.rootLayer.id) { e.preventDefault(); return; }

            dragStartX = e.clientX;
            dragStartY = e.clientY;

            const selected = this.treeElement.querySelectorAll('li.selected');
            draggedItems = Array.from(selected).length ? Array.from(selected) : [li];

            e.dataTransfer.setData('application/json', JSON.stringify({ ids: draggedItems.map(i => i.dataset.id) }));
            e.dataTransfer.effectAllowed = 'copyMove';

            dragImage = createDragImage(draggedItems.length);
            e.dataTransfer.setDragImage(dragImage, 10, 10);

            draggedItems.forEach(item => item.classList.add('drag-source'));
        }, true);

        this.treeElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetLi = e.target.closest('li');
            if (!targetLi || draggedItems.some(it => it.dataset.id === targetLi.dataset.id)) return;

            this.treeElement.querySelectorAll('.drag-over-above, .drag-over-below, .drag-over-inside')
                .forEach(el => el.classList.remove('drag-over-above', 'drag-over-below', 'drag-over-inside'));

            const rect = targetLi.getBoundingClientRect();
            const isTop = e.clientY < rect.top + rect.height * 0.3;
            const isBottom = e.clientY > rect.top + rect.height * 0.7;

            if (isTop) targetLi.classList.add('drag-over-above');
            else if (isBottom) targetLi.classList.add('drag-over-below');
            else targetLi.classList.add('drag-over-inside');
        });

        this.treeElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetLi = e.target.closest('li');
            if (!targetLi || !draggedItems.length) return;

            const targetLayer = this.rootLayer.findById(targetLi.dataset.id);
            const raw = e.dataTransfer.getData('application/json') || '{}';
            const data = JSON.parse(raw);

            const rect = targetLi.getBoundingClientRect();
            const pos = e.clientY < rect.top + rect.height * 0.3 ? 'before'
                : e.clientY > rect.top + rect.height * 0.7 ? 'after' : 'inside';

            (data.ids || []).forEach(id => {
                const draggedLayer = this.rootLayer.findById(id);
                if (!draggedLayer || draggedLayer === targetLayer) return;

                if (pos === 'inside') {
                    targetLayer.appendChild(draggedLayer);
                } else {
                    // moveTo(targetLayer, placeAfter:boolean)
                    draggedLayer.moveTo(targetLayer, pos === 'after');
                }
            });

            this.refreshTree();
            clearDragState();
        });

        this.treeElement.addEventListener('dragend', clearDragState);

        this.treeElement.addEventListener('dragleave', (e) => {
            if (!e.relatedTarget || !this.treeElement.contains(e.relatedTarget)) clearDragState();
        });

        this.treeElement.addEventListener('mousedown', (e) => {
            if (e.target.closest('li')) { dragStartX = e.clientX; dragStartY = e.clientY; }
        });

        this.treeElement.addEventListener('mouseup', (e) => {
            const li = e.target.closest('li');
            if (li && Math.abs(e.clientX - dragStartX) < 5 && Math.abs(e.clientY - dragStartY) < 5) clearDragState();
        });
    }
}

window.Ttreeview = TtreeView;

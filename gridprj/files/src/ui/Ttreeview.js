import { DOM } from '../dom/dom.js';
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

   

    #createTreeNode(layer) {
        const li = document.createElement('li');
        li.dataset.id = layer.id;
        li.draggable = layer !== this.rootLayer && !layer.htmlObject.dataset.baseLayer;

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

        this.treeElement.addEventListener('dragstart', (e) => {
            const li = e.target.closest('li');
            if (!li || !li.draggable) { e.preventDefault(); return; }
            
            draggedItems = selectionManager.has(li.owner) ? selectionManager.selection : [li.owner];
            e.dataTransfer.setData('application/json', JSON.stringify(draggedItems.map(item => item.id)));
            e.dataTransfer.effectAllowed = 'move';
        });

        this.treeElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetLi = e.target.closest('li');
            if (!targetLi) return;
            
            // Mevcut stilleri temizle
            this.treeElement.querySelectorAll('.drag-over-above, .drag-over-below, .drag-over-inside')
                .forEach(el => el.classList.remove('drag-over-above', 'drag-over-below', 'drag-over-inside'));

            const rect = targetLi.getBoundingClientRect();
            const y = e.clientY - rect.top;
            if (y < rect.height * 0.25) {
                targetLi.classList.add('drag-over-above');
            } else if (y > rect.height * 0.75) {
                targetLi.classList.add('drag-over-below');
            } else {
                targetLi.classList.add('drag-over-inside');
            }
        });

        this.treeElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetLi = e.target.closest('li[data-id]');
            if (!targetLi) return;

            const targetLayer = this.rootLayer.findById(targetLi.dataset.id);
            const draggedIds = JSON.parse(e.dataTransfer.getData('application/json'));
            const draggedLayers = draggedIds.map(id => this.rootLayer.findById(id)).filter(Boolean);

            const rect = targetLi.getBoundingClientRect();
            const y = e.clientY - rect.top;
            
            if (y < rect.height * 0.25) { // Üstüne bırak
                draggedLayers.forEach(layer => targetLayer.parent.htmlObject.insertBefore(layer.htmlObject, targetLayer.htmlObject));
            } else if (y > rect.height * 0.75) { // Altına bırak
                draggedLayers.forEach(layer => targetLayer.parent.htmlObject.insertBefore(layer.htmlObject, targetLayer.htmlObject.nextSibling));
            } else { // İçine bırak
                draggedLayers.forEach(layer => targetLayer.appendChild(layer));
            }
            
            this.refreshTree(); // Ağacı yeniden çiz
        });
    }
}
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
        `;
        DOM.addStyle(css);
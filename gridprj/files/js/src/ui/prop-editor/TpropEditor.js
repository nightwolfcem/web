import { Twindow } from '../Twindow.js';
import { Ttree } from './Ttree.js';
import { editorRegistry } from './editorRegistry.js';

/**
 * PropEditor: Bir JavaScript nesnesinin özelliklerini hiyerarşik olarak
 * görüntüleyen ve düzenleyen bir pencere bileşeni.
 */
export class TpropEditor extends Twindow {
    static #instance;

    constructor(options = {}) {
        super({
            title: "Özellik Düzenleyici",
            width: 400,
            height: 500,
            ...options
        });

        this.currentTarget = null;
        this.contentPanel.style.display = 'flex';
        this.contentPanel.style.flexDirection = 'column';
        this.nameColWidth = 150;
    }

    static getInstance(opts) {
        if (!this.#instance) {
            this.#instance = new PropEditor(opts);
        }
        return this.#instance;
    }

    body(parent) {
        super.body(parent);
        this.htmlObject.classList.add('prop-editor');

        this.pathBar = document.createElement('div');
        this.pathBar.className = 'prop-editor-path';
        this.pathBar.style.cssText = 'padding:4px 8px;border-bottom:1px solid #ccc;white-space:nowrap;overflow:hidden;';

        let scrollDir = 0;
        let scrollTimer = null;
        const stopScroll = () => {
            if (scrollTimer) {
                clearInterval(scrollTimer);
                scrollTimer = null;
            }
        };
        this.pathBar.addEventListener('mousemove', (e) => {
            const rect = this.pathBar.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const threshold = 20;
            if (x > rect.width - threshold && this.pathBar.scrollLeft < this.pathBar.scrollWidth - rect.width) {
                scrollDir = 1;
            } else if (x < threshold && this.pathBar.scrollLeft > 0) {
                scrollDir = -1;
            } else {
                scrollDir = 0;
            }
            if (scrollDir && !scrollTimer) {
                scrollTimer = setInterval(() => {
                    this.pathBar.scrollLeft += scrollDir * 10;
                }, 30);
            } else if (!scrollDir) {
                stopScroll();
            }
        });
        this.pathBar.addEventListener('mouseleave', stopScroll);

        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Ara...';
        this.searchInput.className = 'prop-editor-search';
        this.searchInput.style.cssText = 'margin:4px;';

        this.treeContainer = document.createElement('div');
        this.treeContainer.style.cssText = 'flex: 1; overflow: auto; border-bottom: 1px solid #ccc;';

        this.editorContainer = document.createElement('div');
        this.editorContainer.style.cssText = 'padding: 10px; min-height: 100px;';

        this.contentPanel.append(this.pathBar, this.searchInput, this.treeContainer, this.editorContainer);

        this.tree = new Ttree(this.treeContainer);
        this.tree.on('select', (node) => this.renderEditorForNode(node));

        this.searchInput.addEventListener('input', () => this.filterTree(this.searchInput.value));

        // Varsayılan olarak window nesnesini kök olarak ayarla
        this.setTarget(window, 'window');
    }

    setTarget(targetObject, name = 'window') {
        this.currentTarget = targetObject;
        this.tree.build(targetObject, name);
        // Kök nesneyi otomatik olarak seç ve özelliklerini göster
        this.tree.selectNode(this.tree.rootNode);
    }

    /**
     * Ağaçtan seçilen bir düğüm için uygun editörü render eder.
     * @param {TreeNode} node - Seçilen ağaç düğümü.
     */
    renderEditorForNode(node) {
        this.editorContainer.innerHTML = '';
        const { parent, key, value } = node.data;


        if (value && typeof value === 'object') {
            this.renderObjectProperties(value);
        } else {
            const EditorComponent = editorRegistry.getEditorFor(value, key, parent);
            if (EditorComponent) {
                const editorInstance = new EditorComponent(parent, key);
                this.editorContainer.appendChild(editorInstance.render());
            } else {
                const info = document.createElement('div');
                info.textContent = `Değer: ${String(value)} (Düzenlenemez)`;
                this.editorContainer.appendChild(info);
            }

        }
        this.updatePath(node);
    }

    filterTree(text) {
        const term = text.toLowerCase();
        this.treeContainer.querySelectorAll('.tree-node').forEach(el => {
            const label = el.querySelector('.label').textContent.toLowerCase();
            el.style.display = term && !label.includes(term) ? 'none' : '';
        });
    }

    updatePath(node) {
        const nodes = [];
        let n = node;
        while (n) {
            nodes.unshift(n);
            n = n.parentNode;
        }
        this.pathBar.innerHTML = '';
        nodes.forEach((p, idx) => {
            const sp = document.createElement('span');
            sp.textContent = p.data.key;
            sp.style.cursor = 'pointer';

            sp.onclick = (e) => {
                e.stopPropagation();
                this.tree.selectNode(p);
                this.showNodeChildrenMenu(p, sp);
            };

            this.pathBar.appendChild(sp);
            if (idx < nodes.length - 1) {
                const sep = document.createElement('span');
                sep.textContent = ' \u203A ';
                this.pathBar.appendChild(sep);
            }
        });
    }

    showNodeChildrenMenu(node, anchor) {
        if (!node.isExpanded) {
            this.tree.toggleNode(node);
        }
        if (this.currentMenu) {
            this.currentMenu.remove();
        }
        const menu = document.createElement('div');
        menu.className = 'path-menu';
        menu.style.cssText = 'position:absolute;background:#fff;border:1px solid #ccc;z-index:1000;max-height:200px;overflow:auto;';
        node.children.forEach(child => {
            const item = document.createElement('div');
            item.textContent = child.data.key;
            item.style.padding = '2px 6px';
            item.style.cursor = 'pointer';
            item.onclick = (e) => {
                e.stopPropagation();
                this.tree.selectNode(child);
                menu.remove();
                this.currentMenu = null;
            };
            menu.appendChild(item);
        });
        const rect = anchor.getBoundingClientRect();
        menu.style.left = rect.left + window.scrollX + 'px';
        menu.style.top = rect.bottom + window.scrollY + 'px';
        document.body.appendChild(menu);

        const menuRect = menu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            menu.style.left = window.innerWidth - menuRect.width + window.scrollX + 'px';
        }
        if (menuRect.bottom > window.innerHeight) {
            menu.style.top = rect.top + window.scrollY - menuRect.height + 'px';
        }
        this.currentMenu = menu;
        const close = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                this.currentMenu = null;
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
    }

    renderObjectProperties(obj) {
        const list = document.createElement('div');
        list.className = 'prop-list';
        list.style.position = 'relative';

        const handle = document.createElement('div');
        handle.className = 'prop-splitter';
        handle.style.cssText = `position:absolute;top:0;bottom:0;width:4px;cursor:col-resize;background:#ddd;left:${this.nameColWidth}px;`;

        const rowsContainer = document.createElement('div');
        rowsContainer.style.display = 'flex';
        rowsContainer.style.flexDirection = 'column';

        for (const key in obj) {
            const row = document.createElement('div');
            row.className = 'prop-row';
            row.style.display = 'flex';
            row.style.alignItems = 'center';

            const nameCell = document.createElement('div');
            nameCell.className = 'prop-name';
            nameCell.style.width = this.nameColWidth + 'px';
            nameCell.textContent = key;

            const valueCell = document.createElement('div');
            valueCell.className = 'prop-value';
            valueCell.style.flex = '1';

            const val = obj[key];

            // Özellik tipine göre renklendirme
            if (typeof val === 'object' && val !== null) {
                nameCell.style.color = '#0000CC';
                nameCell.style.fontWeight = 'bold';
            } else if (typeof val === 'function') {
                nameCell.style.color = '#25b15b';
            } else if (typeof val === 'string') {
                nameCell.style.color = '#a31515';
            } else if (typeof val === 'number') {
                nameCell.style.color = '#098658';
            } else if (typeof val === 'boolean') {
                nameCell.style.color = '#0000FF';
            }

            const EditorComponent = editorRegistry.getEditorFor(val, key, obj);
            if (EditorComponent) {
                const editorInstance = new EditorComponent(obj, key);
                valueCell.appendChild(editorInstance.render());
            } else {
                let span;
                if (typeof val === 'string') {
                    const inp = document.createElement('input');
                    inp.type = 'text';
                    inp.value = val;
                    inp.onchange = (e) => obj[key] = e.target.value;
                    valueCell.appendChild(inp);
                } else if (typeof val === 'number') {
                    const inp = document.createElement('input');
                    inp.type = 'number';
                    inp.value = val;
                    inp.onchange = (e) => obj[key] = Number(e.target.value);
                    valueCell.appendChild(inp);
                } else if (typeof val === 'boolean') {
                    const inp = document.createElement('input');
                    inp.type = 'checkbox';
                    inp.checked = val;
                    inp.onchange = (e) => obj[key] = e.target.checked;
                    valueCell.appendChild(inp);
                } else if (typeof val === 'object' && val !== null) {
                    const icon = document.createElement('span');
                    icon.textContent = '>';
                    icon.style.marginRight = '4px';
                    nameCell.prepend(icon);
                    span = document.createElement('span');
                    span.textContent = '{...}';
                } else if (typeof val === 'function') {
                    span = document.createElement('span');
                    span.textContent = 'function';
                } else {
                    span = document.createElement('span');
                    span.textContent = String(val);
                }
                if (span) {
                    span.style.color = '#888';
                    valueCell.appendChild(span);
                }
            }

            row.append(nameCell, valueCell);
            rowsContainer.appendChild(row);
        }

        list.appendChild(rowsContainer);
        list.appendChild(handle);

        const startDrag = (e) => {
            e.preventDefault();
            const onMove = (ev) => {
                const rect = list.getBoundingClientRect();
                this.nameColWidth = Math.max(50, ev.clientX - rect.left);
                list.querySelectorAll('.prop-name').forEach(n => n.style.width = this.nameColWidth + 'px');
                handle.style.left = this.nameColWidth + 'px';
            };
            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };
        handle.addEventListener('mousedown', startDrag);

        this.editorContainer.appendChild(list);
    }

}
window.TpropEditor = TpropEditor;

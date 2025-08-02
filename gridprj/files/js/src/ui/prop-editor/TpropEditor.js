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
        this.pathBar.style.cssText = 'padding:4px 8px;border-bottom:1px solid #ccc;white-space:nowrap;overflow:auto;';

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
    }

    setTarget(targetObject, name = 'Root') {
        this.currentTarget = targetObject;
        this.tree.build(targetObject, name);
        this.editorContainer.innerHTML = 'Bir özellik seçin...';
        this.updatePath(this.tree.rootNode);
    }

    /**
     * Ağaçtan seçilen bir düğüm için uygun editörü render eder.
     * @param {TreeNode} node - Seçilen ağaç düğümü.
     */
    renderEditorForNode(node) {
        this.editorContainer.innerHTML = '';
        const { parent, key, value } = node.data;

        // DEĞİŞİKLİK: Kayıt sistemine artık sadece değeri değil,
        // ebeveyn nesneyi ve özellik adını da gönderiyoruz.
        const EditorComponent = editorRegistry.getEditorFor(value, key, parent);
        
        if (EditorComponent) {
            const editorInstance = new EditorComponent(parent, key);
            this.editorContainer.appendChild(editorInstance.render());
        } else {
            const info = document.createElement('div');
            info.textContent = `Değer: ${String(value)} (Düzenlenemez)`;
            this.editorContainer.appendChild(info);
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
            sp.onclick = () => this.tree.selectNode(p);
            this.pathBar.appendChild(sp);
            if (idx < nodes.length - 1) {
                const sep = document.createElement('span');
                sep.textContent = ' \u203A ';
                this.pathBar.appendChild(sep);
            }
        });
    }
}
window.TpropEditor = TpropEditor;

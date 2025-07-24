import { Twindow } from '../Twindow.js';
import { Tree } from './Tree.js';
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

        this.treeContainer = document.createElement('div');
        this.treeContainer.style.cssText = 'flex: 1; overflow: auto; border-bottom: 1px solid #ccc;';

        this.editorContainer = document.createElement('div');
        this.editorContainer.style.cssText = 'padding: 10px; min-height: 100px;';

        this.contentPanel.append(this.treeContainer, this.editorContainer);

        this.tree = new Tree(this.treeContainer);
        this.tree.on('select', (node) => this.renderEditorForNode(node));
    }

    setTarget(targetObject, name = 'Root') {
        this.currentTarget = targetObject;
        this.tree.build(targetObject, name);
        this.editorContainer.innerHTML = 'Bir özellik seçin...';
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
    }
}

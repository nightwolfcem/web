/**
 * TtreeNode: Ağaç yapısındaki her bir düğümü temsil eder.
 */
class TtreeNode {
    constructor(data, level = 0) {
        this.data = data; // { key, value, parent }
        this.level = level;
        this.children = [];
        this.isExpanded = false;

        this.htmlObject = document.createElement('div');
        this.htmlObject.className = 'tree-node';
        this.htmlObject.style.paddingLeft = `${level * 15}px`;

        this.toggle = document.createElement('span');
        this.toggle.className = 'toggle';
        
        this.label = document.createElement('span');
        this.label.className = 'label';
        this.label.textContent = data.key;

        this.htmlObject.append(this.toggle, this.label);
    }
}

/**
 * Tree: Bir nesneyi hiyerarşik olarak görüntüleyen ve seçim olaylarını yöneten bileşen.
 */
export class Ttree extends EventTarget {
    constructor(container) {
        super();
        this.container = container;
        this.container.className = 'tree-view';
        this.selectedNode = null;

        this.container.addEventListener('click', (e) => {
            const nodeElement = e.target.closest('.tree-node');
            if (!nodeElement || !nodeElement.treeNodeInstance) return;

            const node = nodeElement.treeNodeInstance;

            if (e.target.classList.contains('toggle')) {
                this.toggleNode(node);
            } else {
                this.selectNode(node);
            }
        });
    }

    build(obj, name = 'Root') {
        this.container.innerHTML = '';
        const rootData = { key: name, value: obj, parent: null };
        const rootNode = this._createNode(rootData, 0);
        this.container.appendChild(rootNode.htmlObject);
        this.toggleNode(rootNode); // Başlangıçta kök düğümü aç
    }

    _createNode(data, level) {
        const node = new TtreeNode(data, level);
        node.htmlObject.treeNodeInstance = node; // DOM elementinden sınıfa geri referans

        const isExpandable = typeof data.value === 'object' && data.value !== null && Object.keys(data.value).length > 0;
        node.toggle.innerHTML = isExpandable ? '►' : '';
        
        return node;
    }

    toggleNode(node) {
        if (node.isExpanded) {
            // Düğümü kapat
            node.children.forEach(child => child.htmlObject.remove());
            node.children = [];
            node.toggle.innerHTML = '►';
            node.isExpanded = false;
        } else {
            // Düğümü aç
            const value = node.data.value;
            if (typeof value === 'object' && value !== null) {
                for (const key in value) {
                    if (Object.prototype.hasOwnProperty.call(value, key)) {
                        const childData = { key, value: value[key], parent: value };
                        const childNode = this._createNode(childData, node.level + 1);
                        node.children.push(childNode);
                        node.htmlObject.after(childNode.htmlObject);
                    }
                }
            }
            node.toggle.innerHTML = '▼';
            node.isExpanded = true;
        }
    }

    selectNode(node) {
        if (this.selectedNode) {
            this.selectedNode.label.classList.remove('selected');
        }
        this.selectedNode = node;
        this.selectedNode.label.classList.add('selected');
        
        // 'select' olayını tetikle ve seçilen düğümün verisini gönder
        this.dispatchEvent(new CustomEvent('select', { detail: node }));
    }

    // EventTarget uyumluluğu için
    on(eventName, callback) {
        this.addEventListener(eventName, (e) => callback(e.detail));
    }
}

import { Telement } from './Telement.js';
import { Olayers } from '../core/enums.js';
import { selectionManager } from '../core/globals.js';

let needupdate = true;

function ensureSelectionOverlay(root) {
    let selection = root.subLayers.selection?.htmlObject.querySelector('#descendant-bbox-selection');
    if (!selection) {
        selection = document.createElement('div');
        selection.id = 'descendant-bbox-selection';
        Object.assign(selection.style, {
            position: 'absolute',
            pointerEvents: 'none',
            border: '2px dashed #2196f3',
            zIndex: 9999,
            display: 'none'
        });
        root.subLayers.selection?.htmlObject.appendChild(selection);
    }
    return selection;
}

function drawSelectionOverlay(rootLayer) {
    const selectedLayers = rootLayer.selection();
    const selection = ensureSelectionOverlay(rootLayer);
    if (selectedLayers.length < 2) {
        selection.style.display = "none";
        return;
    }
    selection.style.display = "";
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedLayers.forEach(layer => {
        const rect = layer.htmlObject.getBoundingClientRect();
        if (rect.left < minX) minX = rect.left;
        if (rect.top < minY) minY = rect.top;
        if (rect.right > maxX) maxX = rect.right;
        if (rect.bottom > maxY) maxY = rect.bottom;
    });

    Object.assign(selection.style, {
        left: (minX - rootLayer.htmlObject.getBoundingClientRect().left) + "px",
        top: (minY - rootLayer.htmlObject.getBoundingClientRect().top) + "px",
        width: (maxX - minX) + "px",
        height: (maxY - minY) + "px",
    });
}

export class Tlayer extends Telement {
    #changeListeners = [];

    constructor(tagOrEl = 'div', options = {}) {
        super(tagOrEl, options);
        if (this._isLayer) return;
        Object.defineProperty(this, '_isLayer', { value: true, writable: false, enumerable: false });

        this.htmlObject.dataset.layer = this.id;
        this.subLayers = {};
        this.#changeListeners = [];
        if (options.parentLayerName) {
            this.layerName = options.layerName || this.name;
            this.htmlObject.classList.add(options.layerName);
        }

        if (options.parent) {
            if (options.parent instanceof Tlayer) {
                options.parent.appendChild(this);
            } else if (options.parent instanceof HTMLElement) {
                options.parent.appendChild(this.htmlObject);
            }
        }
        
        if (options.children && Array.isArray(options.children)) {
            for (let c of options.children) this.appendChild(c);
        }
        
        if (options.createSubLayers || options.subLayerNames) {
            this.createSubLayers(options.subLayerNames || Olayers);
        }
        this.htmlObject.style.pointerEvents = "auto";
    }

    addChangeListener(listener) { this.#changeListeners.push(listener); }

    _notifyChange(type, info) {
        if (!needupdate) return;
        this.#changeListeners.forEach(fn => fn(type, info, this));
        if (this.parent && typeof this.parent._notifyChange === "function") {
            this.parent._notifyChange(type, info);
        }
    }

    get isStatic() {
        const pos = getComputedStyle(this.htmlObject).position;
        return pos === 'static' || !pos;
    }

    get zIndex() { return this.isStatic ? 0 : (+this.htmlObject.style.zIndex || 1); }
    set zIndex(v) {
        if (!this.isStatic) this.htmlObject.style.zIndex = v;
        this.parent?.reflowZ();
    }

    #dynamicChildren() { return this.children.filter(l => l instanceof Tlayer && !l.isStatic); }
    
    getRoot() {
        let node = this;
        while (node.parent) node = node.parent;
        return node;
    }

    reflowZ() {
        const dyn = this.#dynamicChildren();
        dyn.sort((a, b) => a.zIndex - b.zIndex).forEach((child, i) => {
             child.htmlObject.style.zIndex = i + 1;
        });
        this._notifyChange('reflowZ');
    }

    createSubLayers(names = Olayers) {
        const nameList = typeof names === 'string' ? names.split(/[,|;]/).map(s => s.trim()) : Object.keys(names);
        nameList.forEach(name => {
            if(this.subLayers[name]) return;
            const lyr = new Tlayer('div', { layerName: name });
            lyr.htmlObject.classList.add(name);
            lyr.htmlObject.dataset.baseLayer = true;
            this.subLayers[name] = lyr;
            this.appendChild(lyr);
            Object.assign(lyr.htmlObject.style, {
                position: "absolute",
                pointerEvents: "none",
                inset: "0"
            });
        });
    }

    appendChild(child) {
        super.appendChild(child);
        if (this.htmlObject.dataset.baseLayer) (child.htmlObject ?? child).style.pointerEvents = "auto";
        needupdate = false;
        if (child instanceof Tlayer && !child.isStatic) this.reflowZ();
        needupdate = true;
        this._notifyChange('appendChild', { child: child });
    }

    removeChild(child) {
        super.removeChild(child);
        needupdate = false;
        if (child instanceof Tlayer && !child.isStatic) this.reflowZ();
        needupdate = true;
        this._notifyChange('removeChild', { child: child });
    }

    addChild(baseLayerName, layer) {
        if (this.subLayers[baseLayerName]) {
            this.subLayers[baseLayerName].appendChild(layer);
        }
    }
    
    selection() {
        return selectionManager.selection.filter(item => {
            let p = item;
            while (p) {
                if (p === this) return true;
                p = p.parent;
            }
            return false;
        });
    }

    select(addToSelection = false) {
        super.select({ multi: addToSelection });
        this.getRoot().drawSelectionOverlay?.(this.getRoot());
    }

    deselect() {
        super.deselect();
        this.getRoot().drawSelectionOverlay?.(this.getRoot());
    }

    bringToFront() {
        if (!this.parent) return;
        if (this.isStatic) {
            this.parent.appendChild(this);
        } else {
            const maxZ = this.parent.#dynamicChildren().reduce((m, l) => Math.max(m, l.zIndex), 0);
            this.zIndex = maxZ + 1;
            this.parent.reflowZ();
        }
        this._notifyChange('bringToFront');
    }

    sendToBack() {
        if (!this.parent) return false;
        if (this.isStatic) {
            this.parent.htmlObject.insertBefore(this.htmlObject, this.parent.htmlObject.firstChild);
        } else {
            this.zIndex = 0;
            this.parent.reflowZ();
        }
        this._notifyChange("sendToBack");
        return true;
    }

    findById(id) {
        if (this.id == id) return this;
        for (const child of this.children) {
            if (child instanceof Tlayer) {
                const found = child.findById(id);
                if (found) return found;
            }
        }
        return null;
    }

    destroy() {
        super.destroy();
        for (const [name, layer] of Object.entries(this.subLayers)) {
            layer.destroy?.();
            delete this.subLayers[name];
        }
        this.subLayers = {};
        this.#changeListeners = [];
    }
}

// Attach the drawing function to the prototype
Tlayer.prototype.drawSelectionOverlay = drawSelectionOverlay;
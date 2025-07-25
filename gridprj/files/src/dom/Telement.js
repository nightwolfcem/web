import { Tclass } from '../core/Tclass.js';
import { extendsClass } from '../core/classUtils.js';
import { selectionManager } from '../core/globals.js';
import { deepCopy } from '../utils/objectUtils.js';
import { EelementStatus, Eborder, Tenum } from '../core/enums.js';
import { getEventMap } from './eventHandling.js';
import { TelementRect } from './geometry.js';
import { DOM } from './dom.js';

let Telementstyles = false;
const INTERACTION_STATE = new WeakMap();
export const _ctorArgs = Symbol('ctorArgs');

export class Telement extends extendsClass(Tclass, EventTarget) {
    #moveHandlers = null;
    #dragHandlers = null;
    #dropHandlers = null;
    #dragHandle = null;
    #moveHandle = null;
    #hybridDrag = null;
    #initOpts = null;
    #initialKeys = null;
    #lastDropTarget = null;
    #dragState = {};
    loaded = false;

    constructor(tagOrEl, opts = {}, ...extra) {
        const safeCloneOptions = (src) => {
            if (src === null || typeof src !== "object") return src;
            if (Array.isArray(src)) return src.map(safeCloneOptions);
            if (src instanceof HTMLElement) return src.id ? `#${src.id}` : null;
            if (typeof src === "function") return undefined;
            const clone = {};
            for (const key in src) {
                if (Object.prototype.hasOwnProperty.call(src, key)) {
                    const val = safeCloneOptions(src[key]);
                    if (val !== undefined) clone[key] = val;
                }
            }
            return clone;
        };

        super(tagOrEl, opts, extra);
        if (tagOrEl instanceof Telement) return tagOrEl;
        if (tagOrEl.owner instanceof Telement) return tagOrEl.owner;

        const html = (tagOrEl instanceof HTMLElement) ? tagOrEl : document.createElement(typeof tagOrEl === 'string' ? tagOrEl : 'div');
        this.htmlObject = html;
        html.owner = this;

        let {
            id, className, style = {}, attrs = {}, events = {},
            parent, children = [],
            status = EelementStatus.visible,
            resizeOptions = {},
            selectOptions = {},
            dragOptions = {}, moveOptions = {}, dropOptions = {}, historyOptions = {},
            ...other
        } = opts;

        this.selectOptions = Object.assign({
            multiKey: e => e.ctrlKey || e.metaKey,
            silent: false,
            scroll: false,
            selectClass: 'selected',
            deselectClass: null,
            onSelect: null,
            onDeselect: null
        }, opts.selectOptions);

        html.id = html.id || id || this.id;
        const clsDef = this.constructor.name;
        let clsUsr = Array.isArray(className) ? className : String(className || '').trim().split(/\s+/);
        html.classList.add(clsDef, ...clsUsr.filter(Boolean));
        Object.assign(html.style, style);
        Object.entries(attrs).forEach(([k, v]) => html.setAttribute(k, v));
        Object.entries(events).forEach(([e, h]) => html.addEventListener(e, h));
        if (!Tenum.inEnum(status, EelementStatus.visible)) html.classList.add('hidden');

        this.moveOptions = Object.assign({ handle: null, bound: true, xable: true, yable: true }, moveOptions);
        this.dragOptions = Object.assign({ handle: null, group: null, type: 'default', revertIfNotDropped: true, dragClass: 'dragging' }, dragOptions);
        this.dropOptions = Object.assign({ acceptTypes: ['default'], hoverClass: 'droppable-hover', placeHolderClass: 'drop-placeholder', showPlaceHolder: true }, dropOptions);
        this.resizeOptions = Object.assign({ borders: Eborder.all, useHelper: false, minWidth: 20, maxWidth: Infinity, minHeight: 20, maxHeight: Infinity }, resizeOptions);
        this.rect = new TelementRect(this.htmlObject);

        const resolveHandle = h => {
            if (!h) return null;
            if (h instanceof HTMLElement) return h;
            if (typeof h === 'string') return html.querySelector(h) || null;
            return null;
        };

        const thisRef = this;
        Object.defineProperty(this.dragOptions, 'handle', {
            enumerable: true,
            get() { return thisRef.#dragHandle || html; },
            set(v) {
                thisRef.#dragHandle = resolveHandle(v) ?? html;
                thisRef.#updateHybridFlag();
                thisRef.#refreshDragListeners();
            }
        });
        Object.defineProperty(this.moveOptions, 'handle', {
            enumerable: true,
            get() { return thisRef.#moveHandle || html; },
            set(v) {
                thisRef.#moveHandle = resolveHandle(v) ?? html;
                thisRef.#updateHybridFlag();
                if (thisRef.status.movable) thisRef.#toggleFeature('movable', true);
            }
        });
         EelementStatus.bindTo('status', this);
        this.moveOptions.handle = moveOptions.handle;
        this.dragOptions.handle = dragOptions.handle;

        this.htmlObject.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            if (this.status.selectable) {
                e.stopPropagation();
                const { multiKey, silent } = this.selectOptions;
                const multi = multiKey(e);
                selectionManager.toggle(this, { multi, silent });
            } else if (this.htmlObject.parentElement === document.body) {
                selectionManager.clear();
            }
        });

        this.children = [];
        children.forEach(ch => this.appendChild(ch));
        if (parent) (parent instanceof Telement ? parent.appendChild(this) : parent.appendChild(html));

       
        this.status.onchange = ch => this.#handleStatusChange(ch);
        if (typeof status === 'object') {
            this.status.assign(status);
        } else {
            this.status = status;
        }
        const defaultHist = { trackStyle: false, trackResize: false, trackChildren: false, trackAttr: false, trackEvents: false };
        this.historyOptions = { ...defaultHist, ...historyOptions };
        this.#initOpts = safeCloneOptions(opts);
        this.#initialKeys = new Set(Object.getOwnPropertyNames(this));
        this[_ctorArgs] = [tagOrEl].concat(Object.keys(opts).length ? [opts] : []);
        
    }

  

    #handleStatusChange(changes) {
        for (const [flag, value] of Object.entries(changes)) {
            this.#toggleFeature(flag, value);
        }
    }

    #toggleFeature(flag, isOn) {
        this.htmlObject.classList.toggle(flag, isOn);
        if (flag === 'draggable' || flag === 'movable') this.#updateHybridFlag();

        switch (flag) {
            case 'draggable':
                DOM.makeDraggable(this.htmlObject, this.dragOptions.handle, isOn);
                break;
            case 'movable':
                DOM.makeMovable(this.htmlObject, this.moveOptions.handle, this.moveOptions.bound, this.moveOptions.xable, this.moveOptions.yable);
                break;
            case 'sizable':
                DOM.makeResizable(this.htmlObject, isOn ? this.resizeOptions : false);
                break;
            case 'visible':
                this.htmlObject.classList.toggle('hidden', !isOn);
                break;
        }
    }

    #updateHybridFlag() {
        this.#hybridDrag = (this.moveOptions.handle === this.dragOptions.handle && this.status.movable && this.status.draggable);
    }

    #refreshDragListeners() {
        this.#disableDrag();
        if (!this.#hybridDrag && this.status?.draggable) this.#enableDrag();
    }

    #enableDrag() {
        if (this.#dragHandlers) return;
        const h = this.dragOptions.handle;
        h.setAttribute('draggable', 'true');
        this.#dragHandlers = {
            dragstart: (e) => this.#onDragStart(e),
            dragend: (e) => this.#onDragEnd(e)
        };
        Object.entries(this.#dragHandlers).forEach(([evt, handler]) => h.addEventListener(evt, handler));
    }

    #disableDrag() {
        if (!this.#dragHandlers) return;
        const h = this.dragOptions.handle;
        h.setAttribute('draggable', 'false');
        Object.entries(this.#dragHandlers).forEach(([evt, handler]) => h.removeEventListener(evt, handler));
        this.#dragHandlers = null;
    }

    #onDragStart(e) { /* ... */ }
    #onDragEnd(e) { /* ... */ }

    body(parent) {
        if (this.loaded) return;
        parent = parent ?? this.htmlObject.parentElement ?? document.body;
        if (parent.owner && typeof parent.owner.appendChild === 'function') {
            parent.owner.appendChild(this);
        } else {
            parent.appendChild(this.htmlObject);
        }
        this.children.forEach(child => child.body(this.htmlObject));

        this.dispatchEvent(new CustomEvent('load'));
        const sts = Number(this.status);
        this.status = 0;
        this.status = sts;
        this.loaded = true;
        this.rect.refresh();
    }

    appendChild(child) {
        if (!(child instanceof Telement)) {
            this.htmlObject.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
            return;
        }
        if (child.parent) child.parent.removeChild(child);
        this.children.push(child);
        child.parent = this;
        this.htmlObject.appendChild(child.htmlObject);
    }

    removeChild(child) {
        if (!(child instanceof Telement)) {
            if (this.htmlObject.contains(child)) this.htmlObject.removeChild(child);
            return;
        }
        const idx = this.children.indexOf(child);
        if (idx > -1) this.children.splice(idx, 1);
        if (this.htmlObject.contains(child.htmlObject)) this.htmlObject.removeChild(child.htmlObject);
        child.parent = null;
    }

    destroy() {
        this.children.forEach(child => child.destroy?.());
        this.htmlObject?.parentNode?.removeChild(this.htmlObject);
        if (this.htmlObject) this.htmlObject.owner = null;
        this.dispatchEvent(new CustomEvent('destroy'));
        super.destroy();
    }

    select(opts = {}) {
        selectionManager.select(this, opts);
    }
    deselect(opts = {}) {
        selectionManager.deselect(this, opts);
    }
    get isSelected() {
        return selectionManager.has(this);
    }
    get visible() {
        return this.status.visible;
    }
    set visible(val) {
        this.status.visible = val;
    }
}
    const styles = `
.telement:focus { outline: 2px solid #0078d4; outline-offset: 1px; }
 .dragging { opacity: 0.4; }
 .inside-drag-handle { cursor: grab; user-select: none; margin-right: 4px; }
 .selectable:hover { background-color: rgba(0, 102, 255, 0.08);cursor: pointer;}
 .selected {border: 2px solid #0066FF;box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.5);}
 .selectable.selected {border-color: #004bb5;box-shadow: 0 0 0 2px rgba(0, 75, 181, 0.7);}
 .selectable:not(.selected) {transition: background-color 0.2s, border-color 0.2s;}
 body:not(.design-mode) .selected:hover {background-color: transparent;}
 .selectable:focus {outline: none;border: 2px dashed rgba(0, 102, 255, 0.7);}
 .disabled { opacity: 0.5; pointer-events: none; }
 .locked { pointer-events: none; }
 .hidden { display: none !important; }
 .droppable-hover { background-color: rgba(0, 120, 212, 0.05); }
 .dockable:empty { border: 2px dotted #0078d4 !important; }
 .dock-highlight { outline: 2px dashed #0078d4 !important; background-color: rgba(0, 120, 212, 0.1) !important; }`;
    DOM.addStyle(styles);
    window.Telement = Telement;
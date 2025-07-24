
import { Twindow } from '../Twindow.js';
import { EcaptionButton } from '../../core/enums.js';
import { DOM } from '../../dom/dom.js';

const PICKER_W = 350;
const PICKER_H = 220;

export function pickerWindowOpts(opts = {}) {
    const embedded = !!opts.parent || !!opts.container;
    return {
        title: opts.title ?? 'Color Picker',
        parent: opts.parent ?? opts.container ?? null,
        width: PICKER_W,
        height: PICKER_H,
        minWidth: PICKER_W,
        minHeight: PICKER_H,
        showCaption: embedded ? false : (opts.showCaption ?? true),
        movable: embedded ? false : (opts.movable ?? true),
        sizable: false, // resizable -> sizable
        ...opts
    };
}

export function colorWindowOpts(opts = {}) {
    return {
        targetElement: null,
        targetStyle: 'backgroundColor',
        targetInput: null,
        defaultColor: '#ff0000',
        onChange: null,
        onClose: null,
        container: null,
        title: 'Single Color Picker',
        ...opts
    };
}


export class TbasePicker extends Twindow {
    constructor(opts = {}) {
        super({
            width: 420, height: 300, sizable: false,
            title: opts.title ?? 'Color Picker',
            buttons: [EcaptionButton.close],
            ...opts
        });

        this.targetStyle = opts.targetStyle ?? 'background';
        this.targetInput = opts.targetInput ?? null;
        this.onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
        this.onClose = typeof opts.onClose === 'function' ? opts.onClose : () => {};
    }

    static #_instances = new WeakMap();

    static getInstance() {
        let inst = TbasePicker.#_instances.get(this);
        if (!inst) {
            inst = new this();
            inst.body(DOM.baseLayer.subLayers.windows);
            TbasePicker.#_instances.set(this, inst);
        } else {
            inst.show();
        }
        return inst;
    }

    body(parent) {
        if (!this.parent) {
            super.body(parent);
        } else {
            this.parent.appendChild(this.htmlObject);
            this.loaded = true;
        }
        this.contentPanel.style.textAlign = 'center';
        this.previewBox = Object.assign(document.createElement('div'), {
            style: 'position:relative;overflow:hidden;display:inline-block;width:56px;height:56px;border:1px solid #000;margin-top:10px'
        });

        this.buildSpecificUI();
        this.updatePreview();
    }

    buildSpecificUI() { throw new Error('buildSpecificUI must be implemented by subclass'); }
    updatePreview() { throw new Error('updatePreview must be implemented by subclass'); }
    
    close(result) {
        // Twindow's close method handles destroy or hide.
        // We just ensure onClose callback is fired.
        super.close(result); 
        this.onClose(result);
    }
}
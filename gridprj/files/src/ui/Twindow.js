import { TpositionedElement } from '../dom/TpositionedElement.js';
import { extendsClass } from '../core/classUtils.js';
import { EcaptionButton, Ealign } from '../core/enums.js';
import { DOM } from '../dom/dom.js';

const TframeMixin = class TframeMixin {
    _initFrame({
        title = 'Window',
        buttons = [EcaptionButton.close],
        width = 400,
        height = 300,
        minWidth = 160,
        minHeight = 80,
        maxWidth = null,
        maxHeight = null,
        showCaption = true,
        movable = true,
        parent = null
    } = {}) {

        Object.assign(this.htmlObject.style, {
            position: parent ? 'relative' : 'absolute',
            width: width + 'px',
            height: height + 'px',
            minWidth: minWidth + 'px',
            minHeight: minHeight + 'px',
            ...(maxWidth ? { maxWidth: maxWidth + 'px' } : {}),
            ...(maxHeight ? { maxHeight: maxHeight + 'px' } : {}),
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            border: '1px solid #b9b9b9',
            borderRadius: '9px',
            boxShadow: parent ? '' : '0 6px 32px #0003,0 1.5px 3.5px #0002'
        });

        if (showCaption) {
            this.captionBar = document. Element('div');
            this.captionBar.className = 'twindow-caption';
            this.captionBar.style.cssText = `display:flex;align-items:center;justify-content:space-between;background:linear-gradient(#ececec,#e3e8f2 90%);height:30px;padding:0 10px 0 12px;user-select:none;cursor:${movable && !parent ? 'move' : 'default'};font-weight:bold;border-bottom:1px solid #c5c5c5`;

            const captionTitle = document.createElement('div');
            captionTitle.textContent = title;
            captionTitle.style.cssText = 'flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis';
            this.captionBar.appendChild(captionTitle);

            const bar = document.createElement('div');
            buttons.forEach(bt => bar.appendChild(this.#mkBtn(bt)));
            this.captionBar.appendChild(bar);
            this.htmlObject.appendChild(this.captionBar);

            if (movable && !parent) {
                this.moveOptions.handle = this.captionBar;
                this.status.movable = true;
            }
        }

        this.contentPanel = document.createElement('div');
        this.contentPanel.className = 'twindow-content';
        this.contentPanel.style.cssText = `flex:1 1 auto;overflow:auto;background:#fff;min-height:${minHeight - 30}px;position:relative;`;
        this.htmlObject.appendChild(this.contentPanel);
    }

    #mkBtn(btnType) {
        let b = document.createElement("button");
        b.className = "twindow-btn";
        b.style.cssText = `width:26px;height:22px;border:none;border-radius:3px;margin-left:4px;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;`;
        switch (btnType) {
            case EcaptionButton.close:
                b.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16"><line x1="3" y1="3" x2="13" y2="13" stroke="#c00" stroke-width="2"/><line x1="13" y1="3" x2="3" y2="13" stroke="#c00" stroke-width="2"/></svg>`;
                b.title = "Kapat";
                b.onclick = e => { e.stopPropagation(); this.close(); };
                break;
            case EcaptionButton.maximize:
                b.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" fill="none" stroke="#555" stroke-width="2"/></svg>`;
                b.title = "Maksimize";
                b.onclick = e => { /* maximize logic */ };
                break;
            case EcaptionButton.minizime:
                b.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16"><line x1="3" y1="13" x2="13" y2="13" stroke="#555" stroke-width="2"/></svg>`;
                b.title = "Simge durumuna küçült";
                b.onclick = e => { /* minimize logic */ };
                break;
            case EcaptionButton.help:
                b.textContent = "?";
                b.title = "Yardım";
                b.onclick = e => { /* help logic */ };
                break;
            default:
                b.textContent = btnType;
        }
        return b;
    };
};
window.TframeMixin = TframeMixin;
const TdialogMixin = class TdialogMixin {
    _initDialog({ mode = 'window', inputType = 'text' } = {}) {
        this.mode = mode;
        if (mode !== 'window') {
            this._overlay = document.createElement('div');
            Object.assign(this._overlay.style, { position: 'fixed', inset: 0, background: '#0006', zIndex: 9900 });
            this._overlay.onclick = e => { if (mode === 'modal') e.stopPropagation(); };
            Object.assign(this.htmlObject.style, { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 9901 });
            this.htmlObject.tabIndex = -1;
            this.htmlObject.addEventListener('keydown', this.#trapTab);
        }

        if (['alert', 'confirm', 'prompt'].includes(mode)) {
            const box = document.createElement('div');
            box.style.cssText = 'display:flex;gap:6px;justify-content:center;padding:12px';
            const mk = txt => { const b = document.createElement('button'); b.textContent = txt; return b; };
            if (mode === 'alert') {
                const ok = mk('OK'); ok.onclick = () => this.close(true); box.append(ok);
            } else if (mode === 'confirm') {
                const ok = mk('OK'), cancel = mk('Cancel');
                ok.onclick = () => this.close(true); cancel.onclick = () => this.close(false);
                box.append(ok, cancel);
            } else if (mode === 'prompt') {
                const inp = document.createElement('input');
                inp.type = inputType; inp.style.flex = '1 1 0';
                const ok = mk('OK'), cancel = mk('Cancel');
                ok.onclick = () => this.close(inp.value); cancel.onclick = () => this.close(null);
                box.append(inp, ok, cancel);
                setTimeout(() => inp.focus(), 20);
            }
            this.contentPanel.append(box);
        }
    }

    #trapTab = e => {
        if (e.key !== 'Tab') return;
        const f = [...this.htmlObject.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
};
window.TdialogMixin = TdialogMixin;
export class Twindow extends extendsClass(TdialogMixin, TframeMixin, TpositionedElement) {
    #isModal = false;
    #overlay = null;
    #modalPromise = null;
    #resolveModal = null;

    constructor(opts = {}) {
        super('div', opts);
        this._initFrame(opts);
        this._initDialog(opts);
        this.closeMode = opts.closeMode ?? 'close';
        this.onClose = opts.onClose ?? null;
        Object.defineProperty(this, 'captionText', {
            get: () => this.captionBar?.querySelector('div')?.textContent ?? '',
            set: v => { if (this.captionBar) this.captionBar.querySelector('div').textContent = v; },
            configurable: true, enumerable: true
        });
    }

    #createBackdrop(modal = true) {
        if (this.#overlay) return;
        this.#isModal = modal;
        const ov = document.createElement('div');
        ov.className = 'twindow-backdrop';
        Object.assign(ov.style, { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 9900 });
        ov.addEventListener('mousedown', e => {
            if (!this.#isModal) this.close(false);
            e.stopPropagation();
        });
        DOM.baseLayer.subLayers.overlay.appendChild(ov);
        let ovf = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        this.#overlay = ov;
        this.#overlay.ovf = ovf;
    }

    #removeBackdrop() {
        if (!this.#overlay) return;
        document.body.style.overflow = this.#overlay.ovf;
        this.#overlay.remove();
        this.#overlay = null;
    }

    #open(modal, target, align, dx, dy) {
        if (this.#modalPromise) return this.#modalPromise;
        this.#createBackdrop(modal);
        this.popup(target, align, dx, dy);
        if(!target) this.rect.centerInViewport();
        return this.#modalPromise = new Promise(res => {
            this.#resolveModal = res;
        });
    };
    
    showModal(target = null, align = Ealign.center | Ealign.middle, dx = 0, dy = 0) {
        if(this.htmlObject.parentElement.owner?.subLayers?.modal) 
        return this.#open(true, DOM.getHtmlElement(target), align, dx, dy);
    }

    showDialog(target = null, align, dx, dy) {
        return this.#open(false, DOM.getHtmlElement(target), align, dx, dy);
    }
    
    hide(result) {
        super.hide();
        this.#removeBackdrop();
        this.#resolveModal?.(result);
        this.#modalPromise = null;
    }

    close(result) {
        this.onClose?.(result);
        if (this.closeMode === 'hide') {
            this.hide(result);
        } else {
            this.#removeBackdrop();
            this.#resolveModal?.(result);
            this.#modalPromise = null;
            this.destroy();
        }
    }
}
window.Twindow = Twindow;
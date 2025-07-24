import { TbaseGradientPicker } from './TbaseGradientPicker.js';

export class TgradientPicker extends TbaseGradientPicker {
    static #inst;

    static getInstance(opts = {}) {
        return this.#inst ??= new TgradientPicker(opts);
    }

    static pick(opts = {}) {
        const p = this.getInstance(opts);
        if (opts.targetInput) p.attach(opts.targetInput);
        if (opts.targetElement) p.targetElement = opts.targetElement;
        
        p.popup(opts.targetElement || opts.targetInput || null);
        p.show();
        return p;
    }

    constructor(opts = {}) {
        super({
            title: "Gradient Picker",
            ...opts
        });

        const detectedCss =
            (this.targetInput && this.targetInput.value) ||
            (this.targetElement && getComputedStyle(this.targetElement)[this.targetStyle]) ||
            opts.defaultCss;
            
        this.set(detectedCss);
    }

    attach(input) {
        this.targetInput = input;
        input.addEventListener('change', e => this.set(e.target.value));
        this.onChange = value => {
            if (this.targetInput) this.targetInput.value = value;
        };
        this.set(input.value);
    }

    set(value) {
        const parsed = this._parseGradientCss(value); // _parse protected metot olmalı
        if (parsed) {
            this.selectedFunction = parsed.func;
            this.gradientAngle = parsed.angle;
            this.centerPos = parsed.center;
            this.stops = parsed.stops;
        } else {
            // Varsayılan değerlere dön
            this.selectedFunction = 'linear-gradient()';
            this.gradientAngle = 90;
            this.centerPos = { x: 50, y: 50 };
            this.stops = [{ color: "#f00", position: 0 }, { color: "#00f", position: 100 }];
        }
        
        if (this.loaded) {
            this.updatePreview();
            this.renderStopButtons();
            this.updateAltPanel();
        }
    }
}
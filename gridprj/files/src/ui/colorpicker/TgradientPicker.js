import { TbaseGradientPicker } from './TbaseGradientPicker.js';

export class TgradientPicker extends TbaseGradientPicker {
 static #inst;

    static getInstance(opts = {}) {
        if (!this.#inst || (opts.parent && this.#inst.parent !== opts.parent)) {
           this.#inst = new TgradientPicker(opts);
        } else {
           Object.assign(this.#inst, opts);
        }
        return this.#inst;
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
        super({ title: "Gradyan Seçici", ...opts });
        const detectedCss = (this.targetInput?.value) || (this.targetElement && getComputedStyle(this.targetElement)[this.targetStyle]) || opts.defaultCss;
        this.set(detectedCss);
    }
    
    set(cssValue) {
        const parsed = this._parseGradientCss(cssValue);
        if (parsed) {
            this.selectedFunction = parsed.func;
            this.gradientAngle = parsed.angle;
            this.centerPos = parsed.center;
            this.stops = parsed.stops;
        } else {
            this.initData(); // Geçersizse varsayılana dön
        }
        
        if (this.loaded) {
            this.updatePreview();
            this.renderStopButtons();
        }
    }

    _parseGradientCss(cssStr) {
        if (!cssStr || typeof cssStr !== 'string' || !cssStr.includes('gradient')) return null;

        try {
            const funcMatch = cssStr.match(/^(repeating-)?(linear|radial|conic)-gradient/);
            if (!funcMatch) return null;
            const func = funcMatch[0];

            const content = cssStr.substring(cssStr.indexOf('(') + 1, cssStr.lastIndexOf(')'));
            
            const parts = content.split(/,(?![^\(]*\))/); // Virgüllere böl, ama parantez içindekileri yoksay
            
            let angle = 90;
            let center = { x: 50, y: 50 };
            const stops = [];

            const firstPart = parts[0].trim();
            if (firstPart.includes('deg')) {
                angle = parseFloat(firstPart) || 90;
                parts.shift();
            } else if (firstPart.includes('at')) {
                const posMatch = firstPart.match(/(\d+(\.\d+)?)%\s*(\d+(\.\d+)?)%/);
                if (posMatch) {
                    center.x = parseFloat(posMatch[1]);
                    center.y = parseFloat(posMatch[3]);
                }
                parts.shift();
            }
            
            parts.forEach(part => {
                const trimmed = part.trim();
                const colorMatch = trimmed.match(/(rgba?\(.+\)|#\w{3,6}|\w+)/);
                const posMatch = trimmed.match(/(\d+(\.\d+)?)%/);
                if (colorMatch && posMatch) {
                    stops.push({
                        color: colorMatch[0],
                        position: parseFloat(posMatch[1])
                    });
                }
            });

            if (stops.length < 2) return null;

            return { func, angle, center, stops };
        } catch (e) {
            console.error("Gradyan ayrıştırılamadı:", e);
            return null;
        }
    }
}
window.TgradientPicker = TgradientPicker;
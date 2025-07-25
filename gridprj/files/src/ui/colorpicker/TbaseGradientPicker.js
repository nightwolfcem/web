
import { TbasePicker } from './TbasePicker.js';
import { TsingleColorPicker } from './TsingleColorPicker.js';
import { translayer } from './utils.js';

export class TbaseGradientPicker extends TbasePicker {
    initData() {
        this.gradientAngle = 0;
        this.centerPos = { x: 50, y: 50 };
        this.selectedFunction = 'linear-gradient()';
        this.stops = [
            { color: '#f00', position: 0 },
            { color: '#00f', position: 100 }
        ];
    }

    buildSpecificUI() {
        const topContainer = document.createElement('div');
        topContainer.style.cssText = 'display: flex; gap: 10px; align-items: flex-start;';

        this.previewBox.style.width = '110px';
        this.previewBox.style.height = '110px';
        this.previewBox.style.margin = '0';
        topContainer.appendChild(this.previewBox);

        this._buildFunctionGrid(); // Fonksiyon seçici grid'i
        topContainer.appendChild(this.altPanel);

        this.contentPanel.appendChild(topContainer);

        this.linerBar = Object.assign(document.createElement('div'), {
            style: 'position:relative; width:calc(100% - 20px); height:30px; margin:10px auto; cursor:pointer;'
        });
        this.contentPanel.appendChild(this.linerBar);
        this.linerBar.onclick = e => { if (e.target === this.linerBar) this.addStop(e); };

        this._buildAngleSelector();
        this._buildPosSelector();

        this.renderStopButtons();
    }

    _buildFunctionGrid() {
        if (!this.altPanel) {
            this.altPanel = Object.assign(document.createElement('div'), {
                style: 'display:inline-block; vertical-align:top; margin-left:8px;'
            });
        }
        this.functions = [
            "linear-gradient()", "radial-gradient()", "conic-gradient()",
            "repeating-linear-gradient()", "repeating-radial-gradient()", "repeating-conic-gradient()"
        ];
        this.fnPanel = Object.assign(document.createElement('div'), {
            style: 'display:grid; grid-template-columns:repeat(3, 1fr); gap:5px;'
        });
        this.altPanel.appendChild(this.fnPanel);

        this.functions.forEach(fn => {
            const btn = Object.assign(document.createElement('div'), {
                style: 'width:50px; height:50px; border:1px solid #ccc; cursor:pointer;'
            });
            btn.onclick = () => {
                this.selectedFunction = fn;
                this.updatePreview();
                this.updateAltPanel();
            };
            this.fnPanel.appendChild(btn);
        });
        this.updateAltPanel();
    }

    updateAltPanel() {
        if (!this.fnPanel) return;
        Array.from(this.fnPanel.children).forEach((btn, i) => {
            const css = this.toCss(this.functions[i]);
            translayer.setForeColor(`linear-gradient(${this.toCss(this.functions[i])})`, btn);

            btn.style.border = this.functions[i] === this.selectedFunction ?
                "3px solid aquamarine" :
                "1px solid #ccc";
        });
    }

    renderStopButtons() {
        this.linerBar.innerHTML = "";
        this.stops.forEach((stop, idx) => {
            const btn = document.createElement("div");
            btn.style.cssText = `position:absolute; left:calc(${stop.position}% - 8px); top:5px; width:16px; height:20px; cursor:pointer; z-index:5;`;
            btn.innerHTML = `<div style="width:0; height:0; border-left:8px solid transparent; border-right:8px solid transparent; border-top:8px solid #333"></div><div style="width:100%; height:12px; border:1px solid #000; background:${stop.color}; box-sizing:border-box;"></div>`;

            btn.onmousedown = e => {
                e.stopPropagation();
                const rect = this.linerBar.getBoundingClientRect();
                const sx = e.clientX, sy = e.clientY, init = stop.position;
                const mv = ev => {
                    const dX = ev.clientX - sx, dY = ev.clientY - sy;
                    if (Math.abs(dY) > 20 && this.stops.length > 2) {
                        this.stops.splice(idx, 1);
                        this.renderStopButtons();
                        this.updatePreview();
                        window.removeEventListener("mousemove", mv);
                        return;
                    }
                    let p = init + (dX / rect.width) * 100;
                    p = Math.max(0, Math.min(100, p));
                    stop.position = p;
                    btn.style.left = `calc(${p}% - 8px)`;
                    this.updateLinerBar();
                    this.updatePreview();
                    this.updateAltPanel();
                };
                window.addEventListener("mousemove", mv);
                window.addEventListener("mouseup", () => window.removeEventListener("mousemove", mv), { once: true });
            };

            btn.ondblclick = e => {
                e.stopPropagation();
                TsingleColorPicker.pick({
                    defaultColor: stop.color,
                    onChange: c => {
                        stop.color = c;
                        btn.querySelector('div:last-child').style.background = c;
                        this.updateLinerBar();
                        this.updatePreview();
                        this.updateAltPanel();
                    }
                });
            };
            this.linerBar.appendChild(btn);
        });
        this.updateLinerBar();
    }

    updateLinerBar() {
        if (!this.linerBar) return;
        const stopsStr = [...this.stops]
            .sort((a, b) => a.position - b.position)
            .map(s => `${s.color} ${Math.round(s.position)}%`).join(", ");
        translayer.setForeColor(`linear-gradient(90deg, ${stopsStr})`, this.linerBar);
    }

    _buildAngleSelector() {
        this.dirSelector = Object.assign(document.createElement("div"), {
            style: `
position:absolute;left:50%;top:50%;
width:40px;height:40px;margin:-20px 0 0 -20px;
border:3px solid rgba(0,0,0,.6);border-radius:50%;
background:rgba(255,255,255,.4);backdrop-filter:blur(2px);
cursor:pointer;user-select:none;`
        });
        this.dirDot = Object.assign(document.createElement("div"), {
            style: `position:absolute;width:8px;height:8px;border-radius:50%;
background:#4cc;border:2px solid #fff;`
        });
        this.dirLabel = Object.assign(document.createElement("div"), {
            style: `position:relative;font-size:10px;color:#000;pointer-events:none;
left:10px;top:14px;width:20px;text-align:center;`
        });
        this.dirSelector.append(this.dirDot, this.dirLabel);
        this.previewBox.appendChild(this.dirSelector);

        const cen = 20, r = 20;
        const refresh = () => {
            const rad = this.gradientAngle * Math.PI / 180;
            this.dirDot.style.left = `${cen + r * Math.cos(rad) - 6}px`;
            this.dirDot.style.top = `${cen + r * Math.sin(rad) - 6}px`;
            this.dirLabel.textContent = `${Math.round(this.gradientAngle)}°`;
        };
        refresh();

        this.dirSelector.onmousedown = e => {
            const box = this.previewBox.getBoundingClientRect();
            const cx = box.left + box.width / 2;
            const cy = box.top + box.height / 2;
            const mv = ev => {
                let ang = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
                if (ang < 0) ang += 360;
                this.gradientAngle = ang;
                refresh();
                this.updatePreview(); this.updateAltPanel();
            };
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", _ => window.removeEventListener("mousemove", mv), { once: true });
            e.stopPropagation();
        };
    }

    _buildPosSelector() {
        this.posSelector = Object.assign(document.createElement("div"), {
            style: `position:absolute;width:8px;height:8px;border:2px solid #fff;
border-radius:50%;background:rgba(0,0,0,.6);cursor:crosshair;
transform:translate( -50% , -50%);`
        });
        this.previewBox.appendChild(this.posSelector);

        const start = e => {
            const box = this.previewBox.getBoundingClientRect();
            const mv = ev => {
                const x = Math.max(0, Math.min(ev.clientX - box.left, box.width));
                const y = Math.max(0, Math.min(ev.clientY - box.top, box.height));
                this.centerPos.x = (x / box.width) * 100;
                this.centerPos.y = (y / box.height) * 100;
                this.posSelector.style.left = `${this.centerPos.x}%`;
                this.posSelector.style.top = `${this.centerPos.y}%`;
                this.updatePreview(); this.updateAltPanel();
            };
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", _ => window.removeEventListener("mousemove", mv), { once: true });
        };

        this.posSelector.onmousedown = start;
        this.previewBox.onmousedown = e => { if (e.target === this.previewBox) start(e); };

        this.posSelector.style.left = `${this.centerPos.x}%`;
        this.posSelector.style.top = `${this.centerPos.y}%`;
    }

    addStop(e) {
        const rect = this.linerBar.getBoundingClientRect();
        const pos = ((e.clientX - rect.left) / rect.width) * 100;
        this.stops.push({ color: "#ffffff", position: pos });
        this.renderStopButtons();
        this.updatePreview();
    }

    toCss(fnOverride) {
        const fn = fnOverride || this.selectedFunction;
        const stopsStr = [...this.stops]
            .sort((a, b) => a.position - b.position)
            .map(s => `${s.color} ${Math.round(s.position)}%`).join(", ");

        if (/linear/.test(fn))
            return fn.replace("()", `(${this.gradientAngle.toFixed(1)}deg, ${stopsStr})`);
        if (/conic/.test(fn))
            return fn.replace("()", `(from ${this.gradientAngle.toFixed(1)}deg at ${this.centerPos.x.toFixed(1)}% ${this.centerPos.y.toFixed(1)}%, ${stopsStr})`);
        if (/radial/.test(fn))
            return fn.replace("()", `(circle at ${this.centerPos.x.toFixed(1)}% ${this.centerPos.y.toFixed(1)}%, ${stopsStr})`);
        return fn.replace("()", `(${stopsStr})`);
    }

    updatePreview() {
        const css = this.toCss();
        translayer.setForeColor(css, this.previewBox);
        if (this.targetElement && this.targetStyle) this.targetElement.style[this.targetStyle] = css;

        this._refreshSelectors();
        this.onChange(css);
    }

    _refreshSelectors() {
        const f = this.selectedFunction;
        const angle = /linear|conic/.test(f);
        const pos = /radial|conic/.test(f);
        if (this.dirSelector) this.dirSelector.style.display = angle ? "block" : "none";
        if (this.posSelector) this.posSelector.style.display = pos ? "block" : "none";
    }

    _parseGradientCss(cssStr) {
        if (!cssStr) return null;
        const fnMatch = cssStr.match(/^([a-z\-]+-gradient)\s*\((.*)\)$/i);
        if (!fnMatch) return null;

        const func = fnMatch[1] + "()";
        let args = fnMatch[2].trim();
        let angle = 0,
            center = { x: 50, y: 50 },
            stops = [];

        if (/^linear-gradient/.test(func)) {
            const m = args.match(/^([0-9.]+)deg\s*,\s*/);
            if (m) { angle = +m[1]; args = args.slice(m[0].length); }
        }
        else if (/^conic-gradient/.test(func)) {
            const m = args.match(/from\s+([0-9.]+)deg\s+at\s+([0-9.]+)%\s+([0-9.]+)%,\s*/);
            if (m) {
                angle = +m[1];
                center = { x: +m[2], y: +m[3] };
                args = args.slice(m[0].length);
            }
        }
        else if (/^radial-gradient/.test(func)) {
            const m = args.match(/at\s+([0-9.]+)%\s+([0-9.]+)%,\s*/);
            if (m) {
                center = { x: +m[1], y: +m[2] };
                args = args.slice(m[0].length);
            }
        }

        stops = args.split(/\s*,\s*/).map(s => {
            const p = s.match(/^(.+?)(?:\s+([0-9.]+)%?)?$/);
            return {
                color: p[1].trim(),
                position: p[2] !== undefined ? +p[2] : undefined
            };
        });

        const n = stops.length;
        stops.forEach((s, i) => {
            if (s.position === undefined) s.position = (i / (n - 1)) * 100;
        });

        return { func, angle, center, stops };
    }
}

window.TbaseGradientPicker = TbaseGradientPicker;

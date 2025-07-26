
import { TbasePicker } from './TbasePicker.js';
import { TsingleColorPicker } from './TsingleColorPicker.js';
import { translayer } from './utils.js';

export class TbaseGradientPicker extends TbasePicker {
   constructor(opts = {}) {
        super({ width: 420, height: 280, ...opts });
        this.initData();
    }

    initData() {
        this.gradientAngle = 90;
        this.centerPos = { x: 50, y: 50 };
        this.selectedFunction = 'linear-gradient';
        this.stops = [
            { color: '#ff0000', position: 0 },
            { color: '#0000ff', position: 100 }
        ];
    }

    buildSpecificUI() {
        const topContainer = document.createElement('div');
        topContainer.style.cssText = 'display: flex; gap: 10px; align-items: flex-start; padding: 10px;';

        this.previewBox.style.width = '110px';
        this.previewBox.style.height = '110px';
        this.previewBox.style.margin = '0';
        topContainer.appendChild(this.previewBox);

        this._buildFunctionGrid();
        topContainer.appendChild(this.altPanel);
        
        this.contentPanel.appendChild(topContainer);

        this.linerBar = Object.assign(document.createElement('div'), {
            style: 'position:relative; width:calc(100% - 20px); height:30px; margin:10px auto; cursor:pointer; border-radius: 4px;'
        });
        this.contentPanel.appendChild(this.linerBar);
        this.linerBar.onclick = e => { if (e.target === this.linerBar) this.addStop(e); };

        this.renderStopButtons();
    }

    _buildFunctionGrid() {
        this.altPanel = document.createElement('div');
        this.functions = [ "linear-gradient", "radial-gradient", "conic-gradient", "repeating-linear-gradient", "repeating-radial-gradient", "repeating-conic-gradient" ];
        this.fnPanel = Object.assign(document.createElement('div'), {
            style: 'display:grid; grid-template-columns:repeat(3, 1fr); gap:5px;'
        });
        this.altPanel.appendChild(this.fnPanel);

        this.functions.forEach(fn => {
            const btn = Object.assign(document.createElement('div'), {
                style: 'width:50px; height:50px; border:1px solid #ccc; cursor:pointer; border-radius: 4px;'
            });
            btn.onclick = () => {
                this.selectedFunction = fn;
                this.updatePreview();
            };
            this.fnPanel.appendChild(btn);
        });

        this._buildAngleSelector();
        this._buildPosSelector();
        this.altPanel.append(this.dirSelector, this.posSelector);
    }

    _buildAngleSelector() {
        this.dirSelector = document.createElement('div');
        this.dirSelector.style.cssText = 'width: 50px; height: 50px; border: 1px solid black; border-radius: 50%; position: relative; margin-top: 10px;';
        const handle = document.createElement('div');
        handle.style.cssText = 'width: 4px; height: 25px; background: black; position: absolute; left: 23px; top: 0; transform-origin: 50% 25px;';
        this.dirSelector.appendChild(handle);

        const updateAngle = (e) => {
            const rect = this.dirSelector.getBoundingClientRect();
            const x = e.clientX - (rect.left + rect.width / 2);
            const y = e.clientY - (rect.top + rect.height / 2);
            this.gradientAngle = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
            this.updatePreview();
        };
        this.dirSelector.onmousedown = e => {
            updateAngle(e);
            const onMove = ev => updateAngle(ev);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', () => window.removeEventListener('mousemove', onMove), { once: true });
        };
    }

    _buildPosSelector() {
        this.posSelector = document.createElement('div');
        this.posSelector.style.cssText = 'width: 50px; height: 50px; border: 1px solid black; position: relative; margin-top: 10px; background: #eee;';
        const handle = document.createElement('div');
        handle.style.cssText = 'width: 6px; height: 6px; background: black; border-radius: 50%; position: absolute;';
        this.posSelector.appendChild(handle);
        
        const updatePos = (e) => {
            const rect = this.posSelector.getBoundingClientRect();
            this.centerPos.x = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
            this.centerPos.y = Math.max(0, Math.min(100, (e.clientY - rect.top) / rect.height * 100));
            this.updatePreview();
        };
        this.posSelector.onmousedown = e => {
            updatePos(e);
            const onMove = ev => updatePos(ev);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', () => window.removeEventListener('mousemove', onMove), { once: true });
        };
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
                const sx = e.clientX, init = stop.position;
                const mv = ev => {
                    if (Math.abs(ev.clientY - rect.top) > 30 && this.stops.length > 2) {
                        this.stops.splice(idx, 1);
                        this.renderStopButtons(); this.updatePreview();
                        window.removeEventListener("mousemove", mv); return;
                    }
                    let p = init + (ev.clientX - sx) / rect.width * 100;
                    stop.position = Math.max(0, Math.min(100, p));
                    btn.style.left = `calc(${stop.position}% - 8px)`;
                    this.updatePreview();
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
                        this.updatePreview();
                    }
                });
            };
            this.linerBar.appendChild(btn);
        });
        this.updateLinerBar();
    }

    updateLinerBar() {
        const stopsStr = [...this.stops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position.toFixed(1)}%`).join(", ");
        translayer.setForeColor(`linear-gradient(90deg, ${stopsStr})`, this.linerBar);
    }

    addStop(e) {
        const rect = this.linerBar.getBoundingClientRect();
        const pos = ((e.clientX - rect.left) / rect.width) * 100;
        this.stops.push({ color: "#ffffff", position: pos });
        this.renderStopButtons();
        this.updatePreview();
    }

    toCss() {
        const fn = this.selectedFunction;
        const stopsStr = [...this.stops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position.toFixed(1)}%`).join(", ");
        if (/linear/.test(fn)) return `${fn}(${this.gradientAngle.toFixed(1)}deg, ${stopsStr})`;
        if (/conic/.test(fn)) return `${fn}(from ${this.gradientAngle.toFixed(1)}deg at ${this.centerPos.x.toFixed(1)}% ${this.centerPos.y.toFixed(1)}%, ${stopsStr})`;
        if (/radial/.test(fn)) return `${fn}(circle at ${this.centerPos.x.toFixed(1)}% ${this.centerPos.y.toFixed(1)}%, ${stopsStr})`;
        return `${fn}(${stopsStr})`;
    }

    updatePreview() {
        const css = this.toCss();
        translayer.setForeColor(css, this.previewBox);
        if (this.targetElement) this.targetElement.style[this.targetStyle] = css;
        
        this._refreshSelectors();
        this.updateFunctionGrid();
        this.onChange(css);
    }
    
    updateFunctionGrid() {
        Array.from(this.fnPanel.children).forEach((btn, i) => {
            translayer.setForeColor(this.toCss(this.functions[i]), btn);
            btn.style.border = this.functions[i] === this.selectedFunction ? "2px solid #007bff" : "1px solid #ccc";
        });
    }

    _refreshSelectors() {
        const f = this.selectedFunction;
        this.dirSelector.style.display = /linear|conic/.test(f) ? "block" : "none";
        this.posSelector.style.display = /radial|conic/.test(f) ? "block" : "none";
        if (this.dirSelector.style.display === 'block') this.dirSelector.children[0].style.transform = `rotate(${this.gradientAngle}deg)`;
        if (this.posSelector.style.display === 'block') {
            this.posSelector.children[0].style.left = `calc(${this.centerPos.x}% - 3px)`;
            this.posSelector.children[0].style.top = `calc(${this.centerPos.y}% - 3px)`;
        }
    }
}

window.TbaseGradientPicker = TbaseGradientPicker;

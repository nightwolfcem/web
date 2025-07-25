import { TbasePicker } from './TbasePicker.js';
import { TsingleColorPicker } from './TsingleColorPicker.js';
import { translayer } from './utils.js';

export class TmultiRadialGradientPicker extends TbasePicker {
    constructor(opts = {}) {
        const defaultOptions = {
            defaultPoints: [{
                x: 50, y: 50,
                stops: [
                    { color: "#ffd3fb", position: 0 },
                    { color: "rgba(255,211,251,0)", position: 35 }
                ]
            }],
            title: "Multi Radial Gradient Picker",
            selectedIdx: 0,
            ...opts
        };

        super(defaultOptions);

        this.points = JSON.parse(JSON.stringify(defaultOptions.defaultPoints));
        this.selectedIdx = defaultOptions.selectedIdx;
    }

    // TbasePicker'dan gelen bu metodu dolduruyoruz.
    buildSpecificUI() {
        this.previewBox.style.width = 'calc(100% - 20px)';
        this.previewBox.style.height = '150px';
        this.previewBox.style.margin = '10px';
        this.previewBox.style.cursor = 'crosshair';
        this.contentPanel.prepend(this.previewBox); // Ana previewBox'ı başa al

        this.previewBox.onclick = e => this.handlePreviewClick(e);

        this.linerBar = Object.assign(document.createElement("div"), {
            style: `position:relative; width:calc(100% - 20px); height:30px; margin:6px auto; cursor:pointer; border-radius:4px;`
        });
        this.linerBar.onclick = e => { if (e.target === this.linerBar) this.addStopToSelected(e); };
        this.contentPanel.appendChild(this.linerBar);
        
        this.renderPoints();
        this.renderStopButtons();
    }

    // TbasePicker'dan gelen bu metodu dolduruyoruz.
    updatePreview() {
        const css = this.getGradientCSS();
        // Ana previewBox'ı (büyük olanı) güncelliyoruz
        this.previewBox.style.background = css;

        // Hedef elementleri ve input'u güncelle
        if (this.targetElement && this.targetStyle) this.targetElement.style[this.targetStyle] = css;
        if (this.targetInput) this.targetInput.value = css;
        
        // Callback'i çağır
        this.onChange(css);

        // Diğer UI elemanlarını güncelle
        this.updateLinerBar();
    }
    
    renderPoints() {
        // Nokta işaretçilerini previewBox'ın içine çizmek için, önce eski işaretçileri temizle
        Array.from(this.previewBox.querySelectorAll('.picker-dot')).forEach(dot => dot.remove());

        this.points.forEach((pt, i) => {
            const dot = document.createElement("div");
            dot.className = 'picker-dot';
            dot.title = "Çift tıkla sil, sürükle";
            dot.style.cssText = `position:absolute; left:${pt.x}%; top:${pt.y}%; width:14px; height:14px; margin:-7px 0 0 -7px; border-radius:50%; border:2px solid ${i === this.selectedIdx ? "#0af" : "#fff"}; background:${i === this.selectedIdx ? "#cfc" : "#eee"}; cursor:pointer; z-index:4; box-shadow:0 0 2px #0004;`;
            
            dot.onmousedown = e => {
                e.stopPropagation();
                const box = this.previewBox.getBoundingClientRect();
                const move = ev => {
                    let x = ((ev.clientX - box.left) / box.width) * 100;
                    let y = ((ev.clientY - box.top) / box.height) * 100;
                    pt.x = Math.max(0, Math.min(100, x));
                    pt.y = Math.max(0, Math.min(100, y));
                    dot.style.left = `${pt.x}%`; dot.style.top = `${pt.y}%`;
                    this.updatePreview();
                };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", () => window.removeEventListener("mousemove", move), { once: true });
            };
            dot.onclick = e => {
                e.stopPropagation();
                this.selectedIdx = i;
                this.renderPoints();
                this.renderStopButtons();
            };
            dot.ondblclick = e => {
                e.stopPropagation();
                if (this.points.length > 1) {
                    this.points.splice(i, 1);
                    if (this.selectedIdx >= this.points.length) this.selectedIdx = this.points.length - 1;
                    this.renderPoints();
                    this.renderStopButtons();
                    this.updatePreview();
                }
            };
            this.previewBox.appendChild(dot);
        });
    }

    handlePreviewClick(e) {
        // Sadece preview kutusunun kendisine tıklandıysa (noktaların üzerine değil)
        if (e.target !== this.previewBox) return;

        const rect = this.previewBox.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        this.points.push({
            x, y, stops: [
                { color: "#ffffff", position: 0 },
                { color: "rgba(255,255,255,0)", position: 50 }
            ]
        });
        this.selectedIdx = this.points.length - 1;
        this.renderPoints();
        this.renderStopButtons();
        this.updatePreview();
    }

    renderStopButtons() {
        this.linerBar.innerHTML = "";
        if (!this.points[this.selectedIdx]) return;
        let stops = this.points[this.selectedIdx].stops;
        
        stops.forEach((stop, idx) => {
            const btn = document.createElement("div");
            btn.style.cssText = `position: absolute; left: calc(${stop.position}% - 8px); top: 5px; width: 16px; height: 20px; cursor: pointer; z-index:2;`;
            btn.innerHTML = `<div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid #333;"></div><div style="width: 100%; height: 12px; background: ${stop.color}; border: 1px solid #333; box-sizing: border-box;"></div>`;
            
            btn.ondblclick = e => {
                e.stopPropagation();
                TsingleColorPicker.pick({
                    defaultColor: stop.color,
                    targetElement: e.currentTarget,
                    targetStyle: 'backgroundColor', // Sadece görsel amaçlı
                    onChange: col => {
                        stop.color = col;
                        rect.style.background = col; // Düğme rengini anında güncelle
                        this.updatePreview();
                    }
                });
            };
            // ... (diğer olaylar: onmousedown for drag)
            this.linerBar.appendChild(btn);
        });
        this.updateLinerBar();
    }

    updateLinerBar() {
        if (!this.points[this.selectedIdx]) return;
        let stops = [...this.points[this.selectedIdx].stops]
            .sort((a, b) => a.position - b.position)
            .map(s => `${s.color} ${Math.round(s.position)}%`).join(", ");
        translayer.setForeColor(`linear-gradient(90deg, ${stops})`, this.linerBar);
    }
    
    addStopToSelected(e) {
        const bar = this.linerBar.getBoundingClientRect();
        const pos = ((e.clientX - bar.left) / bar.width) * 100;
        this.points[this.selectedIdx].stops.push({ color: "#ffffff", position: pos });
        this.renderStopButtons();
        this.updatePreview();
    }
    
    getGradientCSS() {
        return this.points.map(pt => {
            const stops = pt.stops
                .sort((a, b) => a.position - b.position)
                .map(s => `${s.color} ${Math.round(s.position)}%`).join(", ");
            return `radial-gradient(circle at ${pt.x.toFixed(2)}% ${pt.y.toFixed(2)}%, ${stops})`;
        }).join(", ");
    }
}
window.TmultiRadialGradientPicker = TmultiRadialGradientPicker;
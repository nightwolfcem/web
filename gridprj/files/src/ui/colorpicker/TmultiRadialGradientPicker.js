import { TbasePicker } from './TbasePicker.js';
import { TsingleColorPicker } from './TsingleColorPicker.js';
import { translayer } from './utils.js';

export class TmultiRadialGradientPicker extends TbasePicker {
     static #inst;

    static getInstance(opts = {}) {
        if (!this.#inst || (opts.parent && this.#inst.parent !== opts.parent)) {
           this.#inst = new TmultiRadialGradientPicker(opts);
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
        super({
            title: "Çoklu Radyal Gradyan Seçici",
            width: 420,
            height: 320,
            ...opts
        });

        this.points = opts.defaultPoints ? JSON.parse(JSON.stringify(opts.defaultPoints)) : [{
            x: 50, y: 50,
            stops: [
                { color: "#ffd3fb", position: 0 },
                { color: "rgba(255,211,251,0)", position: 35 }
            ]
        }];
        this.selectedIdx = 0;
    }

    buildSpecificUI() {
        this.previewBox.style.width = 'calc(100% - 20px)';
        this.previewBox.style.height = '150px';
        this.previewBox.style.margin = '10px';
        this.previewBox.style.cursor = 'crosshair';
        this.contentPanel.prepend(this.previewBox);

        this.previewBox.onclick = e => this.handlePreviewClick(e);

        this.linerBar = Object.assign(document.createElement("div"), {
            style: `position:relative; width:calc(100% - 20px); height:30px; margin:6px auto; cursor:pointer; border-radius:4px;`
        });
        this.linerBar.onclick = e => { if (e.target === this.linerBar) this.addStopToSelected(e); };
        this.contentPanel.appendChild(this.linerBar);
        
        this.renderPoints();
        this.renderStopButtons();
    }

    updatePreview() {
        const css = this.getGradientCSS();
        translayer.setForeColor(css, this.previewBox);
        if (this.targetElement) this.targetElement.style[this.targetStyle] = css;
        this.onChange(css);
        this.updateLinerBar();
    }
    
    renderPoints() {
           this.previewBox.innerHTML = "";
    // Tüm noktaları göster
    this.points.forEach((pt, i) => {
      const dot = document.createElement("div");
      dot.title = "Çift tıkla sil, sürükle";
      dot.style.cssText =
        `position:absolute;left:${pt.x}%;top:${pt.y}%;width:14px;height:14px;
        margin:-7px 0 0 -7px;border-radius:50%;border:2px solid ${i===this.selectedIdx?"#0af":"#fff"};
        background:${i===this.selectedIdx?"#cfc":"#eee"};cursor:pointer;z-index:4;box-shadow:0 0 2px #0004;`;
      // Drag & select
      dot.onmousedown = e => {
        e.stopPropagation();
        let startX = e.clientX, startY = e.clientY;
        let box = this.previewBox.getBoundingClientRect();
        let move = ev => {
          let x = ((ev.clientX - box.left) / box.width) * 100;
          let y = ((ev.clientY - box.top) / box.height) * 100;
          pt.x = Math.max(0, Math.min(100, x));
          pt.y = Math.max(0, Math.min(100, y));
          dot.style.left = `${pt.x}%`; dot.style.top = `${pt.y}%`;
          this.updatePreview();
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", _ => window.removeEventListener("mousemove", move), { once: true });
      };
      dot.onclick = e => {
        e.stopPropagation();
        this.selectedIdx = i;
        this.renderPoints();
        this.renderStopButtons();
      };
      // Çift tıkla noktayı sil
      dot.ondblclick = e => {
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
    this.updatePreview();
    }

    handlePreviewClick(e) {
        if (e.target !== this.previewBox) return;
        const rect = this.previewBox.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        this.points.push({ x, y, stops: [{ color: "#ffffff", position: 0 }, { color: "rgba(255,255,255,0)", position: 50 }] });
        this.selectedIdx = this.points.length - 1;
        this.renderPoints(); this.renderStopButtons(); this.updatePreview();
    }

 renderStopButtons() {
    this.linerBar.innerHTML = "";
    if (!this.points[this.selectedIdx]) return;
    let stops = this.points[this.selectedIdx].stops;
    stops.forEach((stop, idx) => {
      const btn = document.createElement("div");
      btn.style.cssText = `
        position: absolute;
        left: calc(${stop.position}% - 8px);
        top: 20px;
        width: 16px; height: 20px;
        cursor: pointer; z-index:2;
      `;
      const tri = document.createElement("div");
      tri.style.cssText = `
        width: 0; height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 8px solid #000;
        margin: 0 auto;
      `;
      const rect = document.createElement("div");
      rect.style.cssText = `
        width: 100%; height: 12px;
        background: ${stop.color};
        border: 1px solid #000;
        box-sizing: border-box;
      `;
      btn.append(tri, rect);
      // Drag ile stop pozisyonunu değiştir
      btn.onmousedown = e => {
        e.stopPropagation();
        const bar = this.linerBar.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, init = stop.position;
        const move = ev => {
          const dX = ev.clientX - sx, dY = ev.clientY - sy;
          if (Math.abs(dY) > 20 && stops.length > 2) {
            stops.splice(idx, 1);
            this.renderStopButtons();
            this.updatePreview();
            window.removeEventListener("mousemove", move);
            return;
          }
          let p = init + (dX / bar.width) * 100;
          p = Math.max(0, Math.min(100, p));
          stop.position = p;
          btn.style.left = `calc(${p}% - 8px)`;
          this.updatePreview();
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", _ => window.removeEventListener("mousemove", move), { once: true });
      };
      // Çift tıkla renk editörü aç
      btn.ondblclick = e => {
        e.stopPropagation();
        const box = document.createElement("div");
        box.style.cssText = "position:absolute;z-index:3000;top:0;left:0;";
        document.body.appendChild(box);
        new TsingleColorPicker({
          container: box,
          defaultColor: stop.color,
          onChange: col => {
            stop.color = col;
            this.renderStopButtons();
            this.updatePreview();
          },
          onClose: () => {
            document.body.removeChild(box);
          }
        });
      };
      this.linerBar.appendChild(btn);
    });
    // linerBar'ın background'unu güncelle
    this.updateLinerBar();
  }

    updateLinerBar() {
        if (!this.points[this.selectedIdx]) return;
        let stops = [...this.points[this.selectedIdx].stops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position.toFixed(1)}%`).join(", ");
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
            const stops = pt.stops.sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position.toFixed(1)}%`).join(", ");
            return `radial-gradient(circle at ${pt.x.toFixed(1)}% ${pt.y.toFixed(1)}%, ${stops})`;
        }).join(", ");
    }
    
    set(cssValue) {
        // Bu kısım, çoklu radyal gradyanları ayrıştırmak için daha karmaşık bir mantık gerektirir.
        // Şimdilik, sadece ilk gradyanı ayrıştırmaya çalışalım.
        console.warn("TmultiRadialGradientPicker.set() henüz tam olarak uygulanmadı.");
    }
}
window.TmultiRadialGradientPicker = TmultiRadialGradientPicker;
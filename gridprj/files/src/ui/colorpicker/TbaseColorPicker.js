import { TbasePicker } from './TbasePicker.js';
import { Tcolor } from '../../utils/colorUtils.js';
import { TabsoluteElement } from '../../dom/TabsoluteElement.js';
import { Ealign } from '../../core/enums.js';
import { getContrastColor, translayer, colorNameToHex } from './utils.js';
import { cssProps } from '../../data/cssProperties.js';

export class TbaseColorPicker extends TbasePicker {

    initData(hex) { 
        this.hsva = Tcolor.hexToHsva(hex); 
    }

    buildSpecificUI() {
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = 'display: flex; align-items: flex-start; justify-content: center; gap: 10px;';
        
        const leftCol = document.createElement('div');
        
        this.svCanvas = Object.assign(document.createElement('canvas'), { width: 160, height: 120 });
        this.svCanvas.style.cursor = 'crosshair';
        
        this.hueCanvas = this._buildHueSlider();
        
        leftCol.append(this.svCanvas, this.hueCanvas);

        const rightCol = document.createElement('div');
        
        const previewRow = document.createElement('div');
        previewRow.style.cssText = 'display: flex; gap: 4px;';
        
        const rgbaInputs = this._buildRgbaInputs();
        
        previewRow.append(this.previewBox, rgbaInputs);

        const hexInputRow = this._buildHexInput();
        const alphaSliderRow = this._buildAlphaSlider();

        rightCol.append(previewRow, hexInputRow, alphaSliderRow);
        
        mainContainer.append(leftCol, rightCol);
        this.contentPanel.appendChild(mainContainer);

        this.suggestionBox = new TabsoluteElement({
            targetElement: this.hexInput,
            align: Ealign.bottom | Ealign.left | Ealign.right,
            className: 'cp-suggestions',
            style: { fontSize: '10px', background: '#fff', border: '1px solid #ccc', maxHeight: '100px', overflowY: 'auto', width: '120px', zIndex: '1000' }
        });
        this.appendChild(this.suggestionBox);

        this._wireSVEvents();
        this._wireHexRgbaEvents();

        this._drawSVCanvas();
        this._drawHueSlider();
    }

    _buildRgbaInputs() {
        const container = document.createElement('div');
        container.style.cssText = 'font-size:10px; display:flex; flex-direction:column; justify-content:center;';
        ['R', 'G', 'B', 'A'].forEach((ch, i) => {
            const line = document.createElement('div');
            line.style.cssText = 'display:flex; align-items:center; margin-bottom:2px;';
            const lbl = Object.assign(document.createElement('label'), { textContent: ch + ':', style: 'width:22px' });
            const inp = Object.assign(document.createElement('input'), { type: 'number', style: 'width:40px' });
            if (i === 3) { inp.min = 0; inp.max = 1; inp.step = 0.01; } else { inp.min = 0; inp.max = 255; }
            line.append(lbl, inp);
            container.appendChild(line);
            this[ch.toLowerCase() + 'Input'] = inp;
        });
        return container;
    }
    _buildHexInput() {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; font-size:10px; margin-top:4px';
        row.innerHTML = '<label style="width:32px">Hex:</label>';
        this.hexInput = Object.assign(document.createElement('input'), { type: 'text', style: 'width:93px' });
        row.appendChild(this.hexInput);
        return row;
    }

    _buildAlphaSlider() {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; font-size:10px; margin-top:4px';
        row.innerHTML = '<label style="width:32px">Alpha:</label>';
        this.alphaSlider = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1, step: 0.01, style: 'width:100px' });
        row.appendChild(this.alphaSlider);
         this.alphaSlider.oninput = _=>{
      this.hsva.a = parseFloat(this.alphaSlider.value);
      this.updatePreview(); this._drawSVCanvas();
    };
        return row;
    }
    _wireSVEvents() {
        const act = e => {
            const rect = this.svCanvas.getBoundingClientRect();
            const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
            const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
            this.hsva.s = x / rect.width;
            this.hsva.v = 1 - y / rect.height;
            this.updatePreview();
            this._drawSVCanvas();
        };
        this.svCanvas.onmousedown = e => {
            act(e);
            const mv = ev => act(ev);
            const up = () => {
                window.removeEventListener('mousemove', mv);
                window.removeEventListener('mouseup', up);
            };
            window.addEventListener('mousemove', mv);
            window.addEventListener('mouseup', up, { once: true });
        };
    }

    _buildHueSlider() {
        const canvas = document.createElement('canvas');
        canvas.width = 160; canvas.height = 20;
        const ctx = canvas.getContext('2d');
        this._drawHueSlider = () => {
            ctx.clearRect(0, 0, 160, 20);
            const g = ctx.createLinearGradient(0, 0, 160, 0);
            g.addColorStop(0, '#f00'); g.addColorStop(.17, '#ff0'); g.addColorStop(.33, '#0f0');
            g.addColorStop(.5, '#0ff'); g.addColorStop(.67, '#00f'); g.addColorStop(.83, '#f0f');
            g.addColorStop(1, '#f00');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 160, 20);
            const x = (this.hsva.h / 360) * 160;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2, 0, 4, 20);
        };
        const act = e => {
            const r = canvas.getBoundingClientRect();
            let h = (e.clientX - r.left) / 160 * 360;
            h = Math.min(Math.max(h, 0), 360);
            this.hsva.h = h;
            this._drawHueSlider();
            this.updatePreview();
            this._drawSVCanvas();
        };
        canvas.onmousedown = e => {
            act(e);
            const mv = ev => act(ev);
            const up = () => {
                window.removeEventListener('mousemove', mv);
                window.removeEventListener('mouseup', up);
            };
            window.addEventListener('mousemove', mv);
            window.addEventListener('mouseup', up, { once: true });
        };
        return canvas;
    }

   _wireHexRgbaEvents() {
        const upd = () => {
            const r = +this.rInput.value || 0, g = +this.gInput.value || 0, b = +this.bInput.value || 0;
            const a = parseFloat(this.aInput.value);
            this.hsva = Tcolor.rgbToHsva(r, g, b, isNaN(a) ? 1 : a);
            this.updatePreview();
            this._drawSVCanvas();
            this._drawHueSlider();
        };
        [this.rInput, this.gInput, this.bInput, this.aInput].forEach(inp => inp.onchange = upd);

        this.hexInput.addEventListener('change', () => {
            const val = this.hexInput.value.trim();
            if (!val) return;
            const hex = colorNameToHex(val); // Renk ismini HEX'e çevir
            this.hsva = Tcolor.hexToHsva(hex);
            this.updatePreview(); this._drawSVCanvas(); this._drawHueSlider();
        });
        this.hexInput.addEventListener('input', () => this._updateHexSuggestions());
        this.hexInput.addEventListener('blur', () => setTimeout(() => this.suggestionBox.hide(), 200));
    }

    _updateHexSuggestions() {
        const q = this.hexInput.value.trim().toLowerCase();
        if (!q) { this.suggestionBox.hide(); return; }
        
        const sug = cssProps.colorNames.filter(color => color.toLowerCase().startsWith(q));
        
        this.suggestionBox.htmlObject.innerHTML = '';
        sug.forEach(col => {
            const div = document.createElement('div');
            div.textContent = col;
            div.style.cssText = 'padding:4px; cursor:pointer;';
            const hex = colorNameToHex(col);
            div.style.background = hex;
            div.style.color = getContrastColor(hex);
            div.onmousedown = e => {
                e.preventDefault();
                this.hexInput.value = hex;
                this.hsva = Tcolor.hexToHsva(hex);
                this.updatePreview(); this._drawSVCanvas(); this._drawHueSlider();
                this.suggestionBox.hide();
            };
            this.suggestionBox.appendChild(div);
        });
        sug.length ? this.suggestionBox.popup() : this.suggestionBox.hide();
    }

    _drawSVCanvas() {
        const ctx = this.svCanvas.getContext('2d');
        const w = this.svCanvas.width, h = this.svCanvas.height;
        ctx.fillStyle = `hsl(${this.hsva.h},100%,50%)`;
        ctx.fillRect(0, 0, w, h);
        const white = ctx.createLinearGradient(0, 0, w, 0);
        white.addColorStop(0, '#fff'); white.addColorStop(1, 'transparent');
        ctx.fillStyle = white; ctx.fillRect(0, 0, w, h);
        const black = ctx.createLinearGradient(0, 0, 0, h);
        black.addColorStop(0, 'transparent'); black.addColorStop(1, '#000');
        ctx.fillStyle = black; ctx.fillRect(0, 0, w, h);
    }
    
    updatePreview() {
        const rgbaStr = Tcolor.hsvaToRgba(this.hsva);
        translayer.setForeColor(rgbaStr, this.previewBox);

        if (this.targetElement && this.targetStyle) {
            this.targetElement.style[this.targetStyle] = rgbaStr;
        }
        
        const rgb = Tcolor.hsvaToRgb(this.hsva);
        this.rInput.value = rgb.r;
        this.gInput.value = rgb.g;
        this.bInput.value = rgb.b;
        this.aInput.value = this.hsva.a.toFixed(2);
        this.alphaSlider.value = this.hsva.a;
        this.hexInput.value = Tcolor.rgbToHex(rgb.r, rgb.g, rgb.b);
        
        this.onChange(rgbaStr);
    }
}
window.TbaseColorPicker = TbaseColorPicker;


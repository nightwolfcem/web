
import { TbasePicker } from './TbasePicker.js';
import { TsingleColorPicker } from './TsingleColorPicker.js';
import { translayer } from './utils.js';

export class TbaseGradientPicker extends TbasePicker {
   initData() {
    this.gradientAngle = 0;
    this.centerPos     = {x:50,y:50};
    this.selectedFunction = 'linear-gradient()';
    this.stops = [
      {color:'#f00',position:0},{color:'#00f',position:100}
    ];
  }

  buildSpecificUI() {
    /* ---- Liner bar -------------------------------------------------- */
    this.linerBar = Object.assign(document.createElement('div'),{
      style:'position:relative;width:calc(100% - 40px);left:5px;height:30px;margin:6px auto;cursor:pointer;'
    });
   
    this.contentPanel.appendChild(this.previewBox);
   
    this.previewBox.style.width = '110px';
    this.previewBox.style.height = '110px';
    this.previewBox.style.margin = '0';
    this.linerBar.onclick = e=>{ if(e.target===this.linerBar) this.addStop(e); };

    /* ---- Açı & Merkez seçiciler + fonksiyon buton grid’i ------------ */
    this.buildAngleSelector();    // orijinal kodunuzdan kopya
    this.buildPosSelector();      // orijinal kodunuzdan kopya
    this.buildFunctionGrid();     // linear/radial/conic düğmeleri
    this.renderStopButtons();
      this.contentPanel.appendChild(this.linerBar);
  }
buildFunctionGrid() {
  /* 1 ·  Alt panel yoksa oluştur */
  if (!this.altPanel) {
    this.altPanel = Object.assign(document.createElement('div'), {
      style:'display:inline-block;vertical-align:top;margin-left:8px;'
    });
    this.contentPanel.appendChild(this.altPanel);
  }

  /* 2 ·  Fonksiyon listesi (dilerseniz kısaltabilirsiniz) */
  this.functions = [
    "linear-gradient()",      "radial-gradient()",      "conic-gradient()",
    "repeating-linear-gradient()",  "repeating-radial-gradient()",
    "repeating-conic-gradient()"
  ];

  /* 3 ·  Grid kutusu */
  this.fnPanel = Object.assign(document.createElement('div'), {
    style:'display:grid;grid-template-columns:repeat(3,1fr);gap:5px;'
  });
  this.altPanel.appendChild(this.fnPanel);

  /* 4 ·  Her fonksiyon için ön-izleme kareleri */
  this.functions.forEach(fn => {
    const btn = Object.assign(document.createElement('div'), {
      style:'width:50px;height:50px;border:1px solid #ccc;cursor:pointer;'
    });
    btn.onclick = _ => {
      this.selectedFunction = fn;
      this.updatePreview();    // büyük ön-izlemeyi güncelle
      this.updateAltPanel();   // butonlardaki border’ı yenile
    };
    this.fnPanel.appendChild(btn);
  });

  /* 5 ·  İlk renk doldurma + seçim çerçevesi */
  this.updateAltPanel();
}

/* ------------------------------------------------------------
   Fonksiyon gridindeki kareleri renklendir + seçiliyi vurgula
------------------------------------------------------------ */
updateAltPanel() {
  if (!this.fnPanel) return;
  Array.from(this.fnPanel.children).forEach((btn, i) => {
    const css = this.toCss(this.functions[i]);          // küçük ön-izleme
    translayer.setForeColor(css, btn);
    btn.style.border = this.functions[i] === this.selectedFunction
      ? "3px solid aquamarine"
      : "1px solid #ccc";
  });
}
  getStops() { return this.stops; }            // alt sınıflar override edebilir
  setStops(s){ this.stops = s; }

renderStopButtons() {
  function makeStopButtons(bar, stops, cfg = {}) {
  bar.innerHTML = "";                               // eski düğmeleri sil

  stops.forEach((stop, idx) => {
    /* düğme kabuğu --------------------------------------------------- */
    const btn = document.createElement("div");
    btn.style.cssText = `
      position:absolute;left:calc(${stop.position}% - 8px);top:15px;
      width:16px;height:20px;cursor:pointer;`;
    /* alt ok üçgeni */
    btn.innerHTML =
      '<div style="width:0;height:0;border-left:8px solid transparent;' +
      'border-right:8px solid transparent;border-bottom:8px solid #000"></div>' +
      `<div style="width:100%;height:12px;border:1px solid #000;background:${stop.color};box-sizing:border-box;"></div>`;

    /* --- DRAG ------------------------------------------------------- */
    btn.onmousedown = e => {
      e.stopPropagation();
      const rect = bar.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, init = stop.position;

      const mv = ev => {
        const dX = ev.clientX - sx,
              dY = ev.clientY - sy;

        /* yukarı/aşağı 20 px’ten fazla → sil */
        if (Math.abs(dY) > 20 && stops.length > 2) {
          cfg.onRemove?.(idx);
          window.removeEventListener("mousemove", mv);
          return;
        }

        /* yatay sürükle → konum güncelle */
        let p = init + (dX / rect.width) * 100;
        p = Math.max(0, Math.min(100, p));
        stop.position = p;
        btn.style.left = `calc(${p}% - 8px)`;
        cfg.onMove?.(idx, p);
   
      };

      window.addEventListener("mousemove", mv);
      window.addEventListener("mouseup",
        _=> window.removeEventListener("mousemove", mv), { once:true });
    };

    /* --- ÇİFT TIK → renk seçici ------------------------------------ */
    btn.ondblclick = e => {
      e.stopPropagation();
      cfg.openColorPicker?.(idx, e.clientX, e.clientY, stop.color);
    };

    bar.appendChild(btn);
  });
}
  makeStopButtons(this.linerBar, this.getStops(), {
    onMove  : _ => { this.updateLinerBar();      this.updatePreview(); this.updateAltPanel(); },
    onRemove: i => { this.getStops().splice(i,1);
                     this.renderStopButtons();      this.updatePreview(); this.updateAltPanel(); },
    openColorPicker:(i,x,y,col)=>this.openColorPicker(i,x,y,col)
  });
  this.updateLinerBar();
}

  openColorPicker(idx,x,y,initCol){

  let clrpckr=  new TsingleColorPicker({
      defaultColor:initCol,
      layerName:'modal',
      align:"center+middle+inset",
      title:`Stop ${idx+1} Color`,
      onChange:c=>{
        this.getStops()[idx].color=c;
        this.renderStopButtons(); this.updatePreview();
      },
      onClose:()=>clrpckr.destroy()
    });
    clrpckr.body();
    clrpckr.showModal("screen");
  }

  updatePreview(){
    const css = this.toCss(this.selectedFunction);
    translayer.setForeColor(css, this.previewBox);
    if(this.targetElement && this.targetStyle)
      this.targetElement.style[this.targetStyle]=css;
    if(this.targetInput) this.targetInput.value=css;
     this.#refreshSelectors();
    this.onChange(css);
  }

  toCss(fn) {
  const stops = [...this.getStops()]
      .sort((a, b) => a.position - b.position)
      .map(s => `${s.color} ${Math.round(s.position)}%`).join(", ");

  if (/linear/.test(fn))
    return fn.replace("()", `(${this.gradientAngle}deg, ${stops})`);
  if (/conic/.test(fn))
    return fn.replace("()", `(from ${this.gradientAngle}deg at ${this.centerPos.x}% ${this.centerPos.y}%, ${stops})`);
  if (/radial/.test(fn))
    return fn.replace("()", `(circle at ${this.centerPos.x}% ${this.centerPos.y}%, ${stops})`);
  /* repeating-* türleri de yukarıdakiyle aynı kurguya düşecektir */
  return fn.replace("()", `(${stops})`);
}

/* ------------------------------------------------------------
   LinerBar’ın arka planını (küçük ön-izleme) güncelle
------------------------------------------------------------ */
updateLinerBar() {
  if (!this.linerBar) return;               // (tek renk picker’ında yok)
  const stops = [...this.getStops()]
      .sort((a, b) => a.position - b.position)
      .map(s => `${s.color} ${Math.round(s.position)}%`).join(", ");
  translayer.setForeColor(`linear-gradient(90deg, ${stops})`, this.linerBar);
}

/* ------------------------------------------------------------
   Açı seçici bileşeni oluştur ve sürükleme bağla
------------------------------------------------------------ */
buildAngleSelector() {
  this.dirSelector = Object.assign(document.createElement("div"), {
    style: `
      position:absolute;left:50%;top:50%;
      width:40px;height:40px;margin:-20px 0 0 -20px;
      border:3px solid rgba(0,0,0,.6);border-radius:50%;
      background:rgba(255,255,255,.4);backdrop-filter:blur(2px);
      cursor:pointer;user-select:none;
    `
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
    this.dirDot.style.top  = `${cen + r * Math.sin(rad) - 6}px`;
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
#refreshSelectors(){
      const f=this.selectedFunction;
      const angle=/linear|conic/.test(f);
      const pos  =/radial|conic/.test(f);
      this.dirSelector.style.display=angle?"block":"none";
      this.posSelector.style.display=pos?"block":"none";
    }
/* ------------------------------------------------------------
   Merkez (x%, y%) seçici bileşeni oluştur ve sürükleme bağla
------------------------------------------------------------ */
buildPosSelector() {
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
      const y = Math.max(0, Math.min(ev.clientY - box.top , box.height));
      this.centerPos.x = (x / box.width)  * 100;
      this.centerPos.y = (y / box.height) * 100;
      this.posSelector.style.left = `${this.centerPos.x}%`;
      this.posSelector.style.top  = `${this.centerPos.y}%`;
      this.updatePreview(); this.updateAltPanel();
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", _=> window.removeEventListener("mousemove", mv), { once:true });
  };

  this.posSelector.onmousedown = start;
  this.previewBox.onmousedown    = e => { if (e.target === this.previewBox) start(e); };

  /* başlangıç konumu */
  this.posSelector.style.left = `${this.centerPos.x}%`;
  this.posSelector.style.top  = `${this.centerPos.y}%`;
}

/* ------------------------------------------------------------
   LinerBar’a tıklayınca yeni stop ekle
------------------------------------------------------------ */
addStop(e) {
  const rect = this.linerBar.getBoundingClientRect();
  const pos  = ((e.clientX - rect.left) / rect.width) * 100;
  this.getStops().push({ color: "#ffffff", position: pos });
  this.renderStopButtons(); this.updatePreview();
}
}

window.TbaseGradientPicker = TbaseGradientPicker;

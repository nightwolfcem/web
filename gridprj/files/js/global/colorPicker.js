// TcolorPicker sınıfı: Tamamen JavaScript ile kendi DOMunu oluşturan colorpicker.
(()=>{
  const cssColorNames = [
  "AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure","Beige", "Bisque", "Black", "BlanchedAlmond", "Blue",
  "BlueViolet", "Brown", "BurlyWood", "CadetBlue", "Chartreuse","Chocolate", "Coral", "CornflowerBlue", "Cornsilk", "Crimson",
  "Cyan", "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray","DarkGrey", "DarkGreen", "DarkKhaki", "DarkMagenta", "DarkOliveGreen",
  "DarkOrange", "DarkOrchid", "DarkRed", "DarkSalmon", "DarkSeaGreen","DarkSlateBlue", "DarkSlateGray", "DarkSlateGrey", "DarkTurquoise", "DarkViolet",
  "DeepPink", "DeepSkyBlue", "DimGray", "DimGrey", "DodgerBlue","FireBrick", "FloralWhite", "ForestGreen", "Fuchsia", "Gainsboro",
  "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey","Green", "GreenYellow", "HoneyDew", "HotPink", "IndianRed",
  "Indigo", "Ivory", "Khaki", "Lavender", "LavenderBlush","LawnGreen", "LemonChiffon", "LightBlue", "LightCoral", "LightCyan",
  "LightGoldenRodYellow", "LightGray", "LightGrey", "LightGreen", "LightPink","LightSalmon", "LightSeaGreen", "LightSkyBlue", "LightSlateGray", "LightSlateGrey",
  "LightSteelBlue", "LightYellow", "Lime", "LimeGreen", "Linen","Magenta", "Maroon", "MediumAquaMarine", "MediumBlue", "MediumOrchid",
  "MediumPurple", "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise", "MediumVioletRed", "MidnightBlue", "MintCream", "MistyRose", "Moccasin",
  "NavajoWhite", "Navy", "OldLace", "Olive", "OliveDrab","Orange", "OrangeRed", "Orchid", "PaleGoldenRod", "PaleGreen",
  "PaleTurquoise", "PaleVioletRed", "PapayaWhip", "PeachPuff", "Peru", "Pink", "Plum", "PowderBlue", "Purple", "RebeccaPurple",
  "Red", "RosyBrown", "RoyalBlue", "SaddleBrown", "Salmon","SandyBrown", "SeaGreen", "SeaShell", "Sienna", "Silver",
  "SkyBlue", "SlateBlue", "SlateGray", "SlateGrey", "Snow","SpringGreen", "SteelBlue", "Tan", "Teal", "Thistle",
  "Tomato", "Turquoise", "Violet", "Wheat", "White","WhiteSmoke", "Yellow", "YellowGreen"
];
/*function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src$="${src}"]`)) {
      resolve();
      return;
    }
    const currentScript = document.currentScript.src;
    const scriptURL = new URL(currentScript);
    scriptURL.pathname = scriptURL.pathname.replace(/[^\/]*$/, 'dom.js');
    const newScript = document.createElement('script');
    newScript.src = scriptURL.href;
    newScript.onload = resolve;
    newScript.onerror = reject;
    document.head.appendChild(newScript);
 
  });
}
await loadScript("dom.js");*/
function getContrastColor(hex) {
  if(hex.charAt(0) === "#") {
    hex = hex.slice(1);
  }
  // R, G, B değerlerini 0-255 arası elde ediyoruz.
  const r = parseInt(hex.substr(0,2), 16);
  const g = parseInt(hex.substr(2,2), 16);
  const b = parseInt(hex.substr(4,2), 16);
  // Parlaklık hesabı için formül: (r*299 + g*587 + b*114) / 1000
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  // Parlaklık 128'den büyükse koyu metin (siyah), değilse açık metin (beyaz)
  return brightness > 128 ? "#000" : "#fff";
}

function createTransparencyPattern(size = 10, color1 = '#fff', color2 = '#ccc') {
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, size * 2, size * 2);
  
  ctx.fillStyle = color2;
  ctx.fillRect(0, 0, size, size);
  ctx.fillRect(size, size, size, size);
  
  return canvas;
}

class BackgroundLayers {
  constructor() {
    this.layers = [];
  }

  /**
   * Layer ekler.
   * @param {string} input - Renk (hex veya rgba), gradient veya URL olabilir
   */
  addLayer(input) {
    const layer = this.parseLayer(input);
    if (layer.isUrl) {
      this.layers.push(layer); // URL en alta
    } else {
      // URL'lerden önce en son sıraya ekle (yani en üste gelsin)
      const urlIndex = this.layers.findIndex(l => l.isUrl);
      if (urlIndex === -1) {
        this.layers.push(layer);
      } else {
        this.layers.splice(urlIndex, 0, layer); // URL'lerin hemen üstü
      }
    }
  }

  insertLayer(index, input) {
    const layer = this.parseLayer(input);
    if (layer.isUrl) {
      this.layers.push(layer); // yine en alta gider
    } else {
      const urlIndex = this.layers.findIndex(l => l.isUrl);
      if (urlIndex === -1 || index < urlIndex) {
        this.layers.splice(index, 0, layer);
      } else {
        this.layers.splice(urlIndex, 0, layer);
      }
    }
  }

  removeLayer(index) {
    this.layers.splice(index, 1);
  }

  /**
   * CSS background özelliğini döndürür
   */
  layerToStr() {
    return this.layers.map(l => l.value).join(', ');
  }

  /**
   * Girişe göre uygun formatlı layer döner
   */
  parseLayer(input) {
    const trimmed = input.trim();
    const isUrl = /^https?:\/\//.test(trimmed) || trimmed.startsWith('url(');
    const isGradient = trimmed.includes('gradient(');
    const isRgba = /^rgba?\(/.test(trimmed);
    const isColor = /^#|^[a-zA-Z]+$/.test(trimmed);

    let value = '';
    if (isUrl) {
      value = trimmed.startsWith('url(') ? trimmed : `url("${trimmed}")`;
    } else if (isGradient) {
      value = trimmed;
    } else if (isRgba) {
      value = `linear-gradient(${trimmed}, ${trimmed})`;
    } else if (isColor) {
      value = `linear-gradient(${trimmed}, ${trimmed})`;
    } else {
      throw new Error(`Tanımlanamayan layer: ${input}`);
    }

    return {
      raw: input,
      isUrl,
      value
    };
  }
}
let transparencyPattern = `url(${createTransparencyPattern().toDataURL()})`;
let translayer = new BackgroundLayers();
translayer=new BackgroundLayers();
translayer.addLayer(transparencyPattern);
translayer.setForeColor=function(color,element)
{
  let str=translayer.parseLayer(color);
  if(translayer.layers.length==1){
    translayer.layers.unshift(str);
  }else
  translayer.layers[0]=str;
  element.style.background= this.layerToStr();
}

window.TsingleColorPicker = class TsingleColorPicker extends Telement {
  /**
 * @param {Object} param0
 * @param {HTMLElement} [param0.targetElement] - Renk atanacak hedef element.
 * @param {string} [param0.targetStyle="backgroundColor"] - Güncellenecek CSS özelliği.
 * @param {HTMLInputElement} [param0.targetInput] - Güncellenecek input elemanı.
 * @param {string} [param0.defaultColor="#ff0000"] - Default renk.
 * @param {function} [param0.onChange] - Değişim callback'i.
 * @param {function} [param0.onClose] - Değişim callback'i.
 * @param {HTMLElement} [param0.container] - Alternatif parent.
 * @param {string} [param0.captionText="Single Color Picker"] - Baslık
 */
  constructor({
   
    targetElement = null,
    targetStyle = "backgroundColor",
    targetInput = null,
    defaultColor = "#ff0000",
    onChange = null,
    onClose = null,
    container = null,
    ...otherOptions} 
  = {}) {
    super("div",{...otherOptions});
    this.targetElement = targetElement;
    this.targetStyle = targetStyle;
    this.targetInput = targetInput;
    this.defaultColor = defaultColor || "#ff0000";
    this.onChange = typeof onChange === "function" ? onChange : () => {};
    this.onClose = typeof onClose === "function" ? onClose : () => {};
   
     this.defineProp("captionText",  () =>this.caption?this.caption.innerText:"" , (val) =>{if(this.caption){this.caption.innerText=`<span>${val}</span>`;}});
    let detectedColor =
      (this.targetInput && this.targetInput.value) ||
      (this.targetElement && getComputedStyle(this.targetElement)[this.targetStyle]) ||
      defaultColor || "#ff0000";
    this.defaultColor = this.toHex(detectedColor);
    this.hsva = this.hexToHsva(this.defaultColor);
    this.body(container);
    this.updateUI();
  }

  body(parent) {
    super.body(parent);
    this.cpContainer = this.htmlObject;
    Object.assign(this.cpContainer.style, {
      border: "1px solid #ccc",
      width:  "340px",
      height: "220px",
      userSelect: "none",
      backgroundColor: "#f6f6f6",
      position: "absolute",
      boxShadow: "2px 2px 6px rgba(0,0,0,0.2)"
    });

    if(!parent)
    {this.caption = document.createElement("div");
    Object.assign(this.caption.style, {
      background: "rgb(56,35,69)",
      color: "#fff",
      padding: "4px 8px",
      cursor: "move",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    });
    this.caption.innerHTML = "<span>TsingleColorPicker</span>";
    const closeBtn = document.createElement("span");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontWeight = "bold";
    closeBtn.addEventListener("mousedown", () => {
      this.status.visible = false;
      if (this.onClose) this.onClose();
    });
    this.caption.appendChild(closeBtn);
    this.cpContainer.appendChild(this.caption);
    this.moveHandle = this.caption;
    this.status.movable = true;}

    // --- ANA FLEX ROW ---
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "flex-start";
    //row.style.gap = "10px";

    // Sol kolon
    const leftCol = document.createElement("div");
    leftCol.style.display = "flex";
    leftCol.style.flexDirection = "column";
    //leftCol.style.gap = "8px";

    // SV Canvas
    this.svCanvas = document.createElement("canvas");
    this.svCanvas.width = 160;
    this.svCanvas.height = 120;
      this.svCanvas.style.paddingTop="10px";
    Object.assign(this.svCanvas.style, {
      cursor: "crosshair", display: "block"
    });
    leftCol.appendChild(this.svCanvas);

    // Hue Canvas
    this.hueCanvas = this._buildHueSlider();
    this.hueCanvas.width = 200;
    this.hueCanvas.height = 20;
    leftCol.appendChild(this.hueCanvas);

    // Sağ kolon
    const rightCol = document.createElement("div");
    rightCol.style.display = "flex";
    rightCol.style.flexDirection = "column";

    // RGBA ve Preview kutusu yanyana, dikey olarak hizalı
    const previewAndRgbaRow = document.createElement("div");
    previewAndRgbaRow.style.display = "flex";
    previewAndRgbaRow.style.width = "150px";
    previewAndRgbaRow.style.height = "100px";
    previewAndRgbaRow.style.paddingTop = "10px";

    // Preview kutusu
    this.previewBox = document.createElement("div");
    Object.assign(this.previewBox.style, {
      width: "56px", height: "56px",
      border: "1px solid #000",
      marginBottom: "6px",
      background: translayer.layerToStr()
    });
    previewAndRgbaRow.appendChild(this.previewBox);

    // RGBA ayrı ayrı
    const rgbaCol = document.createElement("div");
    rgbaCol.style.width = "70px";
    rgbaCol.style.paddingLeft = "5px";

    // R, G, B, A satırları
    ["R", "G", "B", "A"].forEach((ch, i) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.paddingBottom = "2px";
      const label = document.createElement("label");
      label.style.fontSize = "10px";
      label.style.width = "32px";
      label.textContent = ch + ":";
      row.appendChild(label);
      const input = document.createElement("input");
      input.type = "number";
      input.style.width = "36px";
      input.min = i === 3 ? 0 : 0;
      input.max = i === 3 ? 1 : 255;
      if (i === 3) input.step = "0.01";
      rgbaCol.appendChild(row);
      row.appendChild(input);
      // Bağlantıları kaydet:
      if (ch === "R") this.rInput = input;
      if (ch === "G") this.gInput = input;
      if (ch === "B") this.bInput = input;
      if (ch === "A") this.aInput = input;
    });
    previewAndRgbaRow.appendChild(rgbaCol);

    rightCol.appendChild(previewAndRgbaRow);

    // HEX
    const hexRow = document.createElement("div");
    hexRow.style.display = "flex";
    hexRow.style.alignItems = "center";
    hexRow.style.paddingBottom = "5px";
    const hexLabel = document.createElement("label");
    hexLabel.textContent = "Hex:"; hexLabel.style.fontSize = "10px"; hexLabel.style.width = "32px";
    hexRow.appendChild(hexLabel);
    this.hexInput = document.createElement("input");
    this.hexInput.type = "text"; this.hexInput.style.width = "93px";
    hexRow.appendChild(this.hexInput);
    rightCol.appendChild(hexRow);

    // Alpha slider
    const alphaLabel = document.createElement("label");
    alphaLabel.textContent = "Alpha:";
    alphaLabel.style.fontSize = "10px";
    alphaLabel.style.width = "32px";
    this.alphaSlider = document.createElement("input");
    this.alphaSlider.type = "range";
    this.alphaSlider.min = 0; this.alphaSlider.max = 1; this.alphaSlider.step = 0.01;
    this.alphaSlider.style.width = "130px";
    rightCol.appendChild(alphaLabel);
    rightCol.appendChild(this.alphaSlider);

    // RGBA toplu label (en aşağıda)
   

    row.appendChild(leftCol);
    row.appendChild(rightCol);
    this.cpContainer.appendChild(row);

    // SV alanı eventleri ve diğer eventler...
    // ... (Senin yukarıdaki kodun aynen burada)
    // --- SV Mouse, Alpha, Hex, RGBA, suggestionBox eventleri burada aynı şekilde devam edecek. ---
    this.svCanvas.addEventListener("mousedown", (e) => {
      this.handleSVMouse(e);
      const moveHandler = (ev) => this.handleSVMouse(ev);
      const upHandler = () => {
        window.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseup", upHandler);
      };
      window.addEventListener("mousemove", moveHandler);
      window.addEventListener("mouseup", upHandler);
    });

    this.alphaSlider.addEventListener("input", () => {
      this.hsva.a = parseFloat(this.alphaSlider.value);
      this.updateUI();
    });
   
    
    // Hex giriş eventleri
    this.hexInput.addEventListener("change", () => {
      let hex = this.hexInput.value;
      this.hsva = this.hexToHsva(hex);
      this.updateUI();
      this.drawSVCanvas();
    });
    this.hexInput.addEventListener("input", () => { this.updateHexSuggestions(); });
    this.hexInput.addEventListener("blur", () => {
      setTimeout(() => { this.suggestionBox.style.display="none"; }, 200);
    });
    
 //   this.container.appendChild(this.cpContainer);
    this.drawSVCanvas();
     this._drawHueSlider();
  }
 
  _buildHueSlider() {
    const canvas = document.createElement("canvas");
    canvas.width = 200; canvas.height = 20;
    const ctx = canvas.getContext("2d");
    this._drawHueSlider = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "rgb(255,0,0)");
      gradient.addColorStop(0.17, "rgb(255,255,0)");
      gradient.addColorStop(0.33, "rgb(0,255,0)");
      gradient.addColorStop(0.50, "rgb(0,255,255)");
      gradient.addColorStop(0.67, "rgb(0,0,255)");
      gradient.addColorStop(0.83, "rgb(255,0,255)");
      gradient.addColorStop(1, "rgb(255,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const posX = (this.hsva.h / 360) * canvas.width;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(posX - 2, 0, 4, canvas.height);
    };
    this._drawHueSlider.call(this);
    const updateHue = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let hue = (x / canvas.width) * 360;
      hue = Math.min(Math.max(hue, 0), 360);
      this.hsva.h = hue;
      this._drawHueSlider.call(this);
      this.updateUI();
      this.drawSVCanvas();
    };
    canvas.addEventListener("mousedown", (e) => {
      updateHue(e);
      const moveHandler = (ev) => updateHue(ev);
      const upHandler = () => {
        window.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseup", upHandler);
      };
      window.addEventListener("mousemove", moveHandler);
      window.addEventListener("mouseup", upHandler);
    });
    return canvas;
  }
  
  _buildRgbaInputs() {
    const container = document.createElement("div");
    container.style.display = "flex"; 
    container.style.alignItems = "center"; 
    container.style.marginBottom = "8px";
    const label = document.createElement("label");
    label.textContent = "RGBA:"; label.style.fontSize = "10px"; label.style.width = "32px"; label.style.marginRight = "5px";
    container.appendChild(label);
    this.rInput = document.createElement("input"); 
    this.rInput.type = "number"; this.rInput.min = 0; this.rInput.max = 255; this.rInput.style.width = "42px";
    container.appendChild(this.rInput);
    this.gInput = document.createElement("input"); 
    this.gInput.type = "number"; this.gInput.min = 0; this.gInput.max = 255; 
    this.gInput.style.width = "42px"; this.gInput.style.marginLeft = "5px";
    container.appendChild(this.gInput);
    this.bInput = document.createElement("input"); 
    this.bInput.type = "number"; this.bInput.min = 0; this.bInput.max = 255; 
    this.bInput.style.width = "42px"; this.bInput.style.marginLeft = "5px";
    container.appendChild(this.bInput);
    this.aInput = document.createElement("input"); 
    this.aInput.type = "number"; this.aInput.min = 0; this.aInput.max = 1; this.aInput.step = 0.01; 
    this.aInput.style.width = "42px"; this.aInput.style.marginLeft = "5px";
    container.appendChild(this.aInput);
    const updateFromRgbaInputs = () => {
      const r = parseInt(this.rInput.value) || 0;
      const g = parseInt(this.gInput.value) || 0;
      const b = parseInt(this.bInput.value) || 0;
      const a = parseFloat(this.aInput.value);
      const newHsva = this.rgbToHsva({ r, g, b }, a);
      this.hsva = newHsva;
      this.updateUI();
      this.drawSVCanvas();
    };
    this.rInput.addEventListener("change", updateFromRgbaInputs);
    this.gInput.addEventListener("change", updateFromRgbaInputs);
    this.bInput.addEventListener("change", updateFromRgbaInputs);
    this.aInput.addEventListener("change", updateFromRgbaInputs);
    return container;
  }
  
  handleSVMouse(e) {
    const rect = this.svCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.hsva.s = Math.min(Math.max(x / this.svCanvas.width, 0), 1);
    this.hsva.v = 1 - Math.min(Math.max(y / this.svCanvas.height, 0), 1);
    this.updateUI();
  }
  
  drawSVCanvas() {
    const ctx = this.svCanvas.getContext("2d");
    const width = this.svCanvas.width, height = this.svCanvas.height;
    ctx.fillStyle = `hsl(${this.hsva.h},100%,50%)`;
    ctx.fillRect(0, 0, width, height);
    const whiteGrad = ctx.createLinearGradient(0, 0, width, 0);
    whiteGrad.addColorStop(0, "rgba(255,255,255,1)");
    whiteGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = whiteGrad; ctx.fillRect(0, 0, width, height);
    const blackGrad = ctx.createLinearGradient(0, 0, 0, height);
    blackGrad.addColorStop(0, "rgba(0,0,0,0)");
    blackGrad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = blackGrad; ctx.fillRect(0, 0, width, height);
  }
  
  updateUI() {
    const rgba = this.hsvaToRgba(this.hsva);
    translayer.setForeColor(rgba, this.previewBox);
    const rgb = this.hsvaToRgb(this.hsva);
    const hex = this.rgbToHex(rgb);
    this.hexInput.value = hex;
    this.rInput.value = rgb.r;
    this.gInput.value = rgb.g;
    this.bInput.value = rgb.b;
    this.aInput.value = this.hsva.a;

    // Hedef element style'ını güncelle
    if (this.targetElement && this.targetStyle)
      this.targetElement.style[this.targetStyle] = rgba;

    // Hedef input'u güncelle
    if (this.targetInput)
      this.targetInput.value = hex;

    // Geri çağrıyı tetikle
    this.onChange(rgba);
  }
  
  updateHexSuggestions() {
    const query = this.hexInput.value.trim().toLowerCase();
    if (!query) { this.suggestionBox.style.display = "none"; return; }
    const suggestions = cssColorNames.filter(color => color.toLowerCase().startsWith(query));
    this.suggestionBox.innerHTML = "";
    suggestions.forEach(sugg => {
      const item = document.createElement("div");
      item.className = "cp-suggestion-item";
      const hexColor = this.colorNameToHex(sugg);
      item.style.backgroundColor = hexColor;
      item.style.color = getContrastColor(hexColor);
      item.style.padding = "5px";
      item.style.cursor = "pointer";
      item.textContent = sugg;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.hexInput.value = hexColor;
        this.hsva = this.hexToHsva(hexColor);
        this.updateUI();
        this.drawSVCanvas();
        this.suggestionBox.style.display = "none";
      });
      this.suggestionBox.appendChild(item);
    });
    this.suggestionBox.style.display = suggestions.length > 0 ? "block" : "none";
  }
  
  // Dönüşüm Metotları
  hexToHsva(hex) {
    if (hex[0] === "#") hex = hex.slice(1);
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) { h = 0; }
    else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s, v, a: 1 };
  }
  
  hsvaToRgb(hsva) {
    const { h, s, v } = hsva;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r1, g1, b1;
    if (h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
  }
  
  hsvaToRgba(hsva) {
    const rgb = this.hsvaToRgb(hsva);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${hsva.a})`;
  }
  
  rgbToHex(rgb) {
    const toHex = v => { let hex = v.toString(16); return hex.length === 1 ? "0" + hex : hex; };
    return "#" + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
  }
  
  rgbToHsva(rgb, a) {
    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) { h = 0; }
    else {
      if (max === r) { h = ((g - b) / d + (g < b ? 6 : 0)); }
      else if (max === g) { h = ((b - r) / d + 2); }
      else { h = ((r - g) / d + 4); }
      h *= 60;
    }
    return { h, s, v, a };
  }
    toHex(color) {
    if (!color) return "#ff0000";
    if (color.startsWith("#")) return color;
    // rgb(…) veya rgba(…) ise
    const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch)
      return (
        "#" +
        [1, 2, 3]
          .map(i => parseInt(rgbMatch[i]).toString(16).padStart(2, "0"))
          .join("")
      );
    return color; // fallback
  }
  colorNameToHex(colorName) {
    const dummy = document.createElement("div");
    dummy.style.color = colorName;
    document.body.appendChild(dummy);
    const computed = getComputedStyle(dummy).color;
    document.body.removeChild(dummy);
    const rgb = computed.match(/\d+/g);
    if (rgb) {
      return "#" + parseInt(rgb[0]).toString(16).padStart(2, "0") +
                  parseInt(rgb[1]).toString(16).padStart(2, "0") +
                  parseInt(rgb[2]).toString(16).padStart(2, "0");
    }
    return colorName;
  }
};


// Örnek kullanım: TsingleColorPicker sınıfını oluşturun


   window.TgradientPicker = class TgradientPicker extends Telement {
  #wireAngleDrag(){
      const cen=20, rDot=20, rLbl=24;
      const refresh=()=>{
        const rad=this.gradientAngle*Math.PI/180;
        this.dirDot.style.left =`${cen+rDot*Math.cos(rad)-6}px`;
        this.dirDot.style.top  =`${cen+rDot*Math.sin(rad)-6}px`;
        this.dirLabel.textContent=`${Math.round(this.gradientAngle)}°`;

      }; refresh();
      this.dirSelector.onmousedown=e=>{
        const box=this.prevBox.getBoundingClientRect();
        const cx=box.left+box.width/2, cy=box.top+box.height/2;
        const mv=ev=>{
          let ang=Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI;
          if(ang<0) ang+=360; this.gradientAngle=ang; refresh();
          this.updatePreview(); this.updateAltPanel();
        };
        window.addEventListener("mousemove",mv);
        window.addEventListener("mouseup",_=>window.removeEventListener("mousemove",mv),{once:true});
        e.stopPropagation();
      };
    }
  
    #wirePosDrag(){
      const start=e=>{
        const box=this.prevBox.getBoundingClientRect();
        const mv=ev=>{
          const x=Math.max(0,Math.min(ev.clientX-box.left,box.width));
          const y=Math.max(0,Math.min(ev.clientY-box.top ,box.height));
          this.centerPos.x=(x/box.width)*100; this.centerPos.y=(y/box.height)*100;
          this.posSelector.style.left=`${this.centerPos.x}%`;
          this.posSelector.style.top =`${this.centerPos.y}%`;
          this.updatePreview(); this.updateAltPanel();
        };
        window.addEventListener("mousemove",mv);
        window.addEventListener("mouseup",_=>window.removeEventListener("mousemove",mv),{once:true});
      };
      this.posSelector.onmousedown=start;
      this.prevBox.onmousedown=e=>{if(e.target===this.prevBox) start(e);};
      this.posSelector.style.left="50%"; this.posSelector.style.top="50%";
    }
  
    /* ─ görünürlük ─ */
    #refreshSelectors(){
      const f=this.selectedFunction;
      const angle=/linear|conic/.test(f);
      const pos  =/radial|conic/.test(f);
      this.dirSelector.style.display=angle?"block":"none";
      this.posSelector.style.display=pos?"block":"none";
    }
  #parseGradientCss(cssStr) {
  // input: örn "linear-gradient(45deg, #f00 0%, #0f0 100%)"
  if(!cssStr) return null;

  // Fonksiyon adını bul
  const fnMatch = cssStr.match(/^([a-zA-Z\-]+-gradient)\s*\((.*)\)$/);
  if(!fnMatch) return null;

  const func = fnMatch[1] + "()"; // örn: "linear-gradient()"
  let args = fnMatch[2].trim();

  // Açıyı/fonksiyon parametrelerini ve stops'ları ayır
  let angle = 0, center = {x:50, y:50}, stops = [];
  let stopsPart = args;

  // linear-gradient için açı kontrolü
  if(func.startsWith("linear-gradient")) {
    const angleMatch = args.match(/^([0-9.]+)deg\s*,\s*/);
    if(angleMatch) {
      angle = parseFloat(angleMatch[1]);
      stopsPart = args.replace(angleMatch[0], "");
    }
  }
  // conic/radial için merkez, açı vb. kontrolü
  else if(func.startsWith("conic-gradient")) {
    // from 70deg at 30% 80%, ...
    const fromAtMatch = args.match(/from\s+([0-9.]+)deg\s+at\s+([0-9.]+)%\s+([0-9.]+)%,/);
    if(fromAtMatch) {
      angle = parseFloat(fromAtMatch[1]);
      center = {x:parseFloat(fromAtMatch[2]), y:parseFloat(fromAtMatch[3])};
      stopsPart = args.replace(fromAtMatch[0], "");
    }
  }
  else if(func.startsWith("radial-gradient")) {
    // circle at x% y%, ...
    const atMatch = args.match(/at\s+([0-9.]+)%\s+([0-9.]+)%,/);
    if(atMatch) {
      center = {x:parseFloat(atMatch[1]), y:parseFloat(atMatch[2])};
      stopsPart = args.replace(atMatch[0], "");
    }
  }

  // stopsPart örn: "#f00 0%, #00f 100%"
  // split, trim
  stops = stopsPart.split(/\s*,\s*/).map(stopStr => {
    // #f00 0%, rgba(255,0,0,0.5) 30%, red, vs.
    const parts = stopStr.match(/^(.+?)(?:\s+([0-9.]+)%?)?$/);
    return {
      color: parts[1].trim(),
      position: parts[2]!==undefined ? parseFloat(parts[2]) : undefined
    };
  });

  // Eksik pozisyonları otomatik dağıt
  let n=stops.length;
  let unspecified = stops.filter(s=>s.position===undefined);
  if(unspecified.length>0) {
    stops.forEach((s,i)=>{
      if(s.position===undefined) s.position = i/(n-1)*100;
    });
  }

  return {
    func,
    angle,
    center,
    stops
  };
}

    
/**
 * @param {Object} param0
 * @param {HTMLElement} [param0.targetElement] - Renk atanacak hedef element.
 * @param {string} [param0.targetStyle="background"] - Güncellenecek CSS özelliği.
 * @param {HTMLInputElement} [param0.targetInput] - Güncellenecek input elemanı.
 * @param {string} [param0.defaultCss] - Direkt gradient CSS stringi (örn: "radial-gradient(circle, #0f0, #f00)").
 * @param {Array} [param0.defaultStops] - Varsayılan gradient durakları.
 * @param {number} [param0.defaultAngle=0] - Varsayılan açı.
 * @param {Object} [param0.defaultCenter={x:50, y:50}] - Varsayılan merkez.
 * @param {string} [param0.selectedFunction] - Seçili gradient fonksiyonu.
 * @param {function} [param0.onChange] - Değişim callback'i.
 * @param {function} [param0.onClose] - Değişim callback'i.
 * @param {HTMLElement} [param0.parent] - Widget'ı gömeceğiniz parent element.
 * @param {HTMLElement} [param0.container] - Alternatif parent.
 */
constructor({
  targetElement = null,
  targetStyle = "background",
  targetInput = null,
  defaultCss = null,
  defaultStops = [{ color: "#f00", position: 0 }, { color: "#00f", position: 100 }],
  defaultAngle = 0,
  defaultCenter = { x: 50, y: 50 },
  selectedFunction = null,
  onChange = null,
   onClose = null,
  parent = null,
  container = null,
  ...otherOptions
} = {}) {
  super();
  
  // CSS'i tespit et
  let detectedCss =
    (targetInput && targetInput.value) ||
    (targetElement && getComputedStyle(targetElement)[targetStyle]) ||
    defaultCss ||
    "linear-gradient(90deg, #f00 0%, #00f 100%)";

  // Varsayılan değerleri gradient string'den otomatik al
  let parsed = this.#parseGradientCss(detectedCss);
  this.selectedFunction = selectedFunction || (parsed ? parsed.func : "linear-gradient()");
  this.gradientAngle = parsed ? parsed.angle : defaultAngle;
  this.centerPos = parsed ? parsed.center : { ...defaultCenter };
  this.stops = parsed ? parsed.stops : JSON.parse(JSON.stringify(defaultStops));

  // Geri kalanı aynı...
  this.onChange = typeof onChange === "function" ? onChange : ()=>{};
   this.onClose = typeof onClose === "function" ? onClose : ()=>{};
  this.targetElement = targetElement;
  this.targetStyle = targetStyle;
  this.targetInput = targetInput;
  this.parent = parent || container;
 this.functions = [
      "linear-gradient()","radial-gradient()","conic-gradient()",
      "repeating-linear-gradient()","repeating-radial-gradient()",
      "repeating-conic-gradient()"
    ];
   

  this.body(this.parent);
  this.updateLinerBar();
  this.updatePreview();
}


    /* ─ UI kurulumu ─ */
    body(parent) {
      super.body(parent);
    this.container = this.htmlObject;

    // Kapsayıcı stilleri
    Object.assign(this.container.style, {
      padding: "8px",
      width: "320px",
      border: "1px solid #666",
      background: "#f6f6f6",
      cursor: "default",
      userSelect: "none"
    });

    // Eğer parent yoksa (pencere olarak davran)
    if (!parent) {
      Object.assign(this.container.style, {
        position: "absolute",
        top: "400px",
        left: "100px",
        boxShadow: "2px 2px 8px rgba(0,0,0,.3)",
      });
      this.caption = document.createElement("div");
      this.caption.textContent = "Gradient Color Picker";
      this.caption.style.cssText =
        "background:linear-gradient(#382345 0%, rgb(246,246,246) 100%);padding:0 8px 8px;" +
        "box-shadow:2px 2px 8px rgba(0,0,0,.3);color:#fff;padding:4px 8px;font-weight:bold;display:flex;" +
        "justify-content:space-between;cursor:move;align-items:center;";
      const cls = document.createElement("span");
      cls.innerHTML = "&times;";
      cls.style.cssText = "cursor:pointer;font-size:18px";
      cls.onmousedown = _ => { this.status.visible=false; if(this.onClose)
      this.onClose();  this.destroy(); };
      this.caption.appendChild(cls);
      this.container.appendChild(this.caption);
      this.moveHandle = this.caption;
      this.status.movable = true;
    }

    // Liner bar
    this.linerBar = Object.assign(document.createElement("div"), {
      style: `position:relative;width:100%;height:30px;margin:12px 0;cursor:pointer;`
    });
    this.linerBar.onclick = e => { if (e.target === this.linerBar) this.addStop(e); };
    this.container.appendChild(this.linerBar);

    // Preview kutusu
    this.prevBox = Object.assign(document.createElement("div"), {
      style: `width:110px;height:110px;border:1px solid #333;position:relative;display:inline-block;margin-right:10px;vertical-align:top;overflow:hidden;`
    });
    this.container.appendChild(this.prevBox);

    // Açı seçici (Angle Selector)
    this.dirSelector = Object.assign(document.createElement("div"), {
      style: `position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border:3px solid rgba(0,0,0,.6);border-radius:50%;background:rgba(255,255,255,.4);backdrop-filter:blur(2px);cursor:pointer;user-select:none;`
    });
    this.dirDot = Object.assign(document.createElement("div"), {
      style: `position:absolute;width:8px;height:8px;border-radius:50%;background:#4cc;border:2px solid #fff;`
    });
    this.dirLabel = Object.assign(document.createElement("div"), {
      style: `position:relative;font-size:10px;color:#000;pointer-events:none;left:10px;top:14px;width:20px;text-align:center;`
    });
    this.dirSelector.append(this.dirDot, this.dirLabel);
    this.prevBox.appendChild(this.dirSelector);
    this.#wireAngleDrag();

    // Pozisyon seçici
    this.posSelector = Object.assign(document.createElement("div"), {
      style: `position:absolute;width:14px;height:14px;border:2px solid #fff;border-radius:50%;background:rgba(0,0,0,.6);cursor:crosshair;transform:translate(-50%,-50%);`
    });
    this.prevBox.appendChild(this.posSelector);
    this.#wirePosDrag();
    this.posSelector.style.left = "50%";
    this.posSelector.style.top = "50%";

    // Alt fonksiyon paneli
    this.altPanel = Object.assign(document.createElement("div"), {
      style: `display:inline-block;vertical-align:top;width:190px;`
    });
    this.fnPanel = Object.assign(document.createElement("div"), {
      style: `display:grid;grid-template-columns:repeat(3,1fr);gap:5px;`
    });
    this.functions.forEach(fn => {
      const p = Object.assign(document.createElement("div"), {
        style: `width:50px;height:50px;border:1px solid #ccc;cursor:pointer;`
      });
      p.onclick = _ => {
        this.selectedFunction = fn; this.updatePreview(); this.updateAltPanel();
      };
      this.fnPanel.appendChild(p);
    });
    this.altPanel.appendChild(this.fnPanel);
    this.container.appendChild(this.altPanel);

    this.renderStopButtons();
  }
 
  
    /* ─ CSS üretimi ─ */
    toCss(fn){
      const stops=[...this.stops].sort((a,b)=>a.position-b.position)
                   .map(s=>`${s.color} ${Math.round(s.position)}%`).join(', ');
      if(/linear/.test(fn))
        return fn.replace("()",`(${this.gradientAngle}deg, ${stops})`);
      if(/conic/.test(fn))
        return fn.replace("()",`(from ${this.gradientAngle}deg at ${this.centerPos.x}% ${this.centerPos.y}%, ${stops})`);
      if(/radial/.test(fn))
        return fn.replace("()",`(circle at ${this.centerPos.x}% ${this.centerPos.y}%, ${stops})`);
      return fn.replace("()",`(${stops})`);
    }
  
    /* ─ güncellemeler ─ */
   updatePreview() {
    const css = this.toCss(this.selectedFunction);
    translayer.setForeColor(css, this.prevBox);

    // Hedef element
    if (this.targetElement && this.targetStyle)
      this.targetElement.style[this.targetStyle] = css;

    // Hedef input
    if (this.targetInput)
      this.targetInput.value = css;

    // Callback
    if(this.onChange)
      this.onChange(css);

    this.#refreshSelectors();
  }
    updateAltPanel(){
      Array.from(this.fnPanel.children).forEach((btn,i)=>{
        translayer.setForeColor(this.toCss(this.functions[i]),btn);
        btn.style.border=this.functions[i]===this.selectedFunction?
          "3px solid aquamarine":"1px solid #ccc";
      });
    }
    updateLinerBar(){
      const css=[...this.stops].sort((a,b)=>a.position-b.position)
                 .map(s=>`${s.color} ${Math.round(s.position)}%`).join(', ');
      translayer.setForeColor(`linear-gradient(90deg, ${css})`,this.linerBar);
    }

  /* ──────────── STOP KONTROLLERİ ──────────── */
 renderStopButtons() {
  this.linerBar.innerHTML = "";
  this.stops.forEach((stop, idx) => {
    // İşaretçi kutu
    const btn = document.createElement("div");
    btn.style.cssText = `
      position: absolute;
      left: calc(${stop.position}% - 8px);
      top: 15px;
      width: 16px; height: 20px;
      cursor: pointer;
    `;

    // Üçgen gösterge (alt ok)
    const tri = document.createElement("div");
    tri.style.cssText = `
      width: 0; height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid #000;
      margin: 0 auto;
    `;

    // Renk kutucuğu
    const rect = document.createElement("div");
    rect.style.cssText = `
      width: 100%; height: 12px;
      background: ${stop.color};
      border: 1px solid #000;
      box-sizing: border-box;
    `;

    btn.append(tri, rect);

    // Drag/detach logic
    btn.onmousedown = e => {
      e.stopPropagation();
      const bar = this.linerBar.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, init = stop.position;
      const move = ev => {
        const dX = ev.clientX - sx, dY = ev.clientY - sy;
        if (Math.abs(dY) > 20 && this.stops.length > 2) {
          // Sürükleyip yukarı/ aşağı atınca sil
          this.stops.splice(idx, 1);
          this.renderStopButtons();
          this.updateLinerBar();
          this.updatePreview();
          this.updateAltPanel && this.updateAltPanel();
          window.removeEventListener("mousemove", move);
          return;
        }
        let p = init + (dX / bar.width) * 100;
        p = Math.max(0, Math.min(100, p));
        stop.position = p;
        btn.style.left = `calc(${p}% - 8px)`;
        this.updateLinerBar();
        this.updatePreview();
        this.updateAltPanel && this.updateAltPanel();
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", _ => {
        window.removeEventListener("mousemove", move);
      }, { once: true });
    };

    // Çift tık renk değiştirici
    btn.ondblclick = e => {
      e.stopPropagation();
      this.openStopColorPicker(idx);
    };

    this.linerBar.appendChild(btn);
  });
}

  addStop(e){
    const bar=this.linerBar.getBoundingClientRect();
    const pos=((e.clientX-bar.left)/bar.width)*100;
    this.stops.push({color:"#ffffff",position:pos});
    this.renderStopButtons(); this.updateLinerBar();
    this.updatePreview(); this.updateAltPanel();
  }

  openStopColorPicker(idx){
    const box=document.createElement("div");
    box.style.cssText="position:absolute;z-index:3000;top:0;left:0;";
    document.body.appendChild(box);
    new TsingleColorPicker({
      container:box,
      defaultColor:this.stops[idx].color,
      onChange:col=>{
        this.stops[idx].color=col;
        this.renderStopButtons(); this.updateLinerBar();
        this.updatePreview(); this.updateAltPanel();
      }
    });
  }
};

window.TmultiRadialGradientPicker = class TmultiRadialGradientPicker extends Telement {
  /**
   * @param {Object} options
   * @param {Array} [options.defaultPoints] - [{x,y,stops:[{color,position},...]}]
   * @param {function} [options.onChange]
   * @param {function} [options.onClose]
   * @param {string}   [options.title]
   * @param {number}   [options.width]
   * @param {number}   [options.height]
   * @param {string}   [options.background]
   * @param {number}   [options.selectedIdx]
   * @param {HTMLElement} [options.parent]
   * @param {HTMLElement} [options.container]
   */
  constructor({
    defaultPoints = [
      { x: 50, y: 50, stops: [
        { color: "#ffd3fb", position: 0 },
        { color: "rgba(255,211,251,0)", position: 35 }
      ]}
    ],
    onChange = null,
    onClose = null,
    title = "Multi Radial Gradient Picker",
    width = 320,
    height = 110,
    background = "#fff",
    selectedIdx = 0,
    parent = null,
    container = null,
    ...otherOptions
  } = {}) {
    super();
    this.points = JSON.parse(JSON.stringify(defaultPoints));
    this.selectedIdx = selectedIdx;
    this.onChange = typeof onChange === "function" ? onChange : null;
    this.onClose  = typeof onClose  === "function" ? onClose  : null;
    this.title = title;
    this.pWidth = width;
    this.pHeight = height;
    this.pBackground = background;
    this.parent = parent || container;
    this.body(this.parent);
    this.updatePreview();
    this.renderStopButtons();
  }

  body(parent) {
    super.body(parent);
    this.container = this.htmlObject;
    Object.assign(this.container.style, {
      padding: "8px",
      width: this.pWidth + "px",
      border: "1px solid #666",
      background: "#f6f6f6",
      cursor: "default",
      userSelect: "none"
    });

    // Caption kısmı
    if (!parent) {
      Object.assign(this.container.style, {
        position: "absolute",
        top: "400px",
        left: "100px",
        boxShadow: "2px 2px 8px rgba(0,0,0,.3)",
      });
      this.caption = document.createElement("div");
      this.caption.textContent = this.title;
      this.caption.style.cssText =
        "background:linear-gradient(#382345 0%, rgb(246,246,246) 100%);padding:0 8px 8px;" +
        "box-shadow:2px 2px 8px rgba(0,0,0,.3);color:#fff;padding:4px 8px;font-weight:bold;display:flex;" +
        "justify-content:space-between;cursor:move;align-items:center;";
      const cls = document.createElement("span");
      cls.innerHTML = "&times;";
      cls.style.cssText = "cursor:pointer;font-size:18px";
      cls.onmousedown = _ => {
        this.status.visible = false;
        if (this.onClose) this.onClose();
      };
      this.caption.appendChild(cls);
      this.container.appendChild(this.caption);
      this.moveHandle = this.caption;
      this.status.movable = true;
    }

    // Preview kutusu (noktalar bu kutunun üstünde olacak)
    this.prevBox = Object.assign(document.createElement("div"), {
      style: `
        width:${this.pWidth-40}px;
        height:${this.pHeight}px;
        border:1px solid #333;
        position:relative;
        display:block;
        margin:10px auto 12px auto;
        vertical-align:top;
        overflow:hidden;
        background:${this.pBackground};
        cursor:crosshair;`
    });
    this.container.appendChild(this.prevBox);

    // Nokta işaretçileri ekle
    this.prevBox.onclick = e => this.handlePreviewClick(e);

    // Liner bar (seçili noktanın stops)
    this.linerBar = Object.assign(document.createElement("div"), {
      style: `position:relative;width:${this.pWidth-40}px;height:30px;margin:8px auto;cursor:pointer;background:#eee;border-radius:4px;`
    });
    this.linerBar.onclick = e => { if (e.target === this.linerBar) this.addStopToSelected(e); };
    this.container.appendChild(this.linerBar);

    // Alt info paneli (isteğe bağlı)
    this.infoPanel = Object.assign(document.createElement("div"), {
      style: `margin:10px 0 0 0;text-align:center;font-size:11px;color:#555;`
    });
    this.container.appendChild(this.infoPanel);

    this.renderPoints();
  }

  // Noktaları ve işaretçilerini renderla
  renderPoints() {
    this.prevBox.innerHTML = "";
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
        let box = this.prevBox.getBoundingClientRect();
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
      this.prevBox.appendChild(dot);
    });
    this.updatePreview();
  }

  // PreviewBox'a tıklayarak yeni nokta ekle
  handlePreviewClick(e) {
    const rect = this.prevBox.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    this.points.push({
      x, y, stops: [
        { color: "#ffd3fb", position: 0 },
        { color: "rgba(255,211,251,0)", position: 35 }
      ]
    });
    this.selectedIdx = this.points.length - 1;
    this.renderPoints();
    this.renderStopButtons();
    this.updatePreview();
  }

  // Seçili noktanın stops'unu linerbar'da göster
  renderStopButtons() {
    this.linerBar.innerHTML = "";
    if (!this.points[this.selectedIdx]) return;
    let stops = this.points[this.selectedIdx].stops;
    stops.forEach((stop, idx) => {
      const btn = document.createElement("div");
      btn.style.cssText = `
        position: absolute;
        left: calc(${stop.position}% - 8px);
        top: 10px;
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

  // LinerBar'ın arka planını stops ile güncelle
  updateLinerBar() {
    if (!this.points[this.selectedIdx]) return;
    let stops = [...this.points[this.selectedIdx].stops]
      .sort((a, b) => a.position - b.position)
      .map(s => `${s.color} ${Math.round(s.position)}%`).join(", ");
    translayer.setForeColor(`linear-gradient(90deg, ${stops})`, this.linerBar);
  }

  // LinerBar'a tıklayınca stop ekle
  addStopToSelected(e) {
    const bar = this.linerBar.getBoundingClientRect();
    const pos = ((e.clientX - bar.left) / bar.width) * 100;
    let stops = this.points[this.selectedIdx].stops;
    stops.push({ color: "#ffffff", position: pos });
    this.renderStopButtons();
    this.updatePreview();
  }

  // CSS gradient oluştur
  getGradientCSS() {
    // Her nokta için radial-gradient oluşturup virgülle birleştir
    return this.points.map(pt => {
      const stops = pt.stops
        .sort((a, b) => a.position - b.position)
        .map(s => `${s.color} ${Math.round(s.position)}%`).join(", ");
      return `radial-gradient(circle at ${pt.x}% ${pt.y}%, ${stops})`;
    }).join(", ");
  }

  // Preview güncelle
  updatePreview() {
    const css = this.getGradientCSS();
    this.prevBox.style.background = css;
    if (this.onChange) this.onChange(css);
    this.updateLinerBar();
  }
};


//radial-gradient(circle at 50% 50%, rgb(255,249,242)  100%), rgb(255,249,242,0) 100%), radial-gradient(circle at 80.9375% 60.55555555555555%, rgb(255,211,251)  17.5%), rgb(255,211,251,0) 35%)
// =========================
// Örnek Kullanım
// =========================
// HTML belgenizde <div id="gradientEditor"></div> oluşturun.
document.addEventListener("DOMContentLoaded", () => {
new TsingleColorPicker({defaultColor: "#ff0000",targetElement:document.getElementById("target"),status:{visible:true} 
  });

  new TgradientPicker({ targetElement:document.getElementById("target"),status:{visible:true} });

  new TmultiRadialGradientPicker({ targetElement:document.getElementById("target"),status:{visible:true}  });
});

function createColorPicker(pickerName = "singleColor", container = null, target, cssProperty = 'background') {
  const pickers = pickerName.split(',').map(p => p.trim());
  const useTabs = pickers.length > 1;

  const mainEl = document.createElement('div');
  Object.assign(mainEl.style, {
    position: 'fixed', top: '50px', left: '50px', width: '360px', padding: '10px',
    border: '1px solid #ddd', background: '#fff', boxShadow: '2px 2px 10px rgba(0,0,0,0.2)',
    zIndex: 9999
  });

  const caption = document.createElement('div');
  caption.textContent = 'Color Picker';
  Object.assign(caption.style, {
    background: '#333', color: '#fff', padding: '5px', marginBottom: '10px', textAlign: 'center', cursor: 'move'
  });

  let pickerContainer = document.createElement('div');

  const applyColor = color => {
    if (target instanceof HTMLInputElement) {
      target.value = color;
    } else {
      target.style[cssProperty] = color;
    }
  };

  const pickerInstances = {};

  const switchPicker = type => {
    pickerContainer.innerHTML = '';
    const pickerOpts = { container: pickerContainer, onChange: applyColor };

    switch (type) {
      case 'singleColor':
        pickerInstances.singleColor = new TsingleColorPicker(pickerOpts);
        pickerInstances.singleColor.visible = true;
        break;
      case 'gradient':
        pickerInstances.gradient = new TgradientPicker(pickerOpts);
        break;
      case 'multiRadialGradient':
        pickerInstances.multiRadialGradient = new TmultiRadialGradientPicker(pickerOpts);
        break;
    }
  };

  if (useTabs) {
    const tabs = document.createElement('div');
    Object.assign(tabs.style, {
      display: 'flex', gap: '5px', marginBottom: '10px', justifyContent: 'center'
    });

    pickers.forEach(pickerType => {
      const tab = document.createElement('div');
      Object.assign(tab.style, {
        width: '40px', height: '20px', cursor: 'pointer', border: '1px solid #ccc'
      });

      if (pickerType === 'singleColor') tab.style.background = '#0f0';
      if (pickerType === 'gradient') tab.style.background = 'linear-gradient(to right, #0f0, #00f)';
      if (pickerType === 'multiRadialGradient') tab.style.background = 'radial-gradient(circle, #0f0, #00f)';

      tab.onclick = () => switchPicker(pickerType);

      tabs.appendChild(tab);
    });

    mainEl.appendChild(tabs);
  }

  mainEl.appendChild(pickerContainer);

  if (!container) container = document.body;
  mainEl.insertBefore(caption, mainEl.firstChild);
  container.appendChild(mainEl);

  switchPicker(pickers[0]);
}


// Example Usage
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("editor");
  const target = document.getElementById("target");

  createColorPicker("singleColor,gradient,multiRadialGradient", container, target);
});

})();
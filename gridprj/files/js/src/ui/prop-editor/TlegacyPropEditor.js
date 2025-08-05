import { DOM } from '../../dom/dom.js';
import { Twindow } from '../Twindow.js';
import { Ealign, Tord } from '../../core/enums.js';
import { onDOMLoad } from '../../core/loader.js';
import { Tcolor, calculateLuminance } from '../../utils/colorUtils.js';
import { cssProps } from '../../data/cssProperties.js';
import { TSplitBar } from '../TSplitBar.js';
import { TControlFactory } from '../style-editor/TControlFactory.js';
import '../../core/prototypes.js';
import { classToObjects } from '../../core/classUtils.js';
import { Tlayer } from '../../dom/Tlayer.js';

// CSSStyleDeclaration üzerinde dönen property isimleri genellikle
// camelCase biçimindedir. cssProps verisi ise tireli (kebab-case)
// anahtarlar içerir. Bu yardımcı fonksiyon, stil isimlerini doğru
// formata çevirerek cssProps ile eşleşmeyi sağlar.
const toKebabCase = (prop) => prop.replace(/([A-Z])/g, '-$1').toLowerCase();

// Renk tanımları cssProps'tan oluşturuluyor
export const Tcolors = cssProps.colorNames.reduce((acc, name) => {
  acc[name] = name;
  return acc;
}, {});


export class TlistEditor {
  constructor(object, property, list) {
    this.htmlObject = document.createElement('select');
    this.htmlObject.style.fontSize = 'inherit';
    Object.keys(list).forEach(key => {
      if (typeof list[key] === 'function') return;
      const option = document.createElement('option');
      option.value = list[key];
      option.text = key;
      this.htmlObject.add(option);
    });
    this.htmlObject.selectedIndex = object[property].index;
    this.htmlObject.onchange = () => {
      const selectedOption = this.htmlObject.options[this.htmlObject.selectedIndex];
      object[property] = selectedOption.value;
    };
  }
}

export class TeditListEditor {
  constructor(object, property, list, placeholder = null) {
    this.object = object;
    this.property = property;
    this.list = list;
    this.placeholder = placeholder;
    this.htmlObject = document.createElement('div');
    this.inputField = this.createInputField();
    this.dropdownButton = this.createDropdownButton();
    this.dropdownMenu = this.createDropdownMenu();
    this.htmlObject.appendChild(this.inputField);
    this.htmlObject.appendChild(this.dropdownButton);
  }

  createInputField() {
    const inputField = document.createElement('input');
    inputField.type = 'text';
    // Borders from the input field were inflating row height and
    // breaking the synchronized scrolling between the keys and
    // values tables.  Use a borderless input and lock the height so
    // each row keeps a consistent size.
    inputField.style.cssText = 'width:100%;height:100%;font-size:inherit;box-sizing:border-box;border:none;margin:0;padding:0;';
    inputField.value = this.object[this.property];
    inputField.onchange = () => {
      this.object[this.property] = inputField.value;
      if (inputField.value !== this.object[this.property]) {
        inputField.value = this.object[this.property];
      }
    };
    return inputField;
  }

  createDropdownButton() {
    const button = document.createElement('span');
    button.innerHTML = '&#9660;';
    button.style.cssText = 'position: relative; left: -15px; cursor: pointer;';
    button.onmousedown = () => {
      this.showDropdownMenu();
      return false;
    };
    return button;
  }

  createDropdownMenu() {
    const menu = document.createElement('div');
    menu.style.cssText = 'z-index:100000; max-height:200px; background-color:#FFF; overflow-y:scroll; overflow-x:hidden; display:none; position:absolute; border: 2px solid rgb(105, 152, 237,0.4);';
    if (this.list === Tcolors && !Tcolors._z) {
      Tcolors._z = menu;
    }
    const isColorList = (this.list === Tcolors && Tcolors._z);
    Object.keys(this.list).forEach((key, index) => {
      if (this.list.hasOwnProperty(key) && key !== '_z') {
        const value = this.list[key];
        const item = this.createDropdownItem(key, value, index, isColorList);
        menu.appendChild(item);
      }
    });
    document.body.appendChild(menu);
    return menu;
  }

  createDropdownItem(key, value, index, isColorList) {
    const item = document.createElement('div');
    item.index = index;
    item.value = value;
    item.innerHTML = key;

    const toHex = (color) => {
      const tmp = document.createElement('div');
      tmp.style.color = color;
      document.body.appendChild(tmp);
      const rgb = getComputedStyle(tmp).color.match(/\d+/g).map(Number);
      tmp.remove();
      return Tcolor.rgbToHex(rgb[0], rgb[1], rgb[2]);
    };
    const getOptimalTextColor = (color) => {
      const hex = toHex(color);
      const lum = calculateLuminance(hex.startsWith('#') ? hex : '#000000');
      return lum > 0.5 ? '#000' : '#FFF';
    };
    if (isColorList) {

      item.style.backgroundColor = value;
      item.style.color = getOptimalTextColor(value);
    }
    item.style.padding = '5px';
    item.style.cursor = 'pointer';
    item.onmouseover = function () {
      this._prevBackground = this.style.backgroundColor;
      this._prevColor = this.style.color;
      this.style.backgroundColor = '#0000FF';
      this.style.color = '#FFF';
    };
    item.onmouseout = function () {
      this.style.backgroundColor = this._prevBackground;
      this.style.color = this._prevColor;
    };
    item.onmousedown = () => {
      this.selectDropdownItem(value);
    };
    return item;
  }

  showDropdownMenu() {
    const rect = this.inputField.getBoundingClientRect();
    this.dropdownMenu.style.left = rect.left + window.scrollX + 'px';
    this.dropdownMenu.style.top = rect.bottom + window.scrollY + 'px';
    this.dropdownMenu.style.display = 'block';
    const hideDropdown = (event) => {
      if (!(this.htmlObject.contains(event.target) || this.htmlObject === event.target)) {
        this.dropdownMenu.style.display = 'none';
        document.removeEventListener('mousedown', hideDropdown);
      }
    };
    document.addEventListener('mousedown', hideDropdown);
  }

  selectDropdownItem(value) {
    this.dropdownMenu.style.display = 'none';
    this.inputField.value = value;
    this.inputField.onchange();
  }
}

export function TtextEditor(bo, bp, pf) {
  var o, t = this;
  t.htmlObject = document.createElement('INPUT');
  o = t.htmlObject;
  // Remove borders and enforce a fixed height so text editors do not
  // expand rows beyond the grid's baseline height.
  o.style.cssText = 'height:100%;width:100%;font-size:inherit;box-sizing:border-box;border:none;margin:0;padding:0;';
  function setText(value) {
    bo[bp] = value;
    if (o.value != bo[bp])
      o.value = bo[bp];
    t.save = true;
  }
  function getText() {
    return o.value;
  }
  o.type = 'TEXT';
  t.save = false;
  if (bo) {
    o.value = bo[bp];
  }
  o.onkeydown = function (e) {
    var key = e.which;
    if (key == 13) {
      setText(o.value);
    } else
      t.save = false;
  };
  o.onblur = function (e) {
    if (!t.save)
      setText(o.value);
  };
}

export function TBooleanEditor(bo, bp, rv) {
  var o, t = this;
  t.htmlObject = document.createElement('INPUT');
  o = t.htmlObject;
  o.style.height = '12px';
  function setCheck(value) {
    o.checked = value;
  }
  function getCheck() {
    return o.checked;
  }
  o.checked = false;
  o.type = 'checkbox';
  if (bo) {
    setCheck(bo[bp]);
  }
  o.onchange = function () {
    bo[bp] = o.checked;
    o.checked = bo[bp];
  };
}

export class Teditbox extends Twindow {
  constructor(caption, width, height) {
    super({ title: caption, width, height });
    this.contentPanel.id = 'codeditor';
    this.onclose = () => {
      let v = this.editor.getValue();
      if (!/function[^\{]*\{\s?\[native code\]\s?\}/.test(v.toString())) {
        try {
          eval('this.obj[this.prop]=' + v);
          this.np.getElementsByTagName('div')[0].getElementsByTagName('div')[0].innerHTML = v.length > 35 ? v.slice(35) + ' ...' : v;
        } catch (e) {
          alert(e.message);
        }
      }
    };
  }
  body(parent) {
    super.body(parent);
    ace.require('ace/ext/language_tools');
    this.editor = ace.edit('codeditor');
    this.editor.setTheme('ace/theme/monokai');
    this.editor.session.setMode('ace/mode/javascript');
    this.editor.setOptions({
      enableBasicAutocompletion: true,
      enableSnippets: true,
      enableLiveAutocompletion: false
    });
  }
}
export let editbox;

export class TpropEditor extends Twindow {
  constructor(width, height) {
    super({ title: 'propeditor', width, height });
this.status.sizable = true;

    var cv, sp, cp, i, z, mc;
    editbox = editbox ? editbox : new Teditbox('Code editor', 400, 400);
    this.tabs = {};
    this.filters = {};
    this.activeTab = 'props';
    this.cntx = null;
    cp = document.createElement('div');
    cp.className = 'cp';
    cp.style.cssText = 'width: 100%;border: 1px inset; box-sizing: border-box;display:inline-block;height: 35px;';
    if (document.getElementById('_propselector') == null) {
      z = document.createElement('select');
      z.id = '_propselector';
      z.style.position = 'absolute';
      z.style.display = 'none';
      document.body.appendChild(z);
    }
    cv = document.createElement('div');
    cv.className = 'propdiv';
    const scrollSpeed = 5;
    let intervalId;
    function scrollContent(direction, element) {
      let scrollPos = element.scrollLeft;
      scrollPos += (direction === 'left' ? -scrollSpeed : scrollSpeed);
      element.scrollLeft = scrollPos;
    }
    function startScrolling(direction, element) {
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        scrollContent(direction, element);
      }, 10);
    }
    function stopScrolling() {
      clearInterval(intervalId);
    }
    cv.addEventListener('mouseleave', stopScrolling);
    cv.addEventListener('mousemove', function (event) {
      var rect = this.getBoundingClientRect();
      var mousePos = event.clientX - rect.left;
      var divWidth = this.offsetWidth;
      if (mousePos <= 10) {
        startScrolling('left', this);
      } else if (mousePos >= divWidth - 10) {
        startScrolling('right', this);
      }
    });

    this.addprop = function (prop, pn, ss) {
      var mx = this.htmlObject.getElementsByClassName('propdiv')[0];
      let s = false;
      if (ss != null) {
        for (let i = 0; i < mx.childNodes.length; i++) {
          if (s) {
            mx.removeChild(mx.childNodes[i]);
            i = i - 1;
          }
          if (mx.childNodes[i] == ss) s = true;
        }
      }
      s = document.createElement('span');
      s.prop = prop;
      s.pname = pn;
      s.innerHTML = pn + '>';
      s.onclick = (e) => {
        if (e.button == 0) {
          let f, pl = document.getElementById('_propselector');
          pl.innerHTML = '';
          f = false;
          for (let i in prop) {
            if (!(/string|function|number|boolean/.test(typeof prop[i])) && prop[i]) {
              if (!f) {
                sp = document.createElement('option');
                sp.disabled = true;
                sp.selected = true;
                sp.value = '';
                sp.text = 'select';
                sp.style.display = 'none';
                pl.add(sp);
              }
              sp = document.createElement('option');
              sp.text = i;
              sp.v = prop[i];
              pl.add(sp, pl.options[null]);
            }
          }
          if (pl.options.length == 1)
            this.addprop(sp.v, sp.text, s);
          else if (pl.options.length != 0) {
            pl.onchange = () => {
              let v = pl.options.item(pl.selectedIndex);
              pl.selectedIndex = -1;
              pl.style.display = 'none';
              this.addprop(v.v, v.text, s);
            };
            pl.onkeyup = (e) => { if (e.key == 'Escape') pl.blur(); };
            pl.onblur = () => { pl.style.display = 'none'; };
            pl.style.display = '';
            pl.focus();
          }
          pl.style.zIndex = this.htmlObject.style.zIndex + 1;
          const r = s.parentNode.getBoundingClientRect();
          pl.style.position = 'absolute';
          pl.style.left = r.left + 'px';
          pl.style.top = (r.bottom + window.scrollY) + 'px';
          this.clear();
          Object.keys(this.tabs).forEach(t => {
            if (t === 'style' && prop.style) this.findsubprops(prop.style, null, t);
            else if (t !== 'style') this.findsubprops(prop, null, t);
          });
        }
      };
      this.clear();
      Object.keys(this.tabs).forEach(t => {
        if (t === 'style' && prop.style) this.findsubprops(prop.style, null, t);
        else if (t !== 'style') this.findsubprops(prop, null, t);
      });
      mx.appendChild(s);
      mx.scrollLeft = 10000;
    };

    this.viewObject = function (obj) {
      var mx = this.htmlObject.getElementsByClassName('propdiv')[0];
      mx.innerHTML = '';
      const ls = document.createElement('span');
      ls.pname = 'Layers';
      ls.innerHTML = 'Layers>';
      ls.onclick = (e) => {
        if (e.button == 0) {
          const pl = document.getElementById('_propselector');
          pl.innerHTML = '';
          const layers = classToObjects(Tlayer) || [];
          if (layers.length) {
            let sp = document.createElement('option');
            sp.disabled = true;
            sp.selected = true;
            sp.value = '';
            sp.text = 'select';
            sp.style.display = 'none';
            pl.add(sp);
            layers.forEach(l => {
              const op = document.createElement('option');
              op.text = l.layerName || l.id;
              op.v = l;
              pl.add(op, pl.options[null]);
            });
            pl.onchange = () => {
              let v = pl.options.item(pl.selectedIndex);
              pl.selectedIndex = -1;
              pl.style.display = 'none';
              this.viewObject(v.v);
            };
            pl.onkeyup = (e) => { if (e.key == 'Escape') pl.blur(); };
            pl.onblur = () => { pl.style.display = 'none'; };
            pl.style.display = '';
            pl.style.zIndex = this.htmlObject.style.zIndex + 1;
            const r = ls.parentNode.getBoundingClientRect();
            pl.style.position = 'absolute';
            pl.style.left = r.left + 'px';
            pl.style.top = (r.bottom + window.scrollY) + 'px';
            pl.focus();
          }
        }
      };
      mx.appendChild(ls);
      this.clear();
      Object.keys(this.tabs).forEach(t => {
        if (t === 'style' && obj.style) this.findsubprops(obj.style, null, t);
        else if (t !== 'style') this.findsubprops(obj, null, t);
      });
      var k, l, list = [];
      k = obj;
      while (k) {
        l = k;
        list.unshift({ obj: k, name: k == document ? 'document' : (k.id ? k.tagName + '(' + k.id + ')' : k.tagName) });
        k = k.parentNode;
      }
      k = l.owner;
      while (k) {
        l = k;
        list.unshift({ obj: k, name: k.name ? k.name : k.constructor.name });
        k = k.owner;
      }
      list.unshift({ obj: window, name: 'window' });
      for (var i = 0; i < list.length; i++) {
        this.addprop(list[i].obj, list[i].name);
      }
    };

    cp.appendChild(cv);
    cv = document.createElement('input');
    cv.className = '_findbar';
    i = this;
    cv.onchange = function () {
      i.filter(this.value);
    };
    cp.appendChild(cv);

    this.contentPanel.appendChild(cp);

    // --- Tab container setup ---
    // Updated tab layout: style properties are split into three
    // dedicated sections.  "style" shows all CSS properties,
    // "stylebox" focuses on box-model related styles like borders
    // and padding, while "animation" lists animation and transition
    // related styles.  The previous "nulls" tab has been removed and
    // null or event handler properties now appear under "events".
    const tabNames = ['style', 'stylebox', 'props', 'functions', 'events', 'animation'];
    this.tabBar = document.createElement('ul');
    this.tabBar.className = 'prop-tab-bar';
    this.tabBar.style.cssText = 'list-style:none;margin:0;padding:0;display:flex;border-bottom:1px solid #ccc;';
    this.contentPanel.appendChild(this.tabBar);

    const tabContainer = document.createElement('div');
    tabContainer.style.cssText = 'width:100%;overflow:hidden;height:calc(100% - 35px);';
    this.contentPanel.appendChild(tabContainer);

    tabNames.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      li.style.cssText = 'padding:4px 8px;cursor:pointer;border-right:1px solid #ccc;';
      li.onclick = () => this.switchTab(name);
      this.tabBar.appendChild(li);

      const area = this.createTabArea();
      area.container.style.display = 'none';
      tabContainer.appendChild(area.container);
      this.tabs[name] = area;
      this.filters[name] = '';
    });

    this.contentPanel.style.fontSize = '12px';
    this.contentPanel.style.overflow = 'hidden';
    this.defobj = window;
    this.maxSubLVL = 3;

    this.switchTab('props');
    // initial render for all tabs.  Tabs that operate on the element's
    // style object (`style`, `stylebox` and `animation`) are populated
    // from `this.defobj.style`, while the others inspect the element
    // itself.
    tabNames.forEach(t => {
      if ((t === 'style' || t === 'stylebox' || t === 'animation') && this.defobj.style) {
        this.findsubprops(this.defobj.style, null, t);
      } else if (t !== 'style' && t !== 'stylebox' && t !== 'animation') {
        this.findsubprops(this.defobj, null, t);
      }
    });


    const hideLargeTable = () => {
      const tbl = this.tabs[this.activeTab].valuesDiv.getElementsByTagName('table')[0];
      if (tbl && tbl.rows.length > 100) tbl.style.display = 'none';
    };
    const showHiddenTable = () => {
      const tbl = this.tabs[this.activeTab].valuesDiv.getElementsByTagName('table')[0];
      if (tbl && tbl.style.display === 'none') tbl.style.display = '';
    };
    this.htmlObject.onresizestart = hideLargeTable;
    this.htmlObject.onresizeend = showHiddenTable;
    this.htmlObject.onwheel = (e) => {
      const ho = this.htmlObject;
      const area = this.tabs[this.activeTab];
      if (e.currentTarget == ho)
        area.keysDiv.scrollTop = area.keysDiv.scrollTop + e.deltaY;
      area.valuesDiv.scrollTop = area.valuesDiv.scrollTop + e.deltaY;
      e.preventDefault();
    };
    this.viewObject(window);
  }

  createTabArea() {
    const cntx = document.createElement('div');
    cntx.style.cssText = 'width:100%;overflow:hidden;height:100%;display:inline-block;background-color:#fefefe;white-space:nowrap';

    const cp = document.createElement('div');
    cp.className = 'prop-keys';
    cp.style.cssText = 'display:inline-block;width:100px;height:100%;overflow:hidden;';
    cp.innerHTML = '<table cellpadding=0 cellspacing=0 style="table-layout:fixed;min-width:100%;border-collapse:collapse;"></table>';

    const splitBar = new TSplitBar('vertical');
    splitBar.onStartMove = () => {
      const ev = new CustomEvent('resizestart');
      if (typeof this.htmlObject.onresizestart === 'function') this.htmlObject.onresizestart(ev);
      this.htmlObject.dispatchEvent(ev);
    };
    splitBar.onEndMove = () => {
      const ev = new CustomEvent('resizeend');
      if (typeof this.htmlObject.onresizeend === 'function') this.htmlObject.onresizeend(ev);
      this.htmlObject.dispatchEvent(ev);
    };
    const sp = splitBar.htmlObject;

    const cv = document.createElement('div');
    cv.className = 'prop-values';
    cv.style.cssText = 'height:100%;width:calc(100% - 105px);display:inline-block;margin-left:3px;vertical-align:top;';
    cv.innerHTML = '<table cellpadding=0 cellspacing=0 style="table-layout:fixed;width:100%;border-collapse:collapse;"></table>';
    cv.onscroll = function () {
      cp.scrollTop = cv.scrollTop;
    };

    cntx.appendChild(cp);
    cntx.appendChild(sp);
    cntx.appendChild(cv);

    return { container: cntx, keysDiv: cp, valuesDiv: cv };
  }

  switchTab(name) {
    if (!this.tabs[name]) return;
    Object.entries(this.tabs).forEach(([t, area]) => {
      area.container.style.display = t === name ? '' : 'none';
    });
    this.activeTab = name;
    this.cntx = this.tabs[name].container;
    this.keysDiv = this.tabs[name].keysDiv;
    this.valuesDiv = this.tabs[name].valuesDiv;
    const findBar = this.htmlObject.getElementsByClassName('_findbar')[0];
    if (findBar) {
      findBar.value = this.filters[name] || '';
    }
    this.filter(this.filters[name] || '');
  }

  clear() {
    Object.values(this.tabs).forEach(area => {
      const tbls = area.container.getElementsByTagName('table');
      if (tbls[1] && tbls[1].getElementsByTagName('tbody')[0]) {
        tbls[1].removeChild(tbls[1].getElementsByTagName('tbody')[0]);
        tbls[0].removeChild(tbls[0].getElementsByTagName('tbody')[0]);
      }
    });
  }

  filter(t) {
    this.filters[this.activeTab] = t;
    const area = this.tabs[this.activeTab];
    const tp = area.container.getElementsByTagName('table')[0];
    const tv = area.container.getElementsByTagName('table')[1];
    const g = new RegExp(t, 'i', 'g');
    for (let i = 0; i < tp.rows.length; i++) {
      tp.rows[i].style._display = tp.rows[i].style.display;
      tv.rows[i].style._display = tp.rows[i].style.display;
      if (t === '' || g.test(tp.rows[i].cells[0].childNodes[0].nodeValue)) {
        tp.rows[i].style.display = '';
        tv.rows[i].style.display = '';
      } else {
        tp.rows[i].style.display = 'none';
        tv.rows[i].style.display = 'none';
      }
    }
    area.keysDiv.scrollTop = 0;
    area.valuesDiv.scrollTop = 0;
  }

  expand(rv) {
    const area = this.tabs[rv.tab || this.activeTab];
    var l, m, lc, c, tp = area.container.getElementsByTagName('table')[0];
    const tv = area.container.getElementsByTagName('table')[1];
    function exclp(r, e, f) {
      var k, v, i, g = new RegExp('^' + r.lvl);
      for (i = r.rowIndex + 1; i < tp.rows.length; i++) {
        k = tp.rows[i].lvl.replace(/[^-]/g, '').length + 1;
        if (g.test(tp.rows[i].lvl)) {
          if (e == false) {
            tp.rows[i].style.display = 'none';
            tv.rows[i].style.display = 'none';
          } else {
            if (k - 1 == f) {
              m = /^\s*\+|^\s*\- /.test(v);
              tp.rows[i].style.display = '';
              tv.rows[i].style.display = '';
              if (tp.rows[i].expanded) {
                exclp(tp.rows[i], true, k);
              }
            }
          }
        }
      }
    }
    if (!rv || (rv && !rv.loaded)) {
      this.findsubprops(rv.obj, rv, rv.tab || this.activeTab);
      rv.cells[0].childNodes[0].nodeValue = rv.cells[0].childNodes[0].nodeValue.replace(/\+/, '-');
      rv.loaded = true;
      rv.expanded = true;
    } else {
      l = rv.lvl;
      lc = rv.lvl.replace(/[^-]/g, '').length + 1;
      c = /^\s*\+/.test(rv.cells[0].childNodes[0].nodeValue);
      rv.cells[0].childNodes[0].nodeValue = rv.cells[0].childNodes[0].nodeValue.replace(c ? /\+/ : /\-/, c ? '-' : '+');
      rv.expanded = c;
      if (!c)
        rv.cells[0].style.backgroundColor = '#ddd';
      else
        rv.cells[0].style.backgroundColor = '';
      exclp(rv, c, lc);
    }
  }

  findevents(obj, rv) { }

  findsubprops(obj, rv, type) {
    const area = this.tabs[type || this.activeTab];
    var ot, tv, lvl, nr, nr1, np, ns, k, ts;
    const tp = area.container.getElementsByTagName('table')[0];
    tv = area.container.getElementsByTagName('table')[1];
    if (rv != null) {
      k = rv.rowIndex + 1;
      lvl = rv.lvl;
    } else {
      k = 0;
    }
    const getCat = (key, val) => {
      // Event handler properties typically start with "on".  They may
      // be functions or `null` when no handler is attached; in either
      // case they belong in the "events" tab.
      if (/^on/i.test(key)) return 'events';
      if (typeof val === 'function') return 'functions';
      if (val instanceof CSSStyleDeclaration) return 'style';
      return 'props';
    };
    for (var i in obj) {
      ns = null;
      if (!(obj.constructor.name == 'CSSStyleDeclaration' && !isNaN(Number(i)))) {
        let cat = type === 'style' ? 'style' : getCat(i, obj[i]);
        // Custom filters for special style-based tabs.
        if (type === 'stylebox') {
          // Show box model related style properties.
          if (!/^(border|padding|width|height|background|color)/i.test(i)) {
            continue;
          }
        } else if (type === 'animation') {
          // Show animation and transition related style properties.
          if (!/(animation|transition)/i.test(i)) {
            continue;
          }
        } else if (type && type !== 'style' && cat !== type) {
          continue;
        }
        try {
          nr = tp.insertRow(k);
          nr1 = nr;
          nr = nr.insertCell();

          const npRow = tv.insertRow(k);
          npRow.style.height = nr1.style.height = '18px';
          np = npRow.insertCell();
          np.valign = 'center';
          np.style.cssText = nr.style.cssText;
          np = np.appendChild(document.createElement('div'));
          np.style.cssText = 'height:100%;box-sizing:border-box;font-size:inherit;';
          k = k + 1;
          nr1.lvl = (lvl ? lvl + '-' : '') + k;
          nr1.tab = type;
          if (obj[i] != null)
            nr.className = typeof obj[i];
          if (typeof obj[i] == 'object' && obj[i] != null && !(obj[i] instanceof Tord)) {
            if (obj[i] != null) {
              nr.innerHTML = nr1.lvl.replace(/-/g, '&nbsp;&nbsp;').replace(/[^&nbsp;]/g, '') + '+ ' + i;
              Object.assign(nr.style, { 'font-weight': 'bold'});
              nr1.obj = obj[i];
              nr.onmousedown = this.onmdown.bind(this, nr1);
              np.innerHTML = '<span>' + obj[i].constructor.name + '</span >';
            } else {
              nr.innerHTML = nr1.lvl.replace(/-/g, '&nbsp;&nbsp;&nbsp;').replace(/[^&nbsp;]/g, '') + i;
              np.innerHTML = '<span>null</span>';
            }
          } else {
            nr.innerHTML = nr1.lvl.replace(/-/g, '&nbsp;&nbsp;&nbsp;').replace(/[^&nbsp;]/g, '') + i;
            ot = Object.getOwnPropertyDescriptor(obj, i);
            ot = !ot || (ot.writable || ot.set);
            if (ot) {
              if (typeof obj[i] == 'function' || obj[i] == null) {
                if (obj[i] == null) ts = 'Null';
                else {
                  ts = obj[i].toString();
                  ts = ts.length > 50 ? ts.slice(0, 50) + ' ...' : ts;
                }
                np.innerHTML = `<div class="dots"><div>${ts}</div><p>...</p>`;
                np.getElementsByTagName('p')[0].onclick = function (i, np) {


                  if (!editbox.editor) {
                    editbox.body();
                  }


                  editbox.editor.setValue(obj[i] == null ? 'null' : obj[i].toString());
                  editbox.np = np;
                  editbox.obj = obj;
                  editbox.prop = i;
                  editbox.showModal();
                }.bind(obj, i, np);
              } else if (obj[i] instanceof Tord) {
                var le = new TlistEditor(obj, i, window[obj[i]._$list]);
                ns = le.htmlObject;
                ns.style.width = '100%';
              } else if (typeof obj[i] == 'boolean') {
                var booleditor = new TBooleanEditor(obj, i, rv);
                ns = booleditor.htmlObject;
              } else {
                if (typeof obj[i] == 'string') {
                  if (obj.constructor.name === 'CSSStyleDeclaration') {
                    const cssName = toKebabCase(i);
                    if (cssProps.properties[cssName]) {
                      const control = TControlFactory.createControl(cssName, obj.ownerElement || obj._element || obj, (val) => {
                        obj[i] = val;
                      });
                      ns = control;
                      ns.firstChild.style.width = '100%';
                      ns.style.width = '100%';
                    } else {
                      var s = new String();
                      s = obj[i];
                      var patt1 = /^#[abcdef0123456789]*/g;
                      var m = s.match(patt1);
                      if ((m != null && (m[0].length - 1) % 3 == 0) || i.search(/color/i) != -1) {
                        var coloreditor = new TeditListEditor(obj, i, Tcolors);
                        ns = coloreditor.htmlObject;
                        ns.style.width = '100%';
                      } else {
                        var texteditor = new TtextEditor(obj, i);
                        ns = texteditor.htmlObject;
                        ns.style.width = '100%';
                      }
                    }
                  } else {
                    var s = new String();
                    s = obj[i];
                    var patt1 = /^#[abcdef0123456789]*/g;
                    var m = s.match(patt1);
                    if ((m != null && (m[0].length - 1) % 3 == 0) || i.search(/color/i) != -1) {
                      var coloreditor = new TeditListEditor(obj, i, Tcolors);
                      ns = coloreditor.htmlObject;
                      ns.style.width = '100%';
                    } else {
                      var texteditor = new TtextEditor(obj, i);
                      ns = texteditor.htmlObject;
                      ns.style.width = '100%';
                    }
                  }
                } else {
                  var texteditor = new TtextEditor(obj, i, true && typeof obj[i] == 'function');
                  ns = texteditor.htmlObject;
                  ns.style.width = '100%';
                }
              }
            } else {
              np.className = nr.className = 'unedit';
              np.innerHTML = obj[i] == null ? 'null' : obj[i].toString();
            }
          }
          if (ns)
            np.appendChild(ns);
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  onmdown(rv, e) {
    this.expand(rv);
    return false;
  }

  body(parent) {
    super.body(parent);

  }
}
onDOMLoad(_=>DOM.addStyleSheet(DOM.getUpPath(null, 2) + "files/css/propeditor.css"));


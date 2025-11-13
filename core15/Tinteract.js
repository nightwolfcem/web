'use strict';
// Tinteract.js — centralized interaction controller
// Seçim + move + resize + transfer drag + marquee (rect/circle) + rotate

import CLASS from './CLASS.js';
import { Tevents } from './Tevents.js';
import { Tselection } from './Tselection.js';
import { isObj, isFn, deepCopy, getElement } from './utils.js';
import { Eborder } from './const.enums.js';
import { TpointerController } from './TpointerController.js';

/* ================= helpers ================= */

const SEL_DROP_DEFAULT = '[data-drop],.droppable,[dropzone]';
const TIGNORE_OVERLAY_SEL =
  'a';
function _px(v){
  return (v|0) + 'px';
}
function _num(v){
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
function _rect(el){
  if (!el || !el.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  return {
    left:   r.left,
    top:    r.top,
    width:  r.width,
    height: r.height,
    right:  r.left + r.width,
    bottom: r.top  + r.height,
    cx:     r.left + r.width/2,
    cy:     r.top  + r.height/2
  };
}
function _owner(x){
  const owner = x && x.owner ? x.owner : x;
  if (owner && typeof owner === 'object' && 'designMode' in owner){
    if (!owner.designMode) return null;
  }
  return owner;
}

function _elOf(it){
  if (!it) return null;
  const o = it.owner || it;
  return o.el || o.htmlObject || o;
}
function _sameItem(a, b){
  if (!a || !b) return false;
  if (a === b) return true;
  const oa = a.owner || a;
  const ob = b.owner || b;
  if (oa === ob) return true;
  const ea = oa.el || oa.htmlObject || oa;
  const eb = ob.el || ob.htmlObject || ob;
  return ea === eb;
}
function _rootsOnly(list){
  if (!Array.isArray(list) || !list.length) return [];
  const out = [];
  for (const it of list){
    const el = _elOf(it);
    if (!el) continue;
    let hasParentInGroup = false;
    for (const other of list){
      if (other === it) continue;
      const pel = _elOf(other);
      if (!pel || pel === el) continue;
      if (pel.contains && pel.contains(el)){
        hasParentInGroup = true;
        break;
      }
    }
    if (!hasParentInGroup){
      out.push(it);
    }
  }
  return out;
}
function _isIgnorable(el){
  if (!el || el.nodeType !== 1) return true;
  if (el.matches && el.matches(TIGNORE_OVERLAY_SEL)) return true;
  try{
    const pe = getComputedStyle(el).pointerEvents;
    if (pe === 'none') return true;
  }catch(_){}
  return false;
}
function _selectableFromPoint(x, y, root,exignores=null){
  const stack = (document.elementsFromPoint && document.elementsFromPoint(x, y)) || [];
  for (const el of stack){
    if (_isIgnorable(el) && (exignores!=null && el.matches && el.matches(exignores))) continue;
    const hit = el.closest && el.closest('[owner],[data-id],.selectable');
    if (hit && (!root || root.contains(hit))) return hit;
  }
  return null;
}
function _eventXY(ev){
  const d = ev && ev.detail || {};
  const oe = d.originalEvent || ev;
  const x = d.x ?? oe?.clientX ?? 0;
  const y = d.y ?? oe?.clientY ?? 0;
  const x0 = d.x0 ?? oe?.clientX ?? x;
  const y0 = d.y0 ?? oe?.clientY ?? y;
  return { x, y, x0, y0, detail: d, original: oe };
}
function _pickHit(ev, root){
  const { x, y, detail, original } = _eventXY(ev);
  let base = detail.target || original?.target || null;

  // handle önceliği
  if (base){
    const h = base.closest && base.closest('[data-handle],.drag-handle,.t-handle');
    if (h){
      const scope = h.closest('[owner],[data-id],.selectable');
      if (scope && (!root || root.contains(scope))) return scope;
    }
  }



  // point tabanlı
  const byPoint = _selectableFromPoint(x, y, root);
  if (byPoint) return byPoint;

  // composedPath fallback
  const oe = original;
  const path = oe && typeof oe.composedPath === 'function' ? oe.composedPath() : null;
  if (path){
    for (const n of path){
      if (!n || n.nodeType !== 1) continue;
      if (_isIgnorable(n)) continue;
      if (!root || !root.contains(n)) continue;
      if (n.matches('[owner],[data-id],.selectable')) return n;
    }
  }
  return null;
}
function _offsetInParent(el){
  try{
    const parent = el.offsetParent || el.parentElement || document.body;
    const er = el.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    const L = (er.left - pr.left) + (parent.scrollLeft || 0);
    const T = (er.top  - pr.top)  + (parent.scrollTop  || 0);
    return { L, T };
  }catch(_){
    const r = el.getBoundingClientRect();
    return { L: r.left + (globalThis.scrollX||0), T: r.top + (globalThis.scrollY||0) };
  }
}
function _hitEdge(ev, el, pad){
  if (!el || !el.getBoundingClientRect) return null;
  const oe = ev && (ev.detail && ev.detail.originalEvent || ev.originalEvent || ev);
  const clientX = ev?.detail?.x ?? oe?.clientX ?? 0;
  const clientY = ev?.detail?.y ?? oe?.clientY ?? 0;
  const r = el.getBoundingClientRect();
  const left = r.left, right = r.right, top = r.top, bottom = r.bottom;

  const onLeft   = Math.abs(clientX - left)   <= pad;
  const onRight  = Math.abs(clientX - right)  <= pad;
  const onTop    = Math.abs(clientY - top)    <= pad;
  const onBottom = Math.abs(clientY - bottom) <= pad;

  if (!onLeft && !onRight && !onTop && !onBottom) return null;
  return { left:onLeft, right:onRight, top:onTop, bottom:onBottom };
}
function _edgeMask(edge){
  if (!edge) return 0;
  let m = 0;
  if (edge.left)   m |= (Number(Eborder.left)   || 1);
  if (edge.right)  m |= (Number(Eborder.right)  || 2);
  if (edge.top)    m |= (Number(Eborder.top)    || 4);
  if (edge.bottom) m |= (Number(Eborder.bottom) || 8);
  return m;
}
function _class(el, add, name){
  if (!el || !name) return;
  if (add) el.classList.add(name);
  else el.classList.remove(name);
}
function _ensureOverlay(root){
  // 1) Tüm overlay'leri topla
  const list = [...root.querySelectorAll('.tinteract-overlay')];
  const overlay = list[0] || Object.assign(document.createElement('div'), { className:'tinteract-overlay' });

  // 2) Fazla overlay'leri birleştir + kaldır
  for (let i=1;i<list.length;i++){
    while (list[i].firstChild) overlay.appendChild(list[i].firstChild);
    list[i].remove();
  }
  const slot = root.querySelector('[data-slot="overlay"]');
  const host = slot || root;
  if (!overlay.parentNode) host.appendChild(overlay);
  if (overlay !== host.lastElementChild) host.appendChild(overlay);
  Object.assign(overlay.style, { position:'absolute', inset:'0', pointerEvents:'none' });
  return overlay;
}
function _ensureHandles(gb){
  const doc = gb.ownerDocument || document;
  let hs = gb.querySelectorAll(':scope > .t-resize-handle, :scope > .t-rotate-handle, :scope > .t-pivot-handle');
  if (hs && hs.length) return hs;

  const positions = ['n','s','e','w','ne','nw','se','sw'];
  for (const pos of positions){
    const h = doc.createElement('div');
    h.className = 't-resize-handle';
    h.setAttribute('data-handle', pos);
    gb.appendChild(h);
  }
  const rot = doc.createElement('div');
  rot.className = 't-rotate-handle';
  rot.setAttribute('data-handle', 'rot');
  gb.appendChild(rot);

  const pivot = doc.createElement('div');
  pivot.className = 't-pivot-handle';
  pivot.setAttribute('data-handle', 'pivot');
  gb.appendChild(pivot);

  hs = gb.querySelectorAll(':scope > .t-resize-handle, :scope > .t-rotate-handle, :scope > .t-pivot-handle');
  return hs;
}
function _under(root, x, y){
  const stack = (document.elementsFromPoint && document.elementsFromPoint(x, y)) || [];
  for (const el of stack){
    if (_isIgnorable(el)) continue;
    if (!root.contains(el)) continue;
    return el;
  }
  return null;
}
function _parseRotate(el){
  const t = (el.style && el.style.transform) || '';
  const m = /rotate\(([-0-9.]+)deg\)/.exec(t);
  return m ? parseFloat(m[1]) : 0;
}
function _applyRotate(el, deg){
  if (!el) return;
  const style = el.style || {};
  const t = style.transform || '';
  let out = t;
  if (/rotate\([^)]+\)/.test(t)){
    out = t.replace(/rotate\([^)]+\)/, `rotate(${deg}deg)`);
  } else {
    out = `${t} rotate(${deg}deg)`;
  }

  // pivot destekli transformOrigin
  let origin = '50% 50%';
  try{
    const owner = el.owner || el.__owner || null;
    if (owner && typeof owner.pivotX === 'number' && typeof owner.pivotY === 'number'){
      let px = owner.pivotX;
      let py = owner.pivotY;
      if (!Number.isFinite(px)) px = 0.5;
      if (!Number.isFinite(py)) py = 0.5;
      if (px < 0) px = 0; else if (px > 1) px = 1;
      if (py < 0) py = 0; else if (py > 1) py = 1;
      origin = (px*100) + '% ' + (py*100) + '%';
    }
  }catch(_){}

  style.transformOrigin = origin;
  style.transform = out.trim();
}

/* =========================================================== */

export const Tinteract = CLASS(class Tinteract extends CLASS.extends(Tevents){

  constructor(root, opts = {}){
    super();

    // root normalization
    let rootEl = getElement(root);
    let options = opts;
    if (!rootEl && root && typeof root === 'object' && !root.nodeType){
      options = root;
      rootEl = getElement(root.root);
    }
    if (!rootEl) throw new Error('Tinteract: root gerekli');

    const {
      overlayMode = 'root',
      selection = null,
      selectionOpts = null,
      keys = null,
      move = null,
      resize = null,
      drag = null,
      snap = null,
      history = null,
      controller = null
    } = options || {};

    this.root = rootEl;
    this.overlayMode = overlayMode === 'viewport' ? 'viewport' : 'root';
    this.snap = snap || null;
    this.history = history || null;

    /* selection */
    if (selection instanceof Tselection){
      this.selection = selection;
    } else {
      const selCfg = Object.assign(
        {
          mode: 'multiple',
          idOf: (it)=>{
            if (!it) return null;
            if (typeof it === 'string' || typeof it === 'number') return it;
            const el = it.el || it.htmlObject || it;
            if (!el) return null;
            return el.getAttribute && el.getAttribute('data-id') || el.id || null;
          },
          getById: (id)=>{
            if (id == null) return null;
            const str = String(id);
            const el = this.root.querySelector(`[data-id="${str}"], #${str}`);
            if (!el) return null;
            return el.owner || el;
          },
          getRect: (it)=>{
            const el = it && (it.el || it.htmlObject || it);
            return el ? _rect(el) : null;
          },
          history: this.history
        },
        isObj(selectionOpts) ? selectionOpts : {},
        isObj(selection) ? selection : {}
      );
      this.selection = new Tselection(selCfg);
    }

    /* overlay + overlay children */
    this.overlay = _ensureOverlay(this.root, this.overlayMode);
    const doc = this.overlay.ownerDocument || document;

    this.marqueeRect = doc.createElement('div');
    this.marqueeRect.className = 'marquee-rect';
    Object.assign(this.marqueeRect.style, {
      position: 'absolute',
      border: '1px dashed rgba(45,127,249,.7)',
      background: 'rgba(45,127,249,.08)',
      boxShadow: '0 0 0 1px rgba(255,255,255,.6) inset',
      pointerEvents: 'none',
      display: 'none'
    });
    this.overlay.appendChild(this.marqueeRect);

    this.marqueeCircle = doc.createElement('div');
    this.marqueeCircle.className = 'marquee-circle';
    Object.assign(this.marqueeCircle.style, {
      position: 'absolute',
      borderRadius: '999px',
      border: '1px dashed rgba(45,127,249,.7)',
      background: 'rgba(45,127,249,.08)',
      boxShadow: '0 0 0 1px rgba(255,255,255,.6) inset',
      pointerEvents: 'none',
      display: 'none'
    });
    this.overlay.appendChild(this.marqueeCircle);

    this.ghostEl = doc.createElement('div');
    this.ghostEl.className = 'drag-ghost';
    Object.assign(this.ghostEl.style, {
      position: 'absolute',
      border: '1px dashed rgba(45,127,249,.7)',
      boxShadow: '0 0 0 1px rgba(255,255,255,.6) inset',
      pointerEvents: 'none',
      display: 'none'
    });
    this.overlay.appendChild(this.ghostEl);

    this.groupBox = doc.createElement('div');
    this.groupBox.className = 'group-box';
    Object.assign(this.groupBox.style, {
      position: 'absolute',
      border: '1px dashed rgba(45,127,249,.7)',
      boxShadow: '0 0 0 1px rgba(255,255,255,.6) inset',
      pointerEvents: 'auto',
      display: 'none'
    });
    this.overlay.appendChild(this.groupBox);

    /* pointer controller */
    this.ctrl = controller instanceof TpointerController
      ? controller
      : new TpointerController(this.root, { capture: true });

    /* config defaults */
    this.keys = Object.assign({
      multi:  (e)=> e && (e.ctrlKey || e.metaKey),
      range:  (e)=> e && e.shiftKey,
      circle: (e)=> e && e.altKey,
      drag:   (e)=> e && (e.altKey || e.ctrlKey)
    }, isObj(keys) ? keys : {});

    this.move = Object.assign(
      { bound:true, xable:true, yable:true },
      isObj(move) ? move : {}
    );
    this.resize = Object.assign(
      {
        pad:6,
        minW:20, minH:20,
        maxW:Infinity, maxH:Infinity,
        handleMask: (Number(Eborder.all) || (1|2|4|8))
      },
      isObj(resize) ? resize : {}
    );
    this.drag = Object.assign(
      {
        mode:'auto',
        handleSelector: '.drag-handle',
        outsideToTransfer: false,
        activeClass: 'dragging',
        overClass: 'drop-over',
        targetSelector: SEL_DROP_DEFAULT,
        onHover: null,
        accept: (group, target, ev)=>{
          const own = target && target.owner || null;
          if (own && typeof own.dropAccept === 'function'){
            try{ return !!own.dropAccept({ group, target }, { ev }); }catch(_){ return false; }
          }
          if (own && own.status && own.status.dockable === true) return true;
          return !!(target && target.matches && target.matches(SEL_DROP_DEFAULT));
        },
        onDrop: (group, target, ev, ctx)=>{
          if (!target) return false;
          const copy = !!(ev && ev.ctrlKey) && !ev.shiftKey;
          const layer = typeof this.drag.getLayer === 'function'
            ? (this.drag.getLayer(target) || target)
            : target;
          if (!layer || !layer.appendChild) return false;
          const newNodes = [];
          for (const g of group){
            const el = g && (g.el || g.htmlObject || g);
            if (!el) continue;
            if (copy){
              const dup = el.cloneNode(true);
              dup.setAttribute && dup.setAttribute('data-tcloned','1');
              layer.appendChild(dup);
              newNodes.push(dup);
            } else {
              layer.appendChild(el);
            }
          }
          this._S && (this._S.dropNewNodes = newNodes);
          return true;
        }
      ,},
      isObj(drag) ? drag : {}
    );

    /* state */
    this._S = {
      mode: 'none',
      kind: 'none',
      sx: 0, sy: 0,
      dx: 0, dy: 0,
      group: [],
      edgeMask: 0,
      dropTarget: null,
      dragData: null,
      marqueeKind: null,
      marqueeMode: 'replace', // 'replace' | 'add' | 'toggle'
      baseIds: null,
      rotateCenter: null,
      rotateBaseDeg: 0,
      rotateEachBase: [],
      pivotOwner: null,
      pivotBox: null,
      pivotBaseDeg: 0
    };
    // tap / click fallback için zaman damgası ve native click handler
    this._lastTapAt = 0;
    this._tapSuppressedUntil = 0;
    this._onNativeClickBound = (ev)=> this._onNativeClick(ev);
    if (this.root && this.root.addEventListener){
      this.root.addEventListener('click', this._onNativeClickBound, true);
    }

    this._moveTarget = null;

    /* keyboard: ESC iptal */
    this._onKeyDown = (ev)=>{
      if (ev.key === 'Escape'){
        this._cancelAll('escape');
      }
    };
    if (typeof document !== 'undefined'){
      document.addEventListener('keydown', this._onKeyDown);
    }

    /* selection → DOM 'selected' + groupBox */
    if (this.selection && this.selection.on){
      this.selection.on('change', ()=>{
        try{
          const rootEl = this.root;
          const all = rootEl.querySelectorAll('[data-id], .selectable');
          all.forEach(el=> el.classList && el.classList.remove('selected'));
          const items = this._getSelItems();
          for (const it of items){
            const el = it && (it.el || it.htmlObject || it);
            if (el && el.classList) el.classList.add('selected');
          }
        }catch(_){}
        this._updateGroupBox();
      });
    }

    this._wire();
  }

  destroy(){
    try{ this.ctrl && this.ctrl.destroy && this.ctrl.destroy(); }catch(_){}
    if (typeof document !== 'undefined' && this._onKeyDown){
      try{ document.removeEventListener('keydown', this._onKeyDown); }catch(_){}
    }
    this._cancelAll('destroy');
  }

  /* ---------------- internal helpers ---------------- */

  _wire(){
    if (!this.ctrl || !this.ctrl.on) return;
    // Mevcut TpointerController event isimleriyle uyumlu
    this.ctrl.on('tpointer:tap',       ev => this._onTap(ev));
   // this.ctrl.on('tpointer:click',     ev => this._onTap(ev));
    this.ctrl.on('tpointer:dragstart', ev => this._onDragStart(ev));
    this.ctrl.on('tpointer:drag',      ev => this._onDrag(ev));
    this.ctrl.on('tpointer:dragend',   ev => this._onDragEnd(ev));
    this.ctrl.on('tpointer:move',      ev => this._onMove(ev));
    this.ctrl.on('tpointer:cancel',    () => this._cancelAll('pointer-cancel'));
  }

  _getSelItems(){
    const sel = this.selection;
    if (!sel) return [];
    if (typeof sel.items === 'function') return sel.items() || [];
    if (typeof sel.list === 'function') return sel.list() || [];
    return [];
  }

  /* ---------------- tap → selection ---------------- */
  _onTap(ev){
    const now = Date.now();
    if (this._tapSuppressedUntil && now < this._tapSuppressedUntil){
      return;
    }

    const d  = (ev && ev.detail) || {};
    const oe = d.originalEvent || ev.originalEvent || ev;
    const eLike = {
      ctrlKey:  !!(((oe && (oe.ctrlKey || oe.metaKey)) || d.ctrlKey || d.metaKey)),
      metaKey:  !!(((oe &&  oe.metaKey)                 || d.metaKey)),
      shiftKey: !!(((oe &&  oe.shiftKey)                || d.shiftKey)),
      altKey:   !!(((oe &&  oe.altKey)                  || d.altKey))
    };

    const { x, y } = _eventXY(ev);
    let td=this.groupBox.style.display;
    if(td!="none")this.groupBox.style.display="none";
    const hitNode = _selectableFromPoint(x, y, this.root);
 if(td!="none")this.groupBox.style.display=td;
    const multi = !!(this.keys && this.keys.multi  && this.keys.multi(eLike));
    const range = !!(this.keys && this.keys.range  && this.keys.range(eLike));

    // Hiçbir şeye gelmediyse → boş alan → seçimi temizle
    if (!hitNode){
      if (this.selection){
        if (this.selection.clear){
          this.selection.clear(true);
        } else if (this.selection.set){
          this.selection.set([], 'replace', true);
        }
        this._updateGroupBox && this._updateGroupBox();
      }
      this._lastTapAt = now;
      return;
    }

    
    const owner = _owner(hitNode);
    if (!owner){
      this._lastTapAt = now;
      return;
    }

    const st = owner.status || {};
    if (st.disabled || st.selectable === false){
      this._lastTapAt = now;
      return;
    }

    if (!this.selection){
      this._lastTapAt = now;
      return;
    }

    const curItems = this._getSelItems ? (this._getSelItems() || []) : [];
    const isInSelection = curItems.some(it => _sameItem(it, owner));

    // Çoklu seçim varken, içtekine modsuz tıklama → grubu bozma
    if (curItems.length > 1 && isInSelection && !multi && !range){
      this._updateGroupBox && this._updateGroupBox();
      this._lastTapAt = now;
      return;
    }

    // Ctrl / Shift → manuel toggle
    if (this.selection.set){
      let next;
      if (multi || range){
        const base = curItems.slice();
        if (isInSelection){
          next = base.filter(it => !_sameItem(it, owner)); // listeden çıkar
        } else {
          next = base.concat(owner);                       // listeye ekle
        }
      } else {
        // normal tık → tek seçim
        next = [owner];
      }
      this.selection.set(next, 'replace', true);
    } else if (this.selection.toggle){
      this.selection.toggle(owner, { multi, range });
    }

    this._updateGroupBox && this._updateGroupBox();
    this._lastTapAt = now;
  }


  /**
   * Native click fallback:
   *  - Bazı ortamlarda TpointerController tap/click üretmezse,
   *    yine de root üzerindeki normal click ile seçim çalışsın.
   *  - Eğer hemen öncesinde pointer tap/click geldiyse (this._lastTapAt yakınsa)
   *    bu fallback hiçbir şey yapmaz; böylece çift tetiklenmez.
   */
  _onNativeClick(ev){
    if (!ev) return;
    // sadece sol tuş
    if (typeof ev.button === 'number' && ev.button !== 0) return;
    if (this.root && !this.root.contains(ev.target)) return;

    // pointer tabanlı tap/click çalıştıysa (çok kısa süre önce) native click'i yoksay
    if (this._lastTapAt && (Date.now() - this._lastTapAt) < 80){
      return;
    }

    try{
      this._onTap({
        detail: {
          x: ev.clientX,
          y: ev.clientY,
          x0: ev.clientX,
          y0: ev.clientY,
          originalEvent: ev
        }
      });
    }catch(_){}
  }



  /* ---------------- drag lifecycle ---------------- */

    _onDragStart(ev){
    const { x0, y0, detail, original } = _eventXY(ev);
    const e = original;
    this._tapSuppressedUntil = Date.now() + 250;
    const baseTarget = detail.target || e?.target || null;

    // handle üzerinden mi?
    let handleToken = '';
    if (baseTarget){
      const direct = baseTarget.getAttribute && baseTarget.getAttribute('data-handle');
      if (direct) handleToken = direct;
      if (!handleToken && baseTarget.closest){
        const h = baseTarget.closest('[data-handle]');
        if (h) handleToken = h.getAttribute('data-handle') || '';
      }
    }

    // Normal hit testi
    const hit = _pickHit(ev, this.root);
    let owner = hit ? _owner(hit) : null;

    // Mevcut seçim
    const selItems = this._getSelItems && this._getSelItems();
    let isInSelection = owner && selItems && selItems.some(it => _sameItem(it, owner));
    let group = (isInSelection && selItems && selItems.length > 0)
      ? selItems.slice()
      : (owner ? [owner] : []);

    // Marquee / group-box üzerinden sürükleme: mevcut seçimi taşı
    const marqueeTarget =
      baseTarget && baseTarget.closest
        ? baseTarget.closest('.group-box,.marquee-rect,.marquee-circle')
        : null;

    if (marqueeTarget && selItems && selItems.length > 0 && !handleToken){
      owner = _owner(selItems[0]);
      group = selItems.slice();
      isInSelection = true;
    }

    // Handle'dan geldiysek ve owner yoksa -> seçimden fallback
    if (!owner && handleToken && selItems && selItems.length > 0){
      owner = _owner(selItems[0]);
      group = selItems.slice();
    }

    // Body'den drag başlıyorsa ve owner seçili değilse → otomatik seçim
    if (owner && !isInSelection && !handleToken && this.selection && this.selection.set){
      this.selection.set(owner, 'replace', true);
      const cur = this._getSelItems && this._getSelItems();
      if (cur && cur.length){
        group = cur.slice();
      } else {
        group = [owner];
      }
    }

const wantCircle = !!(this.keys && this.keys.circle && this.keys.circle(e));
    const wantTransfer = !!(this.keys && this.keys.drag && this.keys.drag(e)) && this.drag.mode !== 'move-only';

    if (!owner){
      // gerçekten boş alan: marquee
      this._beginMarquee(detail, wantCircle ? 'circle' : 'rect', e);
      return;
    }

    const status = owner.status || {};
    const locked  = !!status.locked || !!status.disabled;
    const canMove   = !locked && (status.movable !== false);
    const canSize   = !locked && (status.resizable !== false);
    const canDrag   = !locked && !!status.draggable;
    const canRotate = !locked && (status.rotatable !== false);
    const canPivot  = !locked && (status.pivotEditable !== false);

    // pivot handle
    if (handleToken === 'pivot' && canPivot){
      this._beginPivot(detail, owner);
      return;
    }

    // rotate handle
    if (handleToken === 'rot' && canRotate){
      this._beginRotate(detail, owner);
      return;
    }

    // handle → resize (grubu kullan)
    if (handleToken && canSize){
      const map = {
        n:  Eborder.top,
        s:  Eborder.bottom,
        e:  Eborder.right,
        w:  Eborder.left,
        ne: (Eborder.top|Eborder.right),
        nw: (Eborder.top|Eborder.left),
        se: (Eborder.bottom|Eborder.right),
        sw: (Eborder.bottom|Eborder.left)
      };
      const m = map[handleToken] || 0;
      if (m){
        this._beginResize(detail, owner, Number(m), group);
        return;
      }
    }

    // edge → resize
    let edgeMask = 0;
    if (canSize){
      const pad = this.resize && (this.resize.pad | 0);
      const el = owner.el || owner.htmlObject || owner;
      const edge = _hitEdge(ev, el, pad);
      edgeMask = _edgeMask(edge) & Number((this.resize && this.resize.handleMask) || (1|2|4|8));
    }

    if (group && group.length){
      group = _rootsOnly(group);
    }

    if (!group || !group.length){
      group = [owner];
    }

    if (edgeMask){
      this._beginResize(detail, owner, edgeMask, group);
    } else if (canDrag && wantTransfer && this.drag.mode !== 'move-only'){
      this._beginTransfer(detail, owner, group);
    } else if (canMove){
      this._beginMove(detail, owner, group);
    } else if (canDrag){
      this._beginTransfer(detail, owner, group);
    } else {
      this._beginMarquee(detail, wantCircle ? 'circle' : 'rect', e);
    }
  }


  _beginMove(detail, primary, groupItems){
    const S = this._S;
    S.mode = 'drag';
    S.kind = 'move';
    S.sx = detail.x0;
    S.sy = detail.y0;
    S.dx = 0;
    S.dy = 0;

    const group = groupItems || [primary];
    S.group = group.map(item=>{
      const owner = _owner(item);
      const el = owner.el || owner.htmlObject || owner;
      const st = el.style;
      const off = _offsetInParent(el);
      if (!st.position || st.position === 'static') st.position = 'absolute';
      if (!st.left)  st.left  = _px(off.L);
      if (!st.top)   st.top   = _px(off.T);
      if (!st.width) st.width = _px(el.getBoundingClientRect().width);
      if (!st.height)st.height= _px(el.getBoundingClientRect().height);
      return {
        owner,
        el,
        base: {
          L: _num(st.left),
          T: _num(st.top),
          W: _num(st.width),
          H: _num(st.height)
        }
      };
    });

    const box = this._groupBounds(S.group);
    if (this.ghostEl){
      Object.assign(this.ghostEl.style, {
        left: _px(box.left),
        top: _px(box.top),
        width: _px(box.width),
        height: _px(box.height),
        display: 'block'
      });
    }
    this._moveTarget = { L: box.left, T: box.top, W: box.width, H: box.height };
    for (const it of S.group){ _class(it.el, true, 'moving'); }
    if (this.history && this.history.begin) this.history.begin('interact:move');
    this.emit('move:start', { group: S.group.map(g=>g.owner) });
  }

  _beginResize(detail, primary, edgeMask, groupItems){
    const S = this._S;
    S.mode = 'drag';
    S.kind = 'resize';
    S.edgeMask = edgeMask;
    S.sx = detail.x0;
    S.sy = detail.y0;
    S.dx = 0;
    S.dy = 0;

    const group = groupItems || [primary];
    S.group = group.map(item=>{
      const owner = _owner(item);
      const el = owner.el || owner.htmlObject || owner;
      const st = el.style;
      const off = _offsetInParent(el);
      if (!st.position || st.position === 'static') st.position = 'absolute';
      if (!st.left)  st.left  = _px(off.L);
      if (!st.top)   st.top   = _px(off.T);
      if (!st.width) st.width = _px(el.getBoundingClientRect().width);
      if (!st.height)st.height= _px(el.getBoundingClientRect().height);
      return {
        owner,
        el,
        base: {
          L: _num(st.left),
          T: _num(st.top),
          W: _num(st.width),
          H: _num(st.height)
        }
      };
    });

    for (const it of S.group){ _class(it.el, true, 'resizing'); }
    if (this.history && this.history.begin) this.history.begin('interact:resize');
    this.emit('resize:start', { group: S.group.map(g=>g.owner), edgeMask });
  }

  _beginRotate(detail, primary){
    const S = this._S;
    S.mode = 'drag';
    S.kind = 'rotate';
    S.sx = detail.x0;
    S.sy = detail.y0;
    S.dx = 0;
    S.dy = 0;

    const selItems = this._getSelItems && this._getSelItems();
    const isInSelection = selItems && selItems.some(it => _sameItem(it, primary));
    let group = (isInSelection && selItems && selItems.length > 0) ? selItems.slice() : [primary];
    if (group && group.length){
      group = _rootsOnly(group);
    }

    S.group = group.map(item=>{
      const owner = _owner(item);
      const el = owner.el || owner.htmlObject || owner;
      return { owner, el };
    });

    // grup merkezi (viewport koordinatı)
    let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
    for (const it of S.group){
      const r = _rect(it.el);
      if (!r) continue;
      if (r.left < L) L = r.left;
      if (r.top  < T) T = r.top;
      if (r.right > R) R = r.right;
      if (r.bottom> B) B = r.bottom;
    }
    if (!isFinite(L) || !isFinite(T) || !isFinite(R) || !isFinite(B)){
      S.rotateCenter = null;
    } else {
      const cx = (L + R) / 2;
      const cy = (T + B) / 2;
      S.rotateCenter = { cx, cy };
    }

    const cx = S.rotateCenter ? S.rotateCenter.cx : detail.x0;
    const cy = S.rotateCenter ? S.rotateCenter.cy : detail.y0;
    const baseDeg = Math.atan2(detail.y0 - cy, detail.x0 - cx) * 180 / Math.PI;
    S.rotateBaseDeg = baseDeg;
    S.rotateEachBase = S.group.map(it => _parseRotate(it.el));

    if (this.history && this.history.begin) this.history.begin('interact:rotate');
    this.emit('rotate:start', { group: S.group.map(g=>g.owner) });
  }

  _beginPivot(detail, primary){
    const S = this._S;
    S.mode = 'drag';
    S.kind = 'pivot';
    S.sx = detail.x0;
    S.sy = detail.y0;
    S.dx = 0;
    S.dy = 0;

    const selItems = this._getSelItems && this._getSelItems();
    const isInSelection = selItems && selItems.some(it => _sameItem(it, primary));
    let group = (isInSelection && selItems && selItems.length > 0)
      ? selItems.slice()
      : [primary];
    if (group && group.length){
      group = _rootsOnly(group);
    }

    // pivot editing: currently only first item is used for pivot
    const owner = _owner(group[0]);
    const el = owner.el || owner.htmlObject || owner;
    if (!el || !el.getBoundingClientRect){
      S.mode = 'none';
      S.kind = '';
      return;
    }

    const r = el.getBoundingClientRect();
    S.pivotBox = {
      left: r.left,
      top:  r.top,
      width: Math.max(1, r.width),
      height:Math.max(1, r.height)
    };
    S.pivotOwner = owner;

    if (typeof owner.pivotX !== 'number') owner.pivotX = 0.5;
    if (typeof owner.pivotY !== 'number') owner.pivotY = 0.5;

    // keep current rotation so we can re-apply during pivot drag
    S.pivotBaseDeg = _parseRotate(el);

    this.emit('pivot:start', { owner });
  }


  _beginTransfer(detail, primary, groupItems){
    const S = this._S;
    S.mode = 'drag';
    S.kind = 'transfer';
    S.sx = detail.x0;
    S.sy = detail.y0;
    S.dx = 0;
    S.dy = 0;

    const group = groupItems || [primary];
    S.group = group.map(item=>{
      const owner = _owner(item);
      const el = owner.el || owner.htmlObject || owner;
      const r = _rect(el) || { left:0, top:0, width:0, height:0 };
      return {
        owner,
        el,
        base: {
          L: r.left,
          T: r.top,
          W: r.width,
          H: r.height
        }
      };
    });
    const box = this._groupBounds(S.group);
    if (this.ghostEl){
      Object.assign(this.ghostEl.style, {
        left: _px(box.left),
        top: _px(box.top),
        width: _px(box.width),
        height: _px(box.height),
        display: 'block'
      });
    }
    this._moveTarget = { L: box.left, T: box.top, W: box.width, H: box.height };
    for (const it of S.group){ _class(it.el, true, this.drag.activeClass); }
    S.dragData = typeof this.drag.data === 'function' ? this.drag.data(S.group.map(g=>g.owner)) : null;
    if (this.history && this.history.begin) this.history.begin('interact:transfer');
    this.emit('transfer:start', { group: S.group.map(g=>g.owner), data: S.dragData });
  }

  _groupBounds(group){
    let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
    for (const it of group){
      const b = it.base;
      if (b.L < L) L = b.L;
      if (b.T < T) T = b.T;
      if (b.L + b.W > R) R = b.L + b.W;
      if (b.T + b.H > B) B = b.T + b.H;
    }
    if (!isFinite(L) || !isFinite(T) || !isFinite(R) || !isFinite(B)){
      return { left:0, top:0, width:0, height:0 };
    }
    return { left:L, top:T, width:R-L, height:B-T };
  }

  _beginMarquee(detail, kind, originalEv){
    const S = this._S;
    S.mode = 'drag';
    S.kind = kind;
    S.sx = detail.x0;
    S.sy = detail.y0;
    S.dx = 0;
    S.dy = 0;
    S.marqueeKind = kind;

    const ctrl = !!(originalEv && originalEv.ctrlKey);
    const shift = !!(originalEv && originalEv.shiftKey);
    if (ctrl && !shift) S.marqueeMode = 'toggle';
    else if (shift && !ctrl) S.marqueeMode = 'add';
    else S.marqueeMode = 'replace';

    // Ctrl toggle için başlangıç selection id snapshot
    if (S.marqueeMode === 'toggle'){
      const baseItems = this._getSelItems();
      const ids = [];
      for (const it of baseItems){
        const el = it && (it.el || it.htmlObject || it);
        if (!el) continue;
        const id = (el.getAttribute && el.getAttribute('data-id')) || el.id || null;
        if (id != null) ids.push(String(id));
      }
      S.baseIds = ids;
    } else {
      S.baseIds = null;
    }

    this._showMarquee(kind, detail.x0, detail.y0, detail.x0, detail.y0);
    this.emit('select:start', { kind });
  }

  _showMarquee(kind, sx, sy, ex, ey){
    const overlayRect = (this.overlay && this.overlay.getBoundingClientRect)
      ? this.overlay.getBoundingClientRect()
      : { left: 0, top: 0 };

    const x0v = Math.min(sx, ex);
    const y0v = Math.min(sy, ey);
    const w   = Math.max(0, Math.abs(ex - sx));
    const h   = Math.max(0, Math.abs(ey - sy));

    const x0 = x0v - overlayRect.left;
    const y0 = y0v - overlayRect.top;

    if (kind === 'rect'){
      const el = this.marqueeRect;
      if (!el) return;
      Object.assign(el.style, {
        left: _px(x0),
        top:  _px(y0),
        width: _px(w),
        height:_px(h),
        display:'block'
      });
      if (this.marqueeCircle) this.marqueeCircle.style.display = 'none';
    } else {
      const el = this.marqueeCircle;
      if (!el) return;
      const sxRel = sx - overlayRect.left;
      const syRel = sy - overlayRect.top;
      const r = Math.sqrt(w*w + h*h);
      Object.assign(el.style, {
        left: _px(sxRel - r),
        top:  _px(syRel - r),
        width: _px(2*r),
        height:_px(2*r),
        display:'block'
      });
      if (this.marqueeRect) this.marqueeRect.style.display = 'none';
    }
  }

  _hideMarquee(){
    if (this.marqueeRect) this.marqueeRect.style.display = 'none';
    if (this.marqueeCircle) this.marqueeCircle.style.display = 'none';
  }

  _itemsInBox(box, kind){
    const root = this.root;
    if (!root) return [];
    const nodes = root.querySelectorAll('[data-id], .selectable, [owner]');
    const items = [];
    for (const el of nodes){
      if (_isIgnorable(el)) continue;
      const r = _rect(el);
      if (!r) continue;
      let hit = false;
      if (kind === 'rect'){
        const inter = !(r.left > box.left + box.width ||
                        r.right < box.left ||
                        r.top > box.top + box.height ||
                        r.bottom < box.top);
        hit = inter;
      } else {
        const cx = r.cx, cy = r.cy;
        const dx = cx - (box.left + box.width/2);
        const dy = cy - (box.top + box.height/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        const radius = Math.max(box.width, box.height) / 2;
        hit = dist <= radius;
      }
      if (!hit) continue;
      const owner = el.owner || el;
      if (owner && owner.status && (owner.status.disabled || owner.status.selectable === false)) continue;
      items.push(owner);
    }
    return items;
  }

  /* ---------------- drag move ---------------- */

  _onDrag(ev){
    const d = ev.detail || {};
    const S = this._S;
    if (!S || S.mode !== 'drag') return;
    this._tapSuppressedUntil = Date.now() + 50;

    S.dx = d.x - S.sx;
    S.dy = d.y - S.sy;

    if (S.kind === 'move'){
      const box0 = this._groupBounds(S.group);
      let L = box0.left + S.dx;
      let T = box0.top  + S.dy;
      let W = box0.width;
      let H = box0.height;

      if (this.snap && isFn(this.snap.computeForRect)){
        const res = this.snap.computeForRect({ left:L, top:T, width:W, height:H }, { preview:true });
        if (res && res.rect){
          L = res.rect.left;
          T = res.rect.top;
          W = res.rect.width;
          H = res.rect.height;
        }
      }

      if (this.ghostEl){
        Object.assign(this.ghostEl.style, {
          left:  _px(L),
          top:   _px(T),
          width: _px(W),
          height:_px(H),
          display:'block'
        });
      }
      this._moveTarget = { L, T, W, H };
      this.emit('move:drag', { group: S.group.map(g=>g.owner), x:d.x, y:d.y });

    } else if (S.kind === 'resize'){
      const mask = S.edgeMask || 0;
      const Lm = (mask & (Number(Eborder.left)   || 1)) !== 0;
      const Rm = (mask & (Number(Eborder.right)  || 2)) !== 0;
      const Tm = (mask & (Number(Eborder.top)    || 4)) !== 0;
      const Bm = (mask & (Number(Eborder.bottom) || 8)) !== 0;

      for (const it of S.group){
        const b = it.base;
        let L = b.L;
        let T = b.T;
        let W = b.W;
        let H = b.H;

        if (Lm){ L = b.L + S.dx; W = b.W - S.dx; }
        if (Rm){ W = b.W + S.dx; }
        if (Tm){ T = b.T + S.dy; H = b.H - S.dy; }
        if (Bm){ H = b.H + S.dy; }

        W = Math.max(this.resize.minW, Math.min(this.resize.maxW, W));
        H = Math.max(this.resize.minH, Math.min(this.resize.maxH, H));

        if (this.snap && isFn(this.snap.computeForRect)){
          const res = this.snap.computeForRect({ left:L, top:T, width:W, height:H }, { preview:true, node: it.el });
          if (res && res.rect){
            L = res.rect.left;
            T = res.rect.top;
            W = res.rect.width;
            H = res.rect.height;
          }
        }

        const st = it.el.style;
        st.left = _px(L);
        st.top  = _px(T);
        st.width = _px(W);
        st.height= _px(H);
      }
      this.emit('resize', { group: S.group.map(g=>g.owner), edgeMask: S.edgeMask });
      this._updateGroupBox();

    } else if (S.kind === 'rotate'){
      if (!S.rotateCenter) return;
      const cx = S.rotateCenter.cx;
      const cy = S.rotateCenter.cy;
      const curDeg = Math.atan2(d.y - cy, d.x - cx) * 180 / Math.PI;
      const delta = curDeg - S.rotateBaseDeg;

      S.group.forEach((it, i)=>{
        const base = S.rotateEachBase[i] || 0;
        const deg = base + delta;
        _applyRotate(it.el, deg);
      });

      this.emit('rotate', { group: S.group.map(g=>g.owner), delta });
      this._updateGroupBox();

    } else if (S.kind === 'pivot'){
      const owner = S.pivotOwner;
      const box = S.pivotBox;
      if (!owner || !box) return;

      const x = d.x;
      const y = d.y;

      let px = (x - box.left) / box.width;
      let py = (y - box.top)  / box.height;
      if (!Number.isFinite(px)) px = 0.5;
      if (!Number.isFinite(py)) py = 0.5;
      if (px < 0) px = 0; else if (px > 1) px = 1;
      if (py < 0) py = 0; else if (py > 1) py = 1;

      owner.pivotX = px;
      owner.pivotY = py;

      const el = owner.el || owner.htmlObject || owner;
      if (el){
        const baseDeg = typeof S.pivotBaseDeg === 'number' ? S.pivotBaseDeg : _parseRotate(el);
        _applyRotate(el, baseDeg || 0);
      }

      this._updateGroupBox();
      this.emit('pivot', { owner, pivotX:px, pivotY:py });

    } else if (S.kind === 'transfer'){
      const box0 = this._groupBounds(S.group);
      let L = box0.left + S.dx;
      let T = box0.top  + S.dy;
      let W = box0.width;
      let H = box0.height;

      if (this.snap && isFn(this.snap.computeForRect)){
        const res = this.snap.computeForRect({ left:L, top:T, width:W, height:H }, { preview:true });
        if (res && res.rect){
          L = res.rect.left;
          T = res.rect.top;
          W = res.rect.width;
          H = res.rect.height;
        }
      }

      if (this.ghostEl){
        Object.assign(this.ghostEl.style, {
          left: _px(L),
          top:  _px(T),
          width:_px(W),
          height:_px(H),
          display:'block'
        });
      }
      this._moveTarget = { L, T, W, H };

      if (this.drag.targetSelector){
        this._updateTransferHover(d.x, d.y, d.originalEvent || ev);
      }

      this.emit('transfer:drag', { group: S.group.map(g=>g.owner), x:d.x, y:d.y });

    } else if (S.kind === 'rect' || S.kind === 'circle'){
      const kind = S.kind;
      const sx = S.sx;
      const sy = S.sy;
      const ex = d.x;
      const ey = d.y;
      this._showMarquee(kind, sx, sy, ex, ey);

      const x0 = Math.min(sx, ex);
      const y0 = Math.min(sy, ey);
      const w  = Math.max(0, Math.abs(ex - sx));
      const h  = Math.max(0, Math.abs(ey - sy));
      const box = { left:x0, top:y0, width:w, height:h };

      const items = this._itemsInBox(box, kind);
      if (this.selection && this.selection.set){
        const mode = this._S.marqueeMode || 'replace';
        // Ctrl (toggle) → sadece dragEnd'de uygulayacağız, burada preview yok
        if (mode === 'add' || mode === 'replace'){
          this.selection.set(items, mode, true);
        }
      }
      this._updateGroupBox();
      this.emit('select:preview', { kind, items });
    }
  }

  _onDragEnd(ev){
    const d = ev.detail || {};
    const e = d.originalEvent || ev;
    const S = this._S;
    if (!S || S.mode !== 'drag') return;
    this._tapSuppressedUntil = Date.now() + 50;

    if (S.kind === 'move'){
      const willCopy = !!(e && e.ctrlKey) && !e.shiftKey;
      const box0 = this._groupBounds(S.group);
      const tgt  = this._moveTarget || { L: box0.left + S.dx, T: box0.top + S.dy, W: box0.width, H: box0.height };
      const dL = tgt.L - box0.left;
      const dT = tgt.T - box0.top;

      const newItems = [];

      for (const it of S.group){
        const node = it.el;
        if (!node) continue;
        const L = it.base.L + dL;
        const T = it.base.T + dT;

        if (willCopy){
          const owner = it.owner;
          let dupOwner = null;
          let dupEl = null;

          if (owner && typeof deepCopy === 'function'){
            try{
              dupOwner = deepCopy(owner);
              dupEl = dupOwner && (dupOwner.el || dupOwner.htmlObject) || null;
            }catch(_){}
          }
          if (!dupEl){
            dupEl = node.cloneNode(true);
          }
          if (dupEl){
            const parent = node.parentElement || this.root;
            Object.assign(dupEl.style, {
              position:'absolute',
              left:_px(L),
              top:_px(T)
            });
            parent.appendChild(dupEl);
            const item = dupOwner || dupEl.owner || dupEl;
            if (item) newItems.push(item);
          }
        } else {
          const st = node.style;
          st.left = _px(L);
          st.top  = _px(T);
        }
      }

      if (willCopy && newItems.length && this.selection && this.selection.set){
        // kopyalananlar seçili kalsın
        this.selection.set(newItems, 'replace', true);
      }

      if (this.ghostEl) this.ghostEl.style.display = 'none';
      this._moveTarget = null;
      for (const it of S.group){ _class(it.el, false, 'moving'); }
      this.emit('move:end', { group: S.group.map(g=>g.owner) });
      this._updateGroupBox();
      if (this.history && this.history.end) this.history.end('interact:move');

    } else if (S.kind === 'resize'){
      for (const it of S.group){ _class(it.el, false, 'resizing'); }
      this.emit('resize:end', { group: S.group.map(g=>g.owner), edgeMask: S.edgeMask });
      this._updateGroupBox();
      if (this.history && this.history.end) this.history.end('interact:resize');

    } else if (S.kind === 'rotate'){
      this.emit('rotate:end', { group: S.group.map(g=>g.owner) });
      this._updateGroupBox();
      if (this.history && this.history.end) this.history.end('interact:rotate');

    } else if (S.kind === 'pivot'){
      if (S.pivotOwner){
        this.emit('pivot:end', { owner: S.pivotOwner });
      }
      this._updateGroupBox();

    } else if (S.kind === 'transfer'){
      const willCopy = !!(e && e.ctrlKey) && !e.shiftKey;
      const box0 = this._groupBounds(S.group);
      const tgt  = this._moveTarget || { L: box0.left + S.dx, T: box0.top + S.dy, W: box0.width, H: box0.height };
      const dL = tgt.L - box0.left;
      const dT = tgt.T - box0.top;

      const newItems = [];
      const dropT = S.dropTarget;

      if (dropT && this.drag.accept && this.drag.accept(S.group.map(g=>g.owner), dropT, e)){
        const ctxEv = Object.assign({}, e || {}, { ctrlKey: willCopy, data: S.dragData });
        this.drag.onDrop && this.drag.onDrop(S.group.map(g=>g.owner), dropT, ctxEv, { data:S.dragData });
        // select duplicates if copy
        if (willCopy && this.selection && this.selection.set){
          let picks = [];
          if (this._S && Array.isArray(this._S.dropNewNodes) && this._S.dropNewNodes.length){
            picks = this._S.dropNewNodes.map(n=> n.owner || n);
          } else if (dropT && dropT.querySelectorAll){
            const nn = Array.from(dropT.querySelectorAll('[data-tcloned="1"]'));
            picks = nn.map(n=> n.owner || n);
          }
          if (picks.length){
            this.selection.set(picks, 'replace', true);
          }
          // cleanup clone markers
          if (dropT && dropT.querySelectorAll){
            Array.from(dropT.querySelectorAll('[data-tcloned]')).forEach(n=> n.removeAttribute('data-tcloned'));
          }
          if (this._S) this._S.dropNewNodes = [];
        }

        this.emit('transfer:drop', { target: dropT, group: S.group.map(g=>g.owner) });
      } else {
        if (willCopy){
          for (const it of S.group){
            const node = it.el;
            if (!node) continue;
            const L = it.base.L + dL;
            const T = it.base.T + dT;
            const owner = it.owner;
            let dupOwner = null;
            let dupEl = null;
            if (owner && typeof deepCopy === 'function'){
              try{
                dupOwner = deepCopy(owner);
                dupEl = dupOwner && (dupOwner.el || dupOwner.htmlObject) || null;
              }catch(_){}
            }
            if (!dupEl){
              dupEl = node.cloneNode(true);
            }
            if (dupEl){
              const parent = node.parentElement || this.root;
              Object.assign(dupEl.style, {
                position:'absolute',
                left:_px(L),
                top:_px(T)
              });
              parent.appendChild(dupEl);
              const item = dupOwner || dupEl.owner || dupEl;
              if (item) newItems.push(item);
            }
          }
        } else {
          for (const it of S.group){
            const node = it.el;
            if (!node) continue;
            const st = node.style;
            st.left = _px(it.base.L + S.dx);
            st.top  = _px(it.base.T + S.dy);
          }
        }

        if (willCopy && newItems.length && this.selection && this.selection.set){
          this.selection.set(newItems, 'replace', true);
        }

        this.emit('transfer:cancel', { group: S.group.map(g=>g.owner) });
      }

      if (this.ghostEl) this.ghostEl.style.display = 'none';
      for (const it of S.group){ _class(it.el, false, this.drag.activeClass); }
      if (this.history && this.history.end) this.history.end('interact:transfer');
      this._updateGroupBox();

    } else if (S.kind === 'rect' || S.kind === 'circle'){
      const kind = S.kind;
      const sx = S.sx;
      const sy = S.sy;
      const ex = d.x;
      const ey = d.y;

      const x0 = Math.min(sx, ex);
      const y0 = Math.min(sy, ey);
      const w  = Math.max(0, Math.abs(ex - sx));
      const h  = Math.max(0, Math.abs(ey - sy));
      const box = { left:x0, top:y0, width:w, height:h };

      const items = this._itemsInBox(box, kind);

      if (this.selection && this.selection.set){
        const mode = S.marqueeMode || 'replace';
        if (mode === 'toggle'){
          const baseIds = Array.isArray(S.baseIds) ? S.baseIds.slice() : [];
          const map = new Map();
          for (const id of baseIds){
            map.set(String(id), true);
          }
          const selIds = [];
          for (const o of items){
            const el = o && (o.el || o.htmlObject || o);
            if (!el) continue;
            const id = (el.getAttribute && el.getAttribute('data-id')) || el.id || null;
            if (id != null) selIds.push(String(id));
          }
          for (const id of selIds){
            if (map.has(id)) map.delete(id);
            else map.set(id, true);
          }
          const finalIds = Array.from(map.keys());
          this.selection.set(finalIds, 'replace', true);
        } else {
          this.selection.set(items, mode, true);
        }
      }

      const finalItems = this._getSelItems();
      this.emit('select:end', { kind, items: finalItems });
      this._hideMarquee();
      this._updateGroupBox();
    }

    S.mode = 'none';
    S.kind = 'none';
    S.group = [];
    S.edgeMask = 0;
    S.dropTarget = null;
    S.dragData = null;
    this._moveTarget = null;
    S.marqueeKind = null;
    S.marqueeMode = 'replace';
    S.baseIds = null;
    S.rotateCenter = null;
    S.rotateBaseDeg = 0;
    S.rotateEachBase = [];
    S.pivotOwner = null;
    S.pivotBox = null;
    S.pivotBaseDeg = 0;
  }

  _onMove(ev){
    const d = ev.detail || {};
    const S = this._S;
    if (!S || S.mode !== 'drag') return;
    if (S.kind === 'transfer' && this.drag.targetSelector){
      this._updateTransferHover(d.x, d.y, d.originalEvent || ev);
    }
  }

  /* ---------------- transfer hover ---------------- */

  _updateTransferHover(x, y, ev){
    const S = this._S;
    const root = this.root;
    const under = _under(root, x, y);
    let target = under;
    if (this.drag.targetSelector && target && target.closest){
      target = target.closest(this.drag.targetSelector);
    }
    const old = S.dropTarget;
    if (old === target) return;
    if (old && old.classList) old.classList.remove(this.drag.overClass);
    if (target){
      const ok = !this.drag.accept || this.drag.accept(S.group.map(g=>g.owner), target, ev);
      if (ok && target.classList){
        target.classList.add(this.drag.overClass);
        S.dropTarget = target;
        this.emit('transfer:enter', { target });
      } else {
        S.dropTarget = null;
      }
    } else {
      S.dropTarget = null;
    }
    if (old && old !== target){
      this.emit('transfer:leave', { target: old });
    }
  }

  /* ---------------- group box + handles ---------------- */

  _updateGroupBox(){
    const items = this._getSelItems();
    if (!items || !items.length){
      if (this.groupBox) this.groupBox.style.display = 'none';
      return;
    }

    let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
    for (const it of items){
      const el = it && (it.el || it.htmlObject || it);
      if (!el || !el.getBoundingClientRect) continue;
      const r = el.getBoundingClientRect();
      if (r.left < L) L = r.left;
      if (r.top  < T) T = r.top;
      if (r.right > R) R = r.right;
      if (r.bottom> B) B = r.bottom;
    }
    if (!isFinite(L) || !isFinite(T) || !isFinite(R) || !isFinite(B)){
      if (this.groupBox) this.groupBox.style.display = 'none';
      return;
    }

    const baseRect = this.overlay.getBoundingClientRect();
    const x = L - baseRect.left;
    const y = T - baseRect.top;
    const w = R - L;
    const h = B - T;

    const gb = this.groupBox;
    if (!gb) return;
    Object.assign(gb.style, {
      left: _px(x),
      top:  _px(y),
      width:_px(w),
      height:_px(h),
      display:'block'
    });

    const handles = _ensureHandles(gb);
    // show rotate only if any selected item has status.rotatable === true
    const anyRotatable = items && items.some(it=>{
      const owner = it && (it.owner || it);
      const st = owner && owner.status || {};
      const locked = !!(st.disabled || st.locked);
      return !locked && st.rotatable !== false;
    });

    // pivot handle only for single, pivotEditable item
    let anyPivot = false;
    let pivotX = 0.5;
    let pivotY = 0.5;
    if (items && items.length === 1){
      const it0 = items[0];
      const owner0 = it0 && (it0.owner || it0);
      const st0 = owner0 && owner0.status || {};
      const locked0 = !!(st0.disabled || st0.locked);
      if (!locked0 && (st0.pivotEditable !== false)){
        anyPivot = true;
        if (typeof owner0.pivotX === 'number') pivotX = owner0.pivotX;
        if (typeof owner0.pivotY === 'number') pivotY = owner0.pivotY;
        if (pivotX < 0) pivotX = 0; else if (pivotX > 1) pivotX = 1;
        if (pivotY < 0) pivotY = 0; else if (pivotY > 1) pivotY = 1;
      }
    }

    for (const hEl of handles){
      const pos = hEl.getAttribute('data-handle');

      if (pos === 'pivot'){
        if (!anyPivot){
          hEl.style.display = 'none';
        } else {
          const px = (pivotX * 100) + '%';
          const py = (pivotY * 100) + '%';
          Object.assign(hEl.style, {
            position:'absolute',
            width:'10px',
            height:'10px',
            border:'1px solid #fff',
            background:'#2d7ff9',
            borderRadius:'50%',
            boxSizing:'border-box',
            pointerEvents:'auto',
            left:px,
            top:py,
            transform:'translate(-50%, -50%)',
            cursor:'move',
            display:'block'
          });
        }
        continue;
      }

      if (pos === 'rot'){
        Object.assign(hEl.style, {
          position:'absolute',
          width:'10px',
          height:'10px',
          border:'1px solid #fff',
          background:'#2d7ff9',
          borderRadius:'50%',
          boxSizing:'border-box',
          pointerEvents: anyRotatable ? 'auto' : 'none',
          left:'50%',
          top:'-24px',
          transform:'translateX(-50%)',
          cursor:'grab',
          display: anyRotatable ? 'block' : 'none'
        });
        continue;
      }

      Object.assign(hEl.style, {
        position:'absolute',
        width:'8px',
        height:'8px',
        border:'1px solid #fff',
        background:'#2d7ff9',
        boxSizing:'border-box',
        pointerEvents:'auto'
      });

      if (pos === 'n'){
        hEl.style.left = '50%';
        hEl.style.top = '-4px';
        hEl.style.transform = 'translateX(-50%)';
        hEl.style.cursor = 'ns-resize';
      } else if (pos === 's'){
        hEl.style.left = '50%';
        hEl.style.bottom = '-4px';
        hEl.style.transform = 'translateX(-50%)';
        hEl.style.cursor = 'ns-resize';
      } else if (pos === 'w'){
        hEl.style.left = '-4px';
        hEl.style.top = '50%';
        hEl.style.transform = 'translateY(-50%)';
        hEl.style.cursor = 'ew-resize';
      } else if (pos === 'e'){
        hEl.style.right = '-4px';
        hEl.style.top = '50%';
        hEl.style.transform = 'translateY(-50%)';
        hEl.style.cursor = 'ew-resize';
      } else if (pos === 'nw'){
        hEl.style.left = '-4px';
        hEl.style.top = '-4px';
        hEl.style.cursor = 'nwse-resize';
      } else if (pos === 'ne'){
        hEl.style.right = '-4px';
        hEl.style.top = '-4px';
        hEl.style.cursor = 'nesw-resize';
      } else if (pos === 'sw'){
        hEl.style.left = '-4px';
        hEl.style.bottom = '-4px';
        hEl.style.cursor = 'nesw-resize';
      } else if (pos === 'se'){
        hEl.style.right = '-4px';
        hEl.style.bottom = '-4px';
        hEl.style.cursor = 'nwse-resize';
      }
    }
  }

  /* ---------------- cancel ---------------- */

  _cancelAll(reason='cancel'){
    const S = this._S || {};
    if (this.ghostEl) this.ghostEl.style.display = 'none';
    this._hideMarquee();
    if (S.group && Array.isArray(S.group)){
      for (const it of S.group){
        try{
          const el = it.el;
          if (!el) continue;
          el.classList.remove('moving','resizing', this.drag.activeClass);
        }catch(_){}
      }
    }
    if (S.dropTarget && S.dropTarget.classList){
      S.dropTarget.classList.remove(this.drag.overClass);
    }
    // temel state reset
    S.mode = 'none';
    S.kind = 'none';
    S.group = [];
    S.edgeMask = 0;
    S.dropTarget = null;
    S.dragData = null;
    // rotate/pivot state reset
    S.rotateCenter = null;
    S.rotateBaseDeg = 0;
    S.rotateEachBase = [];
    S.pivotOwner = null;
    S.pivotBox = null;
    S.pivotBaseDeg = 0;
    this._moveTarget = null;
    this.emit('cancel', { reason });
  }

  /* ---------------- selection helpers ---------------- */

  setSelection(sel){
    if (sel instanceof Tselection){
      this.selection = sel;
    }
    return this;
  }

  clearSelection(){
    if (this.selection && this.selection.clear){
      this.selection.clear(true);
    }
    return this;
  }

  select(...items){
    if (!this.selection) return this;
    const flat = [];
    for (const it of items){
      if (Array.isArray(it)) flat.push(...it);
      else if (it != null) flat.push(it);
    }
    if (this.selection.set){
      this.selection.set(flat, 'replace', true);
    }
    return this;
  }


/* ---------------- align ---------------- */

alignSelection(mode, options){
  const opt = (options && typeof options === 'object') ? options : {};
  const target = opt.target || 'selection';

  if (!mode || typeof mode !== 'string') return;

  const items = this._getSelItems();
  if (!items || !items.length) return;

  const group = [];
  for (const it of items){
    const owner = _owner(it);
    const el = owner && (owner.el || owner.htmlObject || owner);
    if (!el || !el.getBoundingClientRect) continue;

    const st = owner && owner.status || {};
    if (st && st.alignable === false) continue;
    if (st && st.movable === false) continue;

    const r = _rect(el);
    if (!r) continue;
    group.push({ owner, el, rect:r });
  }

  if (!group.length) return;

  // selection bounding box (world coords)
  let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
  for (const g of group){
    const r = g.rect;
    if (r.left   < L) L = r.left;
    if (r.top    < T) T = r.top;
    if (r.right  > R) R = r.right;
    if (r.bottom > B) B = r.bottom;
  }
  if (!Number.isFinite(L) || !Number.isFinite(T) || !Number.isFinite(R) || !Number.isFinite(B)) return;
  const selBox = { left:L, top:T, width:R-L, height:B-T };

  // target box
  let targetBox = selBox;
  if (target === 'canvas'){
    const root = (this.overlayMode === 'viewport')
      ? ((this.root && this.root.ownerDocument && this.root.ownerDocument.documentElement) || this.root)
      : this.root;
    const rb = _rect(root);
    if (rb) targetBox = rb;
  } else if (target === 'first'){
    targetBox = group[0].rect;
  } else if (target && target.ownerDocument){
    const rb = _rect(target);
    if (rb) targetBox = rb;
  }

  const m = mode.toLowerCase();

  const moveX =
    m === 'left' || m === 'right' ||
    m === 'center' || m === 'centre' ||
    m === 'hcenter' || m === 'centerx';

  const moveY =
    m === 'top' || m === 'bottom' ||
    m === 'middle' || m === 'center' ||
    m === 'vcenter' || m === 'centery';

  if (!moveX && !moveY) return;

  const resolved = [];

  for (const g of group){
    const r = g.rect;
    let nx = r.left;
    let ny = r.top;

    if (moveX){
      if (m === 'left'){
        nx = targetBox.left;
      } else if (m === 'right'){
        nx = targetBox.left + targetBox.width - r.width;
      } else {
        nx = targetBox.left + (targetBox.width - r.width) / 2;
      }
    }

    if (moveY){
      if (m === 'top'){
        ny = targetBox.top;
      } else if (m === 'bottom'){
        ny = targetBox.top + targetBox.height - r.height;
      } else {
        ny = targetBox.top + (targetBox.height - r.height) / 2;
      }
    }

    resolved.push({ owner:g.owner, el:g.el, left:nx, top:ny });
  }

  if (!resolved.length) return;

  if (this.history && this.history.begin) this.history.begin('interact:align');

  for (const it of resolved){
    const st = it.el.style || {};
    if (!st.position) st.position = 'absolute';
    st.left = _px(it.left);
    st.top  = _px(it.top);
  }

  this._updateGroupBox();
  this.emit('align', {
    mode,
    target,
    items: resolved.map(r=> r.owner)
  });

  if (this.history && this.history.end) this.history.end('interact:align');
}

  /* ---------------- serialization ---------------- */

  toMinJSON(){
    const C = this.constructor;
    const cls = (C && (C.$class || C.name)) || 'Tinteract';
    const opts = {
      move: this.move,
      resize: this.resize,
      drag: {
        mode: this.drag.mode,
        outsideToTransfer: this.drag.outsideToTransfer
      }
    };
    return { type: cls, args: [ { ...opts } ] };
  }

  toJSON(){
    const C = this.constructor;
    const type = (C && (C.$ns ? (C.$ns + ':') : '') + (C.$class || C.name)) || 'Tinteract';
    return {
      type,
      state: {
        mode: this._S.mode,
        kind: this._S.kind,
        move: this.move,
        resize: this.resize,
        drag: { mode: this.drag.mode }
      }
    };
  }

});

export default { Tinteract };


// demo.advanced.js — core15 gelişmiş demo
// Tapp + Troot + Telement + Tinteract birlikte kullanımı için örnek.

import { Tapp } from '../core15/Tapp.js';
import { Telement } from '../core15/Telement.js';

// Küçük helper: layer içinden saf DOM el veya Telement döndürmek
function getLayerRoot(app, name){
  const root = app.get && app.get('root');
  if (!root) return null;
  const layer = root.getLayer ? root.getLayer(name) : null;
  if (layer && layer.el) return layer.el;
  if (root.layers) return root.layers(name);
  return null;
}

// Demo sahnesini kur
export function TdemoAdvancedBoot(){
  if (typeof document === 'undefined') return;

  Tapp.boot({
    profile: 'editor',

    scene: {
      // Bu ID'li elemana mount eder; yoksa config.CORE_DEFAULTS devreye girer
      mountEl: '#stage',
      root: { tag:'div', class:'tapp-root demo-advanced-root' }
    },

    // Selection servisi: çoklu seçim + marquee
    selection: {
      mode: 'multi',
      marquee: {
        enabled: true,
        kind: 'rect'
      }
    },

    // Interact: drag, resize, rotate, snap vs.
    interact: {
      handles: {
        enabled: true,
        rotate: true,
        size: 8
      },
      resize: {
        pad: 6,
        minW: 24,
        minH: 24
      },
      drag: {
        // Alt ile drag, Ctrl ile kopya, Shift ile grid ignore gibi düşünebilirsin
        copyKey:  (e)=> e && e.ctrlKey,
        gridStep: 8
      },
      keys: {
        // Bunlar Tinteract.keys ile birleştirilir (Object.assign)
        multi:  (e)=> e && (e.ctrlKey || e.metaKey),
        range:  (e)=> e && e.shiftKey,
        circle: (e)=> e && e.altKey,
        drag:   (e)=> e && e.altKey
      }
    }
  }).then(app => {
    if (typeof window !== 'undefined'){
      window.app = app;
    }

    const contentHost = getLayerRoot(app, 'content') || document.body;

    // === 1) Basit kutular ===================================================
    const box1 = new Telement('div', {
      parent: contentHost,
      name: 'box:red',
      className: 'demo-box demo-box-red',
      style: {
        left: '80px',
        top: '80px',
        width: '120px',
        height: '80px',
        position: 'absolute'
      },
      selectable: true,
      movable: true,
      resizable: true,
      designMode:true
    });

    const box2 = new Telement('div', {
      parent: contentHost,
      name: 'box:green',
      className: 'demo-box demo-box-green',
      style: {
        left: '260px',
        top: '120px',
        width: '160px',
        height: '100px',
        position: 'absolute'
      },
      selectable: true,
      movable: true,
      resizable: true,
      designMode:true
    });

    const box3 = new Telement('div', {
      parent: contentHost,
      name: 'box:blue',
      className: 'demo-box demo-box-blue',
      style: {
        left: '180px',
        top: '240px',
        width: '100px',
        height: '120px',
        position: 'absolute'
      },
      selectable: true,
      movable: true,
      resizable: true,
      designMode:true
    });

    // === 2) Gruplama örneği (container içinde child'lar) ====================
    const group = new Telement('div', {
      parent: contentHost,
      name: 'group:panel',
      className: 'demo-group',
      style: {
        left: '460px',
        top: '120px',
        width: '220px',
        height: '160px',
        position: 'absolute',
        borderRadius: '8px'
      },
      selectable: true,
      movable: true,
      resizable: true,
      designMode:true
    });

    const gInner = group.el;

    const gChild1 = new Telement('div', {
      parent: gInner,
      name: 'group:child1',
      className: 'demo-box demo-box-small',
      style: {
        left: '16px',
        top: '20px',
        width: '60px',
        height: '40px',
        position: 'absolute'
      },
      selectable: true,
      movable: true,
      resizable: true,
      designMode:true,
    });
gChild1.el.innerHTML = '<div style="font-size:10px;width:80%;height:80%;border:red solid 2px;text-align:center">Child 1</div>';
    const gChild2 = new Telement('div', {
      parent: gInner,
      name: 'group:child2',
      className: 'demo-box demo-box-small',
      style: {
        left: '120px',
        top: '70px',
        width: '70px',
        height: '50px',
        position: 'absolute'
      },
      selectable: true,
      movable: true,
      resizable: true,
      designMode:true,
    });

    // === 3) Statü/özellikleri farklı örnekler ===============================
    const locked = new Telement('div', {
      parent: contentHost,
      name: 'locked',
      className: 'demo-box demo-box-locked',
      style: {
        left: '120px',
        top: '420px',
        width: '180px',
        height: '60px',
        position: 'absolute'
      },
      selectable: true,
      movable: false,   // sadece seçilebilir, taşınamaz
      resizable: false,
      designMode:true,
    });

    const nonSelectable = new Telement('div', {
      parent: contentHost,
      name: 'non-selectable',
      className: 'demo-box demo-box-disabled',
      style: {
        left: '360px',
        top: '420px',
        width: '160px',
        height: '60px',
        position: 'absolute'
      },
      selectable: false,
      movable: false,
      resizable: false,
      designMode:true,
    });

    // Status flag'lerini direkt değiştirerek demo
    if (locked.status){
      locked.status.resizable = false;
      locked.status.movable   = false;
    }
    if (nonSelectable.status){
      nonSelectable.status.selectable = false;
      nonSelectable.status.movable    = false;
      nonSelectable.status.resizable  = false;
    }

    // === 4) Basit stil ekleme ===============================================
    const css = `
.demo-advanced-root{
  background:#f8f8fb;
}

.demo-box{
  box-sizing:border-box;
  border:1px solid #888;
  background:rgba(255,255,255,0.9);
  border-radius:4px;
  user-select:none;
}

.demo-box-red{    border-color:#d44; background:rgba(255,200,200,0.9); }
.demo-box-green{  border-color:#2a5; background:rgba(200,255,200,0.9); }
.demo-box-blue{   border-color:#36c; background:rgba(200,220,255,0.9); }

.demo-group{
  box-sizing:border-box;
  border:2px dashed #999;
  background:rgba(240,240,255,0.8);
}

.demo-box-small{
  border-radius:3px;
}

.demo-box-locked{
  border-style:dotted;
  background:repeating-linear-gradient(
    -45deg,
    #eee, #eee 4px,
    #ddd 4px, #ddd 8px
  );
}

.demo-box-disabled{
  opacity:0.4;
  border-style:dashed;
}
`;
    try{
      const styleEl = document.createElement('style');
      styleEl.type = 'text/css';
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }catch(_){}

  }).catch(err => {
    console.error('TdemoAdvancedBoot error:', err);
  });
}

// DOM yüklendiğinde otomatik çalıştırmak istersen:
if (typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', () => {
    TdemoAdvancedBoot();
  });
}

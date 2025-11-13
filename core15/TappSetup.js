// core15/TappSetup.js

import { Troot } from './Troot.js';
import { Tselection } from './Tselection.js';
import { Tinteract } from './Tinteract.js';
import { TstyleRegistry } from './TstyleRegistry.js';
import { defaultLayers } from './layers.defaults.js';
import { config } from './config.js';

class TappSetup {

  /**
   * Ana kurulum noktası.
   *  - root + host
   *  - layer'lar
   *  - selection + interact
   *  - default CSS
   */
  static apply(app, defs = {}){
    const cfg = defs || {};

    // 1) root + host
    const root = this.ensureRoot(app, cfg);

    // 2) layer'lar
    const scene = (cfg && cfg.scene) || {};
    const order =
      (scene && scene.layers && scene.layers.order) ||
      cfg.order ||
      defaultLayers;

    this.ensureLayers(root, order);

    // 3) interact + selection (daha önce yoksa)
    if (!(app && app.get && app.get('interact'))){
      const selCfg = (cfg && cfg.selection) || {};
      const intCfg = (cfg && cfg.interact)  || {};
      this.installInteract(app, root, { selection: selCfg, interact: intCfg });
    }

    // 4) default stil
    try{
      TstyleRegistry?.injectOnce?.();
    }catch{}

    return app;
  }

  /**
   * Root (Troot) ve host (DOM node) kurulumunu yapar.
   *  - app.root yoksa yeni Troot oluşturur
   *  - mountEl seçer: defs.mountEl → scene.mountEl → CORE_DEFAULTS.scene.mountEl → '#stage'
   *  - mountEl yoksa root cfg'ye göre otomatik bir div yaratır (tag/class)
   *  - root'u mount eder
   *  - app.set('host', mountEl) ile host'u kaydeder
   */
  static ensureRoot(app, defs = {}){
    let root = app && app.get && app.get('root');
    if (!root){
      root = new Troot('div', { name: 'root' });
      app && app.set && app.set('root', root);
    }

    const sceneCfg = (defs && defs.scene) || {};
    let mountEl = null;

    // 1) Doğrudan DOM node verilmişse
    if (defs && defs.mountEl && defs.mountEl.nodeType === 1){
      mountEl = defs.mountEl;

    } else if (typeof document !== 'undefined'){
      // 2) selector önceliği
      let selector = null;

      if (defs && typeof defs.mountEl === 'string'){
        selector = defs.mountEl;
      } else if (typeof sceneCfg.mountEl === 'string'){
        selector = sceneCfg.mountEl;
      } else if (
        config &&
        config.CORE_DEFAULTS &&
        config.CORE_DEFAULTS.scene &&
        typeof config.CORE_DEFAULTS.scene.mountEl === 'string'
      ){
        selector = config.CORE_DEFAULTS.scene.mountEl;
      } else {
        selector = '#stage';
      }

      // 3) Varsa DOM'da bul
      if (selector){
        mountEl = document.querySelector(selector);
      }

      // 4) Yoksa root cfg'ye göre otomatik yarat
      if (!mountEl){
        const rootCfg =
          sceneCfg.root ||
          (config &&
           config.CORE_DEFAULTS &&
           config.CORE_DEFAULTS.scene &&
           config.CORE_DEFAULTS.scene.root) ||
          { tag: 'div', class: 'tapp-root' };

        const tagName = rootCfg.tag || 'div';
        mountEl = document.createElement(tagName);

        if (rootCfg.class){
          mountEl.className = rootCfg.class;
        }

        if (selector && selector[0] === '#'){
          mountEl.id = selector.slice(1);
        } else if (selector && selector[0] === '.'){
          const cls = selector.slice(1);
          if (!mountEl.className.includes(cls)){
            mountEl.className = (mountEl.className ? mountEl.className + ' ' : '') + cls;
          }
        }

        if (document.body){
          document.body.appendChild(mountEl);
        }
      }

    } else if (typeof document !== 'undefined'){
      mountEl = document.body;
    }

    // 5) root'u host'a mount et
    if (mountEl){
      try{
        root.mount(mountEl);
      }catch{
        const node = root && (root.el || root.host) || null;
        if (node && node.nodeType === 1 && !mountEl.contains(node)){
          mountEl.appendChild(node);
        }
      }

      // host bilgisini app içine yaz
      try{
        app && app.set && app.set('host', mountEl);
      }catch{}
    }

    // 6) rootLayer / layer alias
    try{
      app && app.set && app.set('rootLayer', root).set('layer', root);
    }catch{}

    return root;
  }

  /**
   * Root altında layer'ların (background/base/content/overlay/selection vs)
   * garanti altına alınması.
   */
  static ensureLayers(root, order){
    const list = Array.isArray(order) && order.length
      ? order
      : defaultLayers;

    if (!root || typeof root.ensureSubLayers !== 'function'){
      return root;
    }

    try{
      root.ensureSubLayers(list, {
        pointerPolicy: {
          background: 'none',
          base:       'auto',
          content:    'auto',
          overlay:    'none',
          selection:  'none'
        }
      });
    }catch{}

    return root;
  }

  /**
   * Selection + Interact kurulumunu yapar.
   * opts iki şekilde gelebilir:
   *  - { selection:{...}, interact:{...} }
   *  - { move:{...}, resize:{...}, drag:{...}, ... } (direkt interact cfg)
   */
  static installInteract(app, root, opts = {}){
    // 1) Host seçimi: önce app.host, sonra root, sonra body
    const host =
      (app && app.get && app.get('host')) ||
      (root && (root.el || root.host)) ||
      (typeof document !== 'undefined' ? document.body : null);

    // 2) cfg iki formatı da destekliyor
    const hasNested = opts && (opts.selection || opts.interact);

    const selCfg = hasNested
      ? (opts.selection || {})
      : {};

    const intCfg = hasNested
      ? (opts.interact || {})
      : (opts || {});

    // 3) Selection + history
    const selection = new Tselection(selCfg);
    const history   = (app && app.get && app.get('history')) || null;

    // 4) Interact options:
    //    - base defaults
    //    - kullanıcı interact cfg
    //    - selection + history override
    const baseOpts = {
      overlayMode: 'root',
      attach: 'overlay'
    };

    const interactOpts = Object.assign(
      {},
      baseOpts,
      intCfg || {},
      {
        selection,
        history
      }
    );

    const interact = new Tinteract(host, interactOpts);

    // 5) app içine kaydet
    if (app && app.set){
      app
        .set('selection', selection)
        .set('interact',  interact);
    }

    return interact;
  }

}

export { TappSetup };

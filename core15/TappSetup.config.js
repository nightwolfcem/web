// core14/TappSetup.config.js (fix: no-await, static imports)
import { config } from './config.js';
import { TglobalLayers } from './TglobalLayers.js';
import { TappSetup } from './TappSetup.js';
import { Telement } from './Telement.js';
import { Tselection } from './Tselection.js';
import { TpointerController } from './TpointerController.js';
import { Tinteract } from './Tinteract.js';

if (!TappSetup.__config_augmented){
  const __origApply = TappSetup.apply;
  TappSetup.apply = function(app, defs){
    const res = config && typeof config.resolve==='function' ? config.resolve(app, defs) : { defaults: (app?.get?.('defaults')||{}) };
    const defaults = res.defaults || {};
    const out = __origApply ? __origApply.call(this, app, defs) : app;

    try{
      const root = app?.get?.('root');
      const host = root && (root.el || root.host);
      if (root && host){
        const lay = defaults?.scene?.layers || {};
        const pp  = lay?.pointerPolicy || { content:'auto', overlay:'none', selection:'none' };
        root.ensureSubLayers(lay?.subLayers ?? true, { pointerPolicy: pp });
        app.set && app.set('rootLayer', root).set('layer', root);
      }

      if (defaults?.scene?.bodyLayers?.enabled){
        const Te = (typeof globalThis!=='undefined' && globalThis.Telement) || Telement;
        TglobalLayers.install(app, Te, defaults.scene.bodyLayers);
      }

      if (!app.get('interact') && host){
        const Sel = (typeof globalThis!=='undefined' && globalThis.Tselection) || Tselection;
        const Ptr = (typeof globalThis!=='undefined' && globalThis.TpointerController) || TpointerController;
        const Int = (typeof globalThis!=='undefined' && globalThis.Tinteract) || Tinteract;

        const selection = new Sel();
        const pointer   = new Ptr(host, defaults?.interact || {});
        const resolve   = { idOf: (el)=> el?.closest?.('[data-id]')?.getAttribute('data-id') || null,
                            getById: (id)=> host?.querySelector?.(`[data-id="${String(id)}"]`) || null };
        const interact  = new Int(host, { selection, pointer, layer: root, resolve });
        app.set('selection', selection).set('pointer', pointer).set('interact', interact);
      }

      // CSS baseline tokens
      const tokens = defaults?.scene?.styles?.tokens || {};
      const css = `.selected{outline:1px dashed var(--select-color,#4a90e2);outline-offset:-1px}
.tinteract-overlay .marquee-rect{position:absolute;border:1px dashed var(--marquee-color,#4a90e2);background:rgba(0,0,0,.08);pointer-events:none}`;
      const tagId = 'core14-defaults-tokens';
      if (typeof document !== 'undefined'){
        let tag = document.querySelector(`style[data-id="${tagId}"]`);
        if (!tag){
          tag = document.createElement('style');
          tag.setAttribute('data-id', tagId);
          (document.head||document.documentElement).appendChild(tag);
        }
        const tokenCSS = Object.entries(tokens).map(([k,v])=>`${k}:${v}`).join(';');
        tag.textContent = `:root{${tokenCSS}}\n${css}`;
      }
    }catch(e){}

    return out;
  };
  Object.defineProperty(TappSetup, '__config_augmented', { value:true });
}

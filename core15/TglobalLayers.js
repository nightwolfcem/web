import { subLayers } from './/ensureBodySublayers.js';
export const TglobalLayers = {
  install(app, Telement, bodyCfg){
    if (!Telement || !document?.body) return null;
    const root = new Telement({ name:'global-root', host: document.body });
    const spec = Array.isArray(bodyCfg?.list) ? bodyCfg.list : true;
    subLayers.ensure(root, spec, { pointerPolicy: bodyCfg?.pointerPolicy || {} });
    const api = {
      root,
      get(name){
        const el = root.layers ? root.layers(name) : (root.slots && root.slots[name]) || null;
        return el;
      }
    };
    if (app && typeof app.set==='function'){
      const g = app.get && app.get('globals') || {};
      g.bodyLayers = api; app.set('globals', g);
    }
    return api;
  }
};
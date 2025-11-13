// config.js — core15
// Amaç:
// - Uygulamanın çalışma profilini tanımlamak (ör. 'editor', 'viewer').
// - Çekirdek defaults (CORE_DEFAULTS) ile kullanıcı override'larını birleştirmek.
// - Profil bazlı ek/kapama kurallarını uygulamak (örn. viewer = readonly).
// - Ortam bilgisini (env.mode dev/prod) eklemek.
// - Tapp.boot() gibi giriş noktalarına tek bir "finalConfig" sağlamak.
//
// ÖNEMLİ KURALLAR:
// - Bu bir sınıf DEĞİL. Bu yüzden T-önek kullanmıyoruz. Sadece plain module.
// - T-önek sadece gerçek sınıf export'larında (Tapp, Telement, Tlayer, ...).
// - resolve(userConfig) her zaman nihai config döner.
//
// Varsayılan şema kabaca:
// {
//   profile: 'editor',
//   env: { mode:'dev' },
//   scene: {
//     mountEl:'#stage',
//     root:{tag:'div',class:'tapp-root'},
//     layers:{order:['background','base','content','overlay','selection']},
//     styles:{ tokens:{}, baseCSS:[...] }
//   },
//   services: {
//     history:{enabled:true}, shortcut:{enabled:true}, ...
//   }
// }

// 1. Çekirdek varsayılanlar (sistemin güvenli başlangıç değeri)
const CORE_DEFAULTS = {
  profile: "editor",
  env: {
    // Ortam modu: node varsa process.env.NODE_ENV al, yoksa 'dev'
    mode: (typeof process !== "undefined" &&
           process.env &&
           process.env.NODE_ENV) || "dev"
  },
  scene: {
    mountEl: "#stage",
    root: { tag: "div", class: "tapp-root" },
    layers: {
      order: ["background","base","content","overlay","selection"]
    },
    styles: {
      // tokens: CSS değişkenleri örn { "--grid":"8px" }
      tokens: {},
      // baseCSS: sahneye enjekte edilmesi gereken temel stiller
      baseCSS: [
        ".tapp-root{background:#fff; font:13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial;}"
      ]
    }
  },
  services: {
    history:   { enabled:true },
    persist:   { enabled:true, autosave:true },
    selection: { enabled:true },
    snap:      { enabled:true, grid:8 },
    pointer:   { enabled:true },
    interact:  { enabled:true },
    serializer:{ enabled:true, events:true },
    clipboard: { enabled:true },
    shortcut:  { enabled:true },
    inspector: { enabled:true, panelEl:"#inspector" },
    theme:     { enabled:true }
  }
};

// 2. Profil setleri
// Farklı kullanım modları. 'viewer' mesela sadece bakar, düzenleyemez.
// Burada sadece farklar tanımlanır; CORE_DEFAULTS üstüne biner.
const PROFILES = {
  editor: {
    services: {
      history:   { enabled:true },
      shortcut:  { enabled:true },
      inspector: { enabled:true }
    }
  },
  viewer: {
    services: {
      history:   { enabled:false },
      shortcut:  { enabled:false },
      inspector: { enabled:false },
      interact:  { enabled:false },
      selection: { enabled:false }
    }
  }
};

// Basit kopyalama merge helper (shallow).
// over içindeki tanımlı alanlar base'i ezer.
function mergeShallow(base, over){
  const out = { ...base };
  if (!over || typeof over !== "object") return out;
  for (const k of Object.keys(over)){
    if (over[k] === undefined) continue;
    out[k] = over[k];
  }
  return out;
}

// Bizim ihtiyacımız olan derinlik kadar merge.
// CORE_DEFAULTS + userConfig -> cfg
function mergeConfig(base, over){
  if (over == null) return structuredClone(base);

  const out = structuredClone(base);

  // profile
  if (over.profile !== undefined) out.profile = over.profile;

  // env
  if (over.env){
    out.env = mergeShallow(out.env || {}, over.env);
  }

  // scene
  if (over.scene){
    out.scene = out.scene || {};

    if (over.scene.mountEl !== undefined){
      out.scene.mountEl = over.scene.mountEl;
    }

    if (over.scene.root){
      out.scene.root = mergeShallow(out.scene.root || {}, over.scene.root);
    }

    if (over.scene.layers){
      out.scene.layers = mergeShallow(out.scene.layers || {}, over.scene.layers);
    }

    if (over.scene.styles){
      out.scene.styles = out.scene.styles || {};

      // tokens object merge
      if (over.scene.styles.tokens){
        out.scene.styles.tokens = mergeShallow(
          out.scene.styles.tokens || {},
          over.scene.styles.tokens
        );
      }

      // baseCSS array concat
      if (over.scene.styles.baseCSS){
        const baseArr = Array.isArray(out.scene.styles.baseCSS)
          ? out.scene.styles.baseCSS
          : [];
        const addArr  = Array.isArray(over.scene.styles.baseCSS)
          ? over.scene.styles.baseCSS
          : [];
        out.scene.styles.baseCSS = baseArr.concat(addArr);
      }
    }
  }

  // services (history, selection, snap, ...)
  if (over.services){
    out.services = out.services || {};
    for (const [svcName, svcCfg] of Object.entries(over.services)){
      const prev = out.services[svcName] || {};
      out.services[svcName] = mergeShallow(prev, svcCfg);
    }
  }

  return out;
}

// Profil katmanı uygula: cfg.profile 'viewer' ise
// PROFILES.viewer.services -> cfg.services üzerine shallow merge edilir.
function applyProfileLayer(finalCfg){
  const profName = finalCfg.profile || "editor";
  const profData = PROFILES[profName];
  if (!profData) return finalCfg;

  if (profData.services){
    finalCfg.services = finalCfg.services || {};
    for (const [svcName, svcCfg] of Object.entries(profData.services)){
      const prev = finalCfg.services[svcName] || {};
      finalCfg.services[svcName] = mergeShallow(prev, svcCfg);
    }
  }

  return finalCfg;
}

// Ortam modunu hesapla, eğer kullanıcı override etmediyse.
function detectEnv(){
  return (typeof process !== "undefined" &&
          process.env &&
          process.env.NODE_ENV) || "dev";
}

// Dışarı tekil profil snapshot'ı döndür (debug/UI amaçlı).
function getProfile(name){
  const p = PROFILES[name];
  return p ? structuredClone(p) : undefined;
}

// resolve(userConfig)
// 1) CORE_DEFAULTS
// 2) userConfig override
// 3) profile layer uygula (viewer/editor farklılıkları)
// 4) env.mode finalle
function resolve(userConfig){
  let cfg = mergeConfig(CORE_DEFAULTS, {});
  cfg = mergeConfig(cfg, userConfig || {});
  cfg = applyProfileLayer(cfg);

  cfg.env = cfg.env || {};
  if (!cfg.env.mode){
    cfg.env.mode = detectEnv();
  }

  return cfg;
}

// Dışarı verdiğimiz API
// Kullanım:
//   import { config } from './config.js';
//   const finalCfg = config.resolve(userCfg);
//   const profInfo = config.getProfile('editor');
export const config = {
  CORE_DEFAULTS,
  PROFILES,
  resolve,
  mergeConfig,
  getProfile,
  detectEnv
};

export default config;

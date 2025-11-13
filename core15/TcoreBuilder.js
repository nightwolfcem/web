// TcoreBuilder.js
// createAppWithProfile(profileName?, config?)
// Tek satırla çalışan bir core12 app kurar.

import CLASS from "./CLASS.js";
import { TcoreProfiles } from "./TcoreProfiles.js";

import { Tapp } from "./Tapp.js";
import { TappSetup } from "./TappSetup.js";

/**
 * internal helper:
 * "history" -> "installHistory"
 * "pointer" -> "installPointer"
 */
function inferInstallerFnName(serviceName){
  return "install" + serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
}

/**
 * createAppWithProfile
 *
 * @param profileName  "editor" | "viewer" | "debug"
 * @param config
 *   {
 *     app: {...},        // new Tapp(app)
 *     setup: {...},      // TappSetup.apply(app, setup)
 *     services: {        // servis bazlı opsiyonlar
 *       history:{...},
 *       persist:{...},
 *       snap:{...},
 *       inspector:{...},
 *       ...
 *     }
 *   }
 *
 * @returns app (Tapp instance)
 */
export async function createAppWithProfile(profileName = "editor", config = {}){
  // 1. app instance
  const appConfig   = config.app   || {};
  const setupConfig = config.setup || {};
  const svcConfig   = config.services || {};

  const app = new Tapp(appConfig);

  // 2. sahne / root / layer / default styles / policies
  //   TappSetup core12'de CLASS(...) ile wraplenmiş bir sınıf.
  //   Bootstrap mantığı static TappSetup.apply(app, defaults) içinde.
  if (TappSetup && typeof TappSetup.apply === "function"){
    TappSetup.apply(app, setupConfig);
  }

  // 3. profil servis listesini al
  const list = TcoreProfiles[profileName];
  if (!list){
    throw new Error("Unknown profile: " + profileName);
  }

  // 4. her servisi sırayla bağla
  for (const serviceName of list){
    // dinamik modülü getir
    const moduleNS = await CLASS.install(serviceName, { base: CLASS.installBase });

    // modül içindeki installer fonksiyon adını çıkar
    const fnName = inferInstallerFnName(serviceName);
    const installerFn = moduleNS && moduleNS[fnName];

    if (typeof installerFn === "function"){
      const perServiceCfg = svcConfig[serviceName] || {};
      installerFn(app, perServiceCfg);
    }
  }

  // 5. bitti
  return app;
}

export default createAppWithProfile;

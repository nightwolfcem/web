/** TcoreBuilder.d.ts
 *
 * createAppWithProfile(profileName?, config?)
 *
 * profileName:
 *   TcoreProfiles içindeki key'lerden biri:
 *   "editor" | "viewer" | "debug" | vb.
 *
 * config:
 *   {
 *     app: {...},
 *     setup: {...},
 *     services: {
 *       history:   {...},
 *       persist:   {...},
 *       snap:      {...},
 *       inspector: {...},
 *       ...
 *     }
 *   }
 *
 * return:
 *   Hazır bağlı Tapp instance (undo/redo, selection, pointer, snap,
 *   serialize, persist/autosave, clipboard, shortcut kısayolları,
 *   inspector panel sync vs profile ne gerektiriyorsa).
 *
 * Örnek kullanım:
 *
 *   import { createAppWithProfile } from "./TcoreBuilder.js";
 *
 *   const app = await createAppWithProfile("editor", {
 *     setup: {
 *       mountEl: document.querySelector('#stage')
 *     },
 *     services: {
 *       history:   { limit: 200 },
 *       persist:   { autosave: true },
 *       snap:      { grid: 8, guide: true },
 *       inspector: { panelEl: document.querySelector('#inspector-panel') }
 *     }
 *   });
 */

import { TcoreProfileMap } from "./TcoreProfiles.js";

/**
 * Her servis için opsiyonlar.
 * Buradaki alanlar opsiyoneldir. Module kendi installX içinde kullanır.
 *
 * Örnek:
 *  - history.limit            : history stack limit'i
 *  - persist.autosave         : true ise history değiştikçe otomatik kaydet
 *  - snap.grid / snap.guide   : snap davranışı için grid/snapping ayarları
 *  - inspector.panelEl        : inspector UI'nın bağlanacağı panel DOM elementi
 *  - pointer.dragThreshold    : pointer controller için hassasiyet
 */
export interface TcoreBuilderServiceConfigMap {
  [serviceName: string]: any;

  history?: {
    limit?: number;
    [key: string]: any;
  };

  selection?: {
    [key: string]: any;
  };

  pointer?: {
    dragThreshold?: number;
    [key: string]: any;
  };

  snap?: {
    grid?: number;
    guide?: boolean;
    [key: string]: any;
  };

  serializer?: {
    [key: string]: any;
  };

  persist?: {
    autosave?: boolean;
    storage?: any;
    [key: string]: any;
  };

  clipboard?: {
    [key: string]: any;
  };

  shortcut?: {
    [key: string]: any;
  };

  inspector?: {
    panelEl?: any;
    [key: string]: any;
  };
}

/**
 * createAppWithProfile(config) opsiyon objesi
 *
 * app:
 *   new Tapp(app) çağrısına gider.
 *
 * setup:
 *   TappSetup(app, setup) içine gider.
 *   mountEl gibi sahneye bağlanacak DOM node'u vs buradan verilebilir.
 *
 * services:
 *   Her servis kurulumunda installX(app, services[serviceName]) olarak aktarılır.
 */
export interface TcoreBuilderOptions {
  app?: any;
  setup?: any;
  services?: TcoreBuilderServiceConfigMap;
}

/**
 * createAppWithProfile(profileName?, config?)
 */
export declare function createAppWithProfile(
  profileName?: keyof TcoreProfileMap | string,
  config?: TcoreBuilderOptions
): Promise<any>;

export default createAppWithProfile;

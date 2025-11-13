/**
 * Troot.d.ts
 * ---------------------------------------------------------------------------
 * Uygulama kök elemanı (Telement tabanlı). fileciteturn128file2
 *
 * Bu sınıf tipik olarak sayfanın en üst seviye container'ı olur. Şunları yapar:
 *
 *  - DOM'a mount olup kendi .el'ini yaratır (tagName default 'div').
 *  - document.title ve <meta name="..."> etiketlerini yönetir
 *    (applyHead(), setTitle(), setMeta(), mergeMeta()).
 *  - attach(container) ile kendini istenen parent içine ekler (container
 *    doğrudan HTMLElement olabilir ya da .el alanı olan bir nesne olabilir).
 *  - mount(target,opts) → base Telement.mount() çağırır ve sonra head bilgisi
 *    (title/meta) DOM <head>'e senkronize edilir. fileciteturn128file2
 *
 * Not:
 *  - Görsel layout / stil / children yönetimi Telement üzerinden gelir.
 *    Troot sadece "sayfa kökü"ne özgü metadata/head tarafını ekler. fileciteturn128file2
 */

import type { Telement } from './Telement.js';

/** Troot oluştururken geçilebilen opsiyonlar. */
export interface TrootInitProps {
  /** document.title olarak da yansıtılacak başlık. */
  title?: string;
  /**
   * <meta name="k" content="v"> şeklinde head içine yazılacak meta bilgileri.
   * İlk kurulumda kopyalanır; daha sonra setMeta()/mergeMeta() ile güncellenir.
   */
  meta?: Record<string, any>;
  /** Diğer serbest alanlar Telement ctor'una paslanır. */
  [key: string]: any;
}

/**
 * Troot
 * -----
 * Telement'i genişletir ve sayfa/head metadata yönetimi ekler. fileciteturn128file2
 */
export class Troot extends (Telement as { new(...args:any[]): any }) {
  /** Gerçek DOM tag adı ('div', 'main', ...). */
  tagName: string;

  /** document.title ile senkron tutulan başlık. null → başlık yok. */
  title: string | null;

  /**
   * meta[name="..."] eşleştirmesine göre tutulur.
   * mergeMeta/setMeta çağrılarıyla güncellenir ve <head>'e yazılır.
   */
  meta: Record<string, any>;

  constructor(tag?: string, props?: TrootInitProps);

  /* ----------------------------------------------------------------------
   * Head / metadata yönetimi
   * ------------------------------------------------------------------- */

  /**
   * applyHead()
   * -----------
   * - document.title = this.title (varsa)
   * - this.meta içindeki her (k→v) için:
   *     <meta name="k" content="v"> oluştur / güncelle
   * Bu metod mount()/attach() sonrasında da çağrılır ki head güncel olsun.
   * chainable.
   */
  applyHead(): this;

  /**
   * setTitle(t)
   * -----------
   * this.title = t; mümkünse document.title'ı da günceller.
   * null/undefined verirsen title temizlenmiş kabul edilir.
   * chainable.
   */
  setTitle(t: any): this;

  /**
   * setMeta(k,v)
   * ------------
   * this.meta[k] = v; sonra (mümkünse) <meta name="k"> etiketini oluşturup
   * content=v yapar.
   * chainable.
   */
  setMeta(k: any, v: any): this;

  /**
   * mergeMeta(obj)
   * --------------
   * obj içindeki tüm {k:v} çiftlerini setMeta(k,v) ile uygular.
   * chainable.
   */
  mergeMeta(obj: Record<string, any>): this;

  /* ----------------------------------------------------------------------
   * Mount / attach
   * ------------------------------------------------------------------- */

  /**
   * attach(container)
   * -----------------
   * Eğer henüz this.el yoksa document.createElement(tagName) yapar,
   * className'e 'Troot' ekler, this.el.owner=this.
   * Sonra verilen container'a appendChild eder.
   * Ardından applyHead() çağrılır.
   *
   * container bir HTMLElement olabilir
   *   ya da {el:HTMLElement} gibi bir wrapper da olabilir.
   *
   * chainable.
   */
  attach(container: HTMLElement | { el?: HTMLElement } | null): this;

  /**
   * mount(target,opts?)
   * -------------------
   * Telement.mount(target,opts) çağrısını yapar,
   * sonra applyHead() çağırıp <head>'i günceller.
   *
   * @returns this (Telement.mount dönüşünü forward eder)
   */
  mount(
    target: any,
    opts?: Record<string, any>
  ): any;

  /* ----------------------------------------------------------------------
   * Serialize
   * ------------------------------------------------------------------- */

  /**
   * toMinJSON()
   * -----------
   * Hafif snapshot.
   * { type:'Troot', args:[ tagName, {title,meta} ] }
   * Bu, persist/serializer sisteminin yeniden kurarken ihtiyaç duyacağı
   * minimal bilgiyi taşır. fileciteturn128file2
   */
  toMinJSON(): any;

  /**
   * toJSON()
   * --------
   * Daha okunabilir debugging snapshot.
   * { type:'ns:Troot', tag, title, meta:{...} }  benzeri. fileciteturn128file2
   */
  toJSON(): any;
}

/**
 * Runtime modülde `export default { Troot }` var.
 * Burada default export aynı shape'i taklit eder: { Troot }. fileciteturn128file2
 */
declare const _default: {
  Troot: typeof Troot;
};
export default _default;

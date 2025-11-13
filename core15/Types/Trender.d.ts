/**
 * Trender.d.ts
 * ---------------------------------------------------------------------------
 * Mini VDOM renderer / patcher. fileciteturn128file1
 *
 * Amaç:
 *  - `Trender.h(tag, props, ...children)` ile hafif vnode ağaçları kur,
 *  - `render(vnode)` diyerek DOM'a diff uygula,
 *  - key destekli children diff yap,
 *  - inline event handler'ları (`onClick`, `onInput` gibi) otomatik
 *    addEventListener/removeEventListener ile yönet,
 *  - style/class/attr güncellemelerini minimal patch ile yap,
 *  - `html(raw)` ile kök container'ın innerHTML'ini tek shotta değiştirme,
 *  - `mount/unmount/clear` yardımcılarıyla DOM kökünü kontrol et.
 *
 * Bu renderer React/Vue kadar kapsamlı bir lifecycle sunmaz; state'i kendi
 * tutmaz. Sadece verdiğin vnode ağacını gerçek DOM ile eşleştirir ve
 * bir önceki vnode ile farkını uygular. fileciteturn128file1
 */

/**
 * Bir sanal düğüm (vnode).
 *
 * - tag        : 'div', 'span', 'canvas' vs.
 * - props      : { id:'a', class:'box', onClick:fn, style:{left:'10px'} }
 * - children   : alt vnode/primitive listesi
 *
 * Render sonrası runtime objesi şu alanlarla zenginleşir:
 * - _el        : karşılık gelen gerçek DOM Element veya Text node
 * - key        : diff için anahtar (props.key)
 * - children   : child vnode referansları (patch sonrası)
 *
 * Text node için vnode aslında { _el:Text, _text:'hello' } şeklinde
 * tutulur. String/number child verdiğinde Trender bu formata çevirir. fileciteturn128file1
 */
export interface TrenderVNode {
  tag?: string;
  props?: Record<string, any>;
  children?: any[];
  _el?: Element | Text;
  _text?: string;
  key?: any;
  [key: string]: any;
}

/**
 * Trender
 * -------
 * Kullanım örneği:
 *
 *   import Trender from './Trender.js';
 *
 *   const R = new Trender(document.getElementById('app'));
 *
 *   function view(state){
 *     return Trender.h('div', { class:'wrap' },
 *       Trender.h('h1', null, 'Hello ', state.user),
 *       Trender.h('button', { onClick:()=>alert('ok') }, 'OK')
 *     );
 *   }
 *
 *   R.render(view({user:'Cem'}));
 *
 *   // DOM'a direkt HTML basmak istersen:
 *   R.html('<p>raw mode</p>');
 *
 *   // root değiştir:
 *   R.setRoot(document.querySelector('#other'));
 *
 * Diff kuralları (özet):
 *   - null/false newV → eski node kaldırılır
 *   - primitive (string/number) → Text node'a normalize edilir
 *   - array → fragment gibi ele alınır, sıralı olarak patch edilir
 *   - element vnode → aynı tag ise props diff + keyed children diff
 *   - props.*:
 *       • style:{...} → inline style diff
 *       • class / className → el.className
 *       • onX → event listener add/remove
 *       • diğerleri → attribute veya property set
 *   - children diff'te props.key (veya .key) baz alınır. Eşleşen key'li
 *     çocuklar yeniden kullanılır; key'sizler sıraya göre eşleştirilir. fileciteturn128file1
 */
export class Trender {
  /** Kök DOM elementi. Varsayılan: document.body */
  root: Element | null;

  /** Son render() sonrası saklanan vnode ağacı. */
  protected _old: TrenderVNode | TrenderVNode[] | null;

  constructor(root?: Element | null);

  /* ----------------------------------------------------------------------
   * Statik yardımcılar
   * ------------------------------------------------------------------- */

  /**
   * h(tag, props, ...children)
   * --------------------------
   * Sanal düğüm (vnode) üretir.
   *
   * @param tag       örn. 'div'
   * @param props     null veya { id:'x', class:'a', onClick:fn, style:{...} }
   * @param children  içeriği (string/number/vnode[])
   *
   * @returns TrenderVNode
   *
   * Not: children iç içe array olabilir; otomatik .flat() yapılır. fileciteturn128file1
   */
  static h(
    tag: string,
    props?: Record<string, any> | null,
    ...children: any[]
  ): TrenderVNode;

  /**
   * text(value)
   * -----------
   * Primitive değeri stringe çevirir.
   * @returns string
   *
   * render() sırasında zaten otomatik çağrıldığı için çoğu zaman
   * manuel kullanman gerekmez. fileciteturn128file1
   */
  static text(value: any): string;

  /* ----------------------------------------------------------------------
   * Dış API
   * ------------------------------------------------------------------- */

  /**
   * mount(el)
   * ---------
   * Dışarıda yaratılmış bir element'i mevcut root içine append eder.
   * root !== el ise root.appendChild(el).
   */
  mount(el: Element | null | undefined): void;

  /**
   * unmount(el)
   * -----------
   * Elemanı DOM'dan kaldırır (el.remove()).
   */
  unmount(el: Element | null | undefined): void;

  /**
   * clear()
   * -------
   * root.textContent='' yapar ve internal _old vnode'unu sıfırlar.
   * Yani renderer state'i temizlenir.
   */
  clear(): void;

  /**
   * setRoot(root)
   * -------------
   * Yeni kök container ayarla. chainable.
   */
  setRoot(root: Element | null): this;

  /**
   * render(vnode)
   * -------------
   * Verilen vnode ağacını root'a uygular (diff+patch) ve bu vnode'u
   * yeni _old olarak saklar.
   *
   * @param vnode   TrenderVNode | string | number | array
   * @returns       Internalize edilmiş vnode
   *
   * Not: render() aynı Trender instance'ında tekrar tekrar çağrılabilir;
   * her seferinde yalnızca farklar DOM'a uygulanır. fileciteturn128file1
   */
  render(
    vnode: any
  ): TrenderVNode | TrenderVNode[] | null;

  /**
   * html(raw)
   * ---------
   * root.innerHTML = raw; _old=null.
   * Çok hızlı "tam reset ve ham HTML bas" durumları için.
   */
  html(raw: string): void;
}

/**
 * Runtime modülde `export const Trender = ...` ve `export default Trender`
 * var. Varsayılan export doğrudan sınıfın kendisidir. fileciteturn128file1
 */
declare const _default: typeof Trender;
export default _default;

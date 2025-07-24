import { TpositionedElement } from './TpositionedElement.js';
/**
* Göreceli konumlandırılmış (position: relative) elementler için özel sınıf.
*/
export class TrelativeElement extends TpositionedElement {
constructor(options = {}) {
super("div", { position: 'relative', ...options });
this.htmlObject.classList.add('trelative-element');
// Göreceli elementler genellikle targetElement'e göre değil, normal akışa göre konumlanır,
// ancak yine de bir güncelleme mekanizması ekleyelim.
this.updatePosition();
this._updateHandler = () => this.updatePosition();
window.addEventListener('resize', this._updateHandler, true);
}
updatePosition() {
// Göreceli konumlandırma için özel bir mantık gerekirse buraya eklenebilir.
// Örneğin, bir hedefe göre `left` ve `top` değerlerini ayarlamak.
if (!this.targetElement) return;
this.alignToObjectRect(this.targetElement, this.align); // Bu metodun TpositionedElement'te olması gerekir.
}
destroy() {
window.removeEventListener('resize', this._updateHandler, true);
super.destroy();
}
}

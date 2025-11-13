'use strict';
// --- Seçiciler ---
const SLOT_ATTRS = ['data-slot','data-layer'];
export function slotSelector(name){
  const n = String(name);
  return [
    ...SLOT_ATTRS.map(a => `[${a}="${n}"]`),
    `.t-layer-slot.t-layer-${n}`
  ].join(', ');
}
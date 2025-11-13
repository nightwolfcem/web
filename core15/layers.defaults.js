'use strict';
export const minDefaultLayers = ['content','overlay','selection'];
export const maxDefaultLayers = [
  'background','base','content',
  'tools','widget','mainMenu','dropdown','tooltip','contextMenu',
  'popup','windows','overlay','modal','selection','dragPreview',
  'notification','guide','dialog'
];
export const defaultLayers = ['background','base','content','overlay','selection'];
export const layerPolicy = Object.create(null);
export function applyPointerPolicy(mode='strict'){
  const strict = (name)=> (name==='content' ? 'auto' : 'none');
  const uiAuto = new Set(['content','widget','mainMenu','dropdown','contextMenu','popup','windows','dialog','modal']);
  const pick   = (name)=> (mode==='ui' ? (uiAuto.has(name) ? 'auto' : 'none') : strict(name));
  const all = new Set([...defaultLayers, ...maxDefaultLayers]);
  for (const name of all){
    layerPolicy[name] = { pointer: pick(name) };
    if (name==='content') layerPolicy[name].scroll = true;
  }
}
applyPointerPolicy('strict');
export function layerIndex(name){
  const n = String(name||'');
  let i = defaultLayers.indexOf(n);
  if (i >= 0) return i;
  i = maxDefaultLayers.indexOf(n);
  return i < 0 ? Number.MAX_SAFE_INTEGER : (defaultLayers.length + i);
}
export default { minDefaultLayers, maxDefaultLayers, defaultLayers, layerPolicy, layerIndex, applyPointerPolicy };

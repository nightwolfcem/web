'use strict';

import { defaultLayers, maxDefaultLayers, layerPolicy, layerIndex } from './layers.defaults.js';

// -------------------------------------------------------------
// Ortak selector & root helper
// -------------------------------------------------------------
const SLOT_ATTRS = ['data-slot','data-layer'];

export function slotSelector(name, direct = true){
  const n = String(name);
  const prefix = direct ? ':scope > ' : '';
  return [
    ...SLOT_ATTRS.map(a => `${prefix}[${a}="${n}"]`),
    `${prefix}.t-layer-slot.t-layer-${n}`,
    `${prefix}.tlayer-slot.tlayer-${n}`,
    `${prefix}.tlayer-${n}`
  ].join(',');
}

const SLOT_SEL = (name)=> slotSelector(name, true);

function _root(el){
  if (!el){
    if (typeof document !== 'undefined') return document.body;
    return null;
  }
  if (el.nodeType === 1) return el;
  return el.el || el.host || el.rootEl || (typeof document!=='undefined' ? document.body : null);
}

function _createSlot(name){
  const el = document.createElement('div');
  const layerName = String(name);

  el.setAttribute('data-slot', layerName);
  el.setAttribute('data-layer', layerName);
  el.className = `t-layer-slot t-layer-${layerName}`;

  // Layer root: 0x0 + overflow:visible
  // Böylece layer kendisi görünmeyen bir kök olur; hit alanını alt elemanlar belirler.
  el.dataset.collapsed = '1';
  el.style.width  = '0px';
  el.style.height = '0px';
  el.style.overflow = 'visible';

  return el;
}


// -------------------------------------------------------------
// Temel API (eski dosyadan)
// -------------------------------------------------------------
export function getSlot(root, name){
  const R = _root(root); if (!R) return null;
  return R.querySelector(SLOT_SEL(name));
}

export function ensureBodySublayers(root, { order } = {}){
  const R = _root(root); if (!R) return { root:null, map:{}, list:[] };

  // position:relative garantisi
  try{
    const cs = getComputedStyle(R);
    if (cs.position === 'static') R.style.position = 'relative';
  }catch{}

  const seq = Array.isArray(order) && order.length ? order.slice() : defaultLayers.slice();
  const map = {};

  for (const name of seq){
    let el = getSlot(R, name);
    if (!el){
      el = _createSlot(name);
      R.appendChild(el);
    }
    map[name] = el;
  }

  // layerIndex’e göre sıralama
  const children = Array
    .from(R.children)
    .filter(ch => ch.getAttribute && (ch.getAttribute('data-slot') || ch.getAttribute('data-layer')));

  children.sort((a,b)=>{
    const an = a.getAttribute('data-slot')  || a.getAttribute('data-layer')  || '';
    const bn = b.getAttribute('data-slot')  || b.getAttribute('data-layer')  || '';
    return layerIndex(an) - layerIndex(bn);
  });

  for (const el of children){ R.appendChild(el); }

  return { root:R, map, list: seq.map(n=>map[n]).filter(Boolean) };
}

export function mountIntoSlot(host, targetRoot, slot='content'){
  const H = _root(host);
  const R = _root(targetRoot);
  if (!H || !R) return null;

  const { map } = ensureBodySublayers(R);
  const slotEl = map[slot] || getSlot(R, slot);
  if (!slotEl) return null;

  if (!slotEl.contains(H)) slotEl.appendChild(H);
  return slotEl;
}

export function ensureAndMount(host, targetRoot, { order, slot='content' } = {}){
  const R = _root(targetRoot);
  ensureBodySublayers(R, { order });
  return mountIntoSlot(host, R, slot);
}

// -------------------------------------------------------------
// subLayers.js’ten gelen ekstra helper’lar
// -------------------------------------------------------------
const KNOWN_LAYERS = Array.from(
  new Set([...(defaultLayers || []), ...(maxDefaultLayers || [])])
).filter(Boolean);

const KNOWN_SET = new Set(KNOWN_LAYERS);

function _querySlotAny(host, name){
  // direct değil, subtree içinde de bakmak istersek
  return host?.querySelector?.(slotSelector(name, false)) || null;
}

export function ensureSlot(root, name){
  const R = _root(root); if (!R || !R.ownerDocument) return null;
  let el = getSlot(R, name);
  if (!el){
    el = _createSlot(name);
    R.appendChild(el);
  }
  return el;
}

// spec: true | string[] | {name:true}
export function ensureAllSlots(root, spec, options = {}){
  const R = _root(root); if (!R) return root;

  const superset = KNOWN_LAYERS;
  const order    = uniqMerge(options.order || defaultLayers || [], superset);

  let target;
  if (spec === true){
    target = order;
  } else if (Array.isArray(spec)){
    target = spec.slice();
  } else if (spec && typeof spec === 'object'){
    target = order.filter(n => !!spec[n]);
  } else {
    target = order;
  }

  for (const name of target){
    ensureSlot(R, name);
  }
  return root;
}

function uniqMerge(given = [], superset = []){
  const seen = new Set();
  const out  = [];
  for (const x of given){
    const v = String(x);
    if (!v) continue;
    if (!seen.has(v)){ seen.add(v); out.push(v); }
  }
  for (const x of superset){
    const v = String(x);
    if (!v) continue;
    if (!seen.has(v)){ seen.add(v); out.push(v); }
  }
  return out;
}

// pointer policy: { [layerName]: 'auto' | 'none' }
export function applyPointerPolicy(root, policy = {}){
  // Katman bazlı pointer davranışı artık tamamen DOM sırası ve overlay CSS'i ile yönetiliyor.
  // Bu helper geriye uyum için burada; stil üzerinde değişiklik yapmıyor.
  const R = _root(root); if (!R) return;
}

// layers(host)('content') / layers(host).content
export function mainLayers(root){
  const R = _root(root);

  const get = (key)=>{
    const name = (typeof key === 'number')
      ? (KNOWN_LAYERS[key|0] || '')
      : String(key);
    if (!name) return null;
    return getSlot(R, name) || _querySlotAny(R, name);
  };

  return new Proxy(get, {
    apply: (_t,_this,[k]) => get(k),
    get: (_t, prop) => {
      if (typeof prop === 'string' && KNOWN_SET.has(prop)){
        return get(prop);
      }
      return undefined;
    }
  });
}

// Toplu alias
export const subLayers = {
  slotSelector,
  getSlot,
  ensureSlot,
  ensureBodySublayers,
  ensureAllSlots,
  applyPointerPolicy,
  mainLayers,
  mountIntoSlot,
  ensureAndMount
};

export default {
  ensureBodySublayers,
  getSlot,
  mountIntoSlot,
  ensureAndMount,
  slotSelector,
  ensureSlot,
  ensureAllSlots,
  applyPointerPolicy,
  mainLayers,
  subLayers
};

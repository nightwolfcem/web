'use strict';
// TeventBinder.js — Cem-spec unified (deep-clean)
// TeventBinder — feature-complete event binder for TrendererDom and inline attribute specs.
//
// - Supports explicit specs from TrendererDom nodes:
//     binder.bind(el, { on: { click: 'save' }, events: [{ type:'input', handler: fn, options:{ once:true } }] }, ctx)
// - Supports inline attribute binding by scanning `selectorAttr` (default: 'on'), e.g.:
//     <button on="click:save|once|prevent; input:validate|debounce:200"></button>
// - Safe defaults (opts optional), clean exports, no top-level returns.
// - Emits no side-effects; stores listeners per element in WeakMap for guaranteed unbind.
//
// Dependencies: Tutils helpers.
import { isArr, isFn, isObj, isStr, debounce, resolveGlobal } from './utils.js';

class TeventBinder {
  static defaults = {
    selectorAttr: 'on',     // attribute name to parse when binding by scan
    delegate: false,        // future use: event delegation (not required by TrendererDom spec.bind)
    parse: null,            // custom parser (attrValue:string, el:Element) => Array<{type,handler,options?}>
    policy: {               // sensible passive defaults
      passiveByType: { wheel:true, touchstart:true, touchmove:true, touchend:true }
    },
    map: {}                 // optional handler map { name: fn }
  };

  constructor(opts = {}){
    const base = this.constructor?.defaults ?? TeventBinder.defaults;
    this.opts = { ...base, ...(opts || {}) };
    this.funcs = null;                // optional registry: has get(name):fn
    this._elMap = new WeakMap();      // Element -> Array<{ type, fn, opts }>
  }

  // ---- Context hooks --------------------------------------------------------
  setFuncs(funcs){ this.funcs = funcs || null; }
  setContainer(_el){ /* reserved for delegation mode */ }
  setPolicy(p){ this.opts.policy = { ...(this.opts.policy||{}), ...(p||{}) }; }
  setDelegation(o){ this.opts.delegate = !!(o && o.enabled); }

  // ---- Public API -----------------------------------------------------------
  bind(el, spec, ctx = {}){
    if (!el) return;
    // 1 spec from renderer node
    if (isObj(spec)){
      if (isObj(spec.on)){
        for (const [type, handler] of Object.entries(spec.on)){
          this._attach(el, type, handler, null, ctx);
        }
      }
      if (isArr(spec.events)){
        for (const ev of spec.events){
          if (!ev || !ev.type) continue;
          this._attach(el, ev.type, ev.handler, ev.options || null, ctx);
        }
      }
    }
    // 2 inline attribute on the element
    const attrName = this.opts.selectorAttr || 'on';
    const attrVal = (el.getAttribute?.(attrName)) ?? (el.dataset && el.dataset[attrName]);
    if (isStr(attrVal) && attrVal.trim()){
      const defs = this._parseAttr(attrVal, el);
      for (const def of defs){
        this._attach(el, def.type, def.handler, def.options || null, ctx);
      }
    }
  }

  rebind(el, spec, ctx = {}){
    this.unbind(el);
    this.bind(el, spec, ctx);
  }

  unbind(el){
    const list = this._elMap.get(el);
    if (!list) return;
    for (const rec of list){
      try { el.removeEventListener?.(rec.type, rec.fn, rec.opts?.capture || false); } catch {}
    }
    this._elMap.delete(el);
  }

  unbindNode(/* id */){ /* TrendererDom calls unbind(el) per node; noop here */ }
  unbindAll(){ /* Optional: could track globally if needed */ }

  // ---- Internal helpers -----------------------------------------------------
  _remember(el, rec){
    const list = this._elMap.get(el) || [];
    list.push(rec);
    this._elMap.set(el, list);
  }

  _resolveHandler(ref){
    if (isFn(ref)) return ref;
    if (isStr(ref)){
      // 1 func registry
      try {
        if (this.funcs && isFn(this.funcs.get)){
          const f = this.funcs.get(ref);
          if (isFn(f)) return f;
        }
      } catch {}
      // 2 handler map on options
      const m = this.opts.map || {};
      if (isFn(m[ref])) return m[ref];
      // 3 global scope fallback (window/globalThis)
      const g = (typeof window !== 'undefined' ? window : globalThis);
      const gf = resolveGlobal ? resolveGlobal(ref) : (g && g[ref]);
      if (isFn(gf)) return gf;
    }
    // fallback: noop
    return ()=>{};
  }

  _wrap(handler, el, ctx, options){
    let fn = handler;
    if (options?.debounce){
      const wait = Number(options.debounce) || 0;
      if (wait > 0 && isFn(debounce)){
        fn = debounce(fn, wait);
      }
    }
    // throttle is optional; implement simple edge if provided as numeric
    if (options?.throttle){
      const wait = Number(options.throttle) || 0;
      if (wait > 0){
        let last = 0;
        const orig = fn;
        fn = (...args)=>{
          const now = Date.now();
          if (now - last >= wait){ last = now; return orig(...args); }
        };
      }
    }
    return (ev)=>{
      if (options?.prevent) try{ ev.preventDefault(); }catch{}
      if (options?.stopImmediate) try{ ev.stopImmediatePropagation(); }catch{}
      if (options?.stop)    try{ ev.stopPropagation(); }catch{}
      return fn(ev, { el, node: ctx?.node ?? null, id: ctx?.id ?? null, target: '@self' });
    };
  }

  
  _applyOptions(type, options){
    const pol = (this.opts.policy && this.opts.policy.passiveByType) || {};
    const basePassive = !!pol[type];
    // If handler will call preventDefault, passive MUST be false.
    const wantsPrevent = !!(options && options.prevent);
    const passive = wantsPrevent ? false : (options?.passive != null ? !!options.passive : basePassive);
    return {
      capture: !!options?.capture,
      once:    !!options?.once,
      passive
    };
  }


  _attach(el, type, handlerRef, options, ctx){
    const raw = this._resolveHandler(handlerRef);
    const wrapped = this._wrap(raw, el, ctx, options || {});
    const opts = this._applyOptions(type, options || {});
    el.addEventListener?.(type, wrapped, opts);
    this._remember(el, { type, fn: wrapped, opts });
  }

  _parseAttr(val, el){
    // If a custom parser is supplied, use it
    if (isFn(this.opts.parse)){
      try { const out = this.opts.parse(val, el); if (isArr(out)) return out; } catch {}
    }
    // Default parser: "click:save|once|prevent; input:validate|debounce:200"
    // Split by ';'
    const out = [];
    const items = String(val).split(';');
    for (const itemRaw of items){
      const item = itemRaw.trim();
      if (!item) continue;
      const [left, flagsRaw] = item.split('|', 2);
      const [type, handler] = left.split(':', 2).map(s => (s||'').trim());
      if (!type || !handler) continue;
      const opts = {};
      if (flagsRaw){
        for (const tok of flagsRaw.split('|')){
          const t = tok.trim();
          if (!t) continue;
          const [k,v] = t.split(':', 2);
          const key = k.trim();
          const valNum = v!=null ? Number(v) : undefined;
          if (key === 'once' || key === 'prevent' || key === 'stop' || key === 'capture' || key === 'passive'){
            opts[key] = true;
          } else if (key === 'debounce' || key === 'throttle'){
            if (!isNaN(valNum)) opts[key] = valNum;
          }
        }
      }
      out.push({ type, handler, options: opts });
    }
    return out;
  }
}

// Optional integration hook for CLASS eco-system
function installTo(CLASS){
  const binder = new TeventBinder();
  const api = {
    setFuncs:      (f)=> binder.setFuncs(f),
    setContainer:  (el)=> binder.setContainer(el),
    setPolicy:     (p)=> binder.setPolicy(p),
    setDelegation: (o)=> binder.setDelegation(o),
    bind:          (el,node,ctx)=> binder.bind(el,node,ctx),
    rebind:        (el,node,ctx)=> binder.rebind(el,node,ctx),
    unbind:        (el)=> binder.unbind(el),
    unbindNode:    (id)=> binder.unbindNode(id),
    unbindAll:     ()=> binder.unbindAll(),
    instance: binder
  };
  try { CLASS?.use?.('events', api); } catch {}
  return api;
}

export { TeventBinder, installTo};
export default TeventBinder;

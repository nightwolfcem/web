'use strict';
// Tstyle.js — Cem-spec unified (syntax-safe)
// Component-scoped CSS builder (theme-token aware)

import CLASS from './CLASS.js'
import { isObj, isStr } from './utils.js';

/* helpers */
function _pref(prefix){ const s=String(prefix||''); return s && !s.endsWith('-') ? (s+'-') : s; }
function _tokVar(prefix, key){ return `var(--${_pref(prefix)}${String(key).replace(/[.]/g,'-')})`; }
function _isAtRule(sel){ return /^@/.test(sel); }
function _cssEsc(s){ return String(s).replace(/[\n\r\t]/g,' '); }

function _compileDecls(decls, { tokensPrefix='' } = {}){
  const lines = [];
  for (const k of Object.keys(decls||{})){
    let val = decls[k];
    // token shorthand: "$color.primary" -> var(--<prefix>color-primary)
    if (isStr(val) && val.startsWith('$')){
      const key = val.slice(1);
      val = _tokVar(tokensPrefix, key);
    }
    lines.push(`  ${k}: ${val};`);
  }
  return lines.join('\n');
}

function _compileRules(rules, { scope=':root', tokensPrefix='' } = {}){
  const out = [];
  for (const sel of Object.keys(rules||{})){
    const block = rules[sel];
    if (_isAtRule(sel)){
      if (isObj(block) && isObj(block.rules)){
        out.push(`${sel} {`);
        out.push(_compileRules(block.rules, { scope, tokensPrefix }));
        out.push(`}`);
      } else if (isStr(block)){
        out.push(`${sel} { ${block} }`);
      }
      continue;
    }
    const fullSel = sel.includes('&') ? sel.replace(/&/g, scope) : `${scope} ${sel}`.trim();
    if (isObj(block)){
      out.push(`${fullSel} {`);
      out.push(_compileDecls(block, { tokensPrefix }));
      out.push(`}`);
    } else if (isStr(block)){
      out.push(`${fullSel} { ${block} }`);
    }
  }
  return out.join('\n');
}

export const Tstyle = CLASS(class Tstyle {
  /**
   * @param {string} id
   * @param {object} opts
   *  - scope: selector scope ('.MyComp' or '[data-scope="x"]' or ':root')
   *  - tokensPrefix: CSS var prefix (e.g. 'ui' -> var(--ui-color-primary))
   */
  constructor(id='style', { scope=':root', tokensPrefix='' } = {}){
    this.id = String(id||'style');
    this.scope = String(scope||':root');
    const p = _pref(tokensPrefix);
    this.tokensPrefix = p ? p.slice(0,-1) : ''; // store without trailing '-'
    this.blocks = new Map(); // name -> css string
    this.rules = new Map();  // name -> rules object
  }

  setScope(sel){ this.scope = String(sel||':root'); return this; }
  setTokensPrefix(prefix){ const p=_pref(prefix); this.tokensPrefix = p ? p.slice(0,-1) : ''; return this; }

  /**
   * add(name, rulesOrCss):
   *  - if rules object -> compile later with scope/tokens
   *  - if string -> raw CSS block
   */
  add(name, rulesOrCss){
    const key = String(name||('block-'+(this.blocks.size+this.rules.size+1)));
    if (isObj(rulesOrCss)){
      this.rules.set(key, rulesOrCss);
      this.blocks.delete(key);
    } else {
      this.blocks.set(key, String(rulesOrCss));
      this.rules.delete(key);
    }
    return this;
  }
  remove(name){ const key=String(name); this.blocks.delete(key); this.rules.delete(key); return this; }
  clear(){ this.blocks.clear(); this.rules.clear(); return this; }
  has(name){ return this.blocks.has(String(name)) || this.rules.has(String(name)); }

  toCSS({ scope=this.scope, tokensPrefix=this.tokensPrefix } = {}){
    const chunks = [];
    for (const [name, css] of this.blocks) chunks.push(`/* ${name} */\n${_cssEsc(css)}`);
    for (const [name, rules] of this.rules) chunks.push(`/* ${name} */\n${_compileRules(rules, { scope, tokensPrefix })}`);
    return chunks.join('\n');
  }

  apply(app, { name=null, scope=this.scope, tokensPrefix=this.tokensPrefix } = {}){
    if (!app || typeof app.addCSS !== 'function') return this;
    const css = this.toCSS({ scope, tokensPrefix });
    const nm = String(name || ('style-'+this.id));
    app.addCSS(nm, css, { apply:true });
    return this;
  }
  removeFrom(app, { name=null } = {}){
    if (!app || typeof app.removeCSS !== 'function') return this;
    const nm = String(name || ('style-'+this.id));
    app.removeCSS(nm);
    return this;
  }

  /* direct apply to DOM <style> */
  applyToEl(container=document.head, { styleId=null, scope=this.scope, tokensPrefix=this.tokensPrefix } = {}){
    if (typeof document==='undefined') return this;
    const css = this.toCSS({ scope, tokensPrefix });
    const id = styleId || `Tstyle-${this.id}`;
    let tag = document.getElementById(id);
    if (!tag){
      tag = document.createElement('style');
      tag.type = 'text/css';
      tag.id = id;
      (container || document.head).appendChild(tag);
    }
    tag.textContent = `/* ${this.id} */\n${css}`;
    return this;
  }
  removeStyleTag(styleId=null){
    if (typeof document==='undefined') return this;
    const id = styleId || `Tstyle-${this.id}`;
    const tag = document.getElementById(id);
    if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
    return this;
  }

  /* utilities */
  get(name, def){
    const k = String(name);
    if (this.rules.has(k)) return this.rules.get(k);
    if (this.blocks.has(k)) return this.blocks.get(k);
    return def;
  }
  merge(obj){
    if (!isObj(obj)) return this;
    if (obj.scope) this.scope = String(obj.scope);
    if (obj.tokensPrefix!=null) this.setTokensPrefix(obj.tokensPrefix);
    if (isObj(obj.blocks)) for (const k of Object.keys(obj.blocks)) this.blocks.set(k, String(obj.blocks[k]));
    if (isObj(obj.rules))  for (const k of Object.keys(obj.rules))  this.rules.set(k, obj.rules[k]);
    return this;
  }
  diff(other){
    const out = { addRules:[], removeRules:[], changeRules:[], addBlocks:[], removeBlocks:[], changeBlocks:[] };
    if (!other) return out;
    const aR = new Map(this.rules), bR = new Map(other.rules||[]);
    for (const [k,v] of aR){ if (!bR.has(k)) out.addRules.push(k); else if (JSON.stringify(v)!==JSON.stringify(bR.get(k))) out.changeRules.push(k); }
    for (const [k] of bR){ if (!aR.has(k)) out.removeRules.push(k); }
    const aB = new Map(this.blocks), bB = new Map(other.blocks||[]);
    for (const [k,v] of aB){ if (!bB.has(k)) out.addBlocks.push(k); else if (String(v)!==String(bB.get(k))) out.changeBlocks.push(k); }
    for (const [k] of bB){ if (!aB.has(k)) out.removeBlocks.push(k); }
    return out;
  }

  
});

export default { Tstyle };

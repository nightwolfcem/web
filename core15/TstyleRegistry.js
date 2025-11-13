// TstyleRegistry.js
// (generated)
// Her temel gorunum sinifi static defaultCSS verir ve buraya register edilir.
// injectOnce() DOM hazir oldugunda tek <style> tag'i ile append eder.

const _classSet = new Set();
const _cssSet   = new Set();
let _didInject  = false;

export const TstyleRegistry = {
  register(Cls){
    if (!Cls) return;
    _classSet.add(Cls);
  },

  collectAllCSS(){
    const out = [];
    for (const Cls of _classSet){
      const css = (Cls && Cls.defaultCSS && typeof Cls.defaultCSS==="string")
        ? Cls.defaultCSS.trim()
        : "";
      if (css && !_cssSet.has(css)){
        _cssSet.add(css);
        out.push(css);
      }
    }
    return out.join("\\n\\n");
  },

  injectOnce(){
    if (_didInject) return;
    if (typeof document === "undefined") return;

    const css = this.collectAllCSS();
    if (!css) { _didInject=true; return; }

    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-core-defaults","1");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    _didInject = true;
  }
};

export default TstyleRegistry;

export const config = {
  deepMerge(a,b){
    if (!b) return a;
    if (Array.isArray(a) && Array.isArray(b)) return Array.from(new Set([...a,...b]));
    if (a && typeof a==='object' && b && typeof b==='object'){
      const o = {...a};
      for (const k of Object.keys(b)) o[k] = this.deepMerge(a[k], b[k]);
      return o;
    }
    return (b===undefined)?a:b;
  },
  baseDefaults(){
    return {
      scene:{
        layers:{ subLayers:true, pointerPolicy:{ content:'auto', overlay:'none', selection:'none' } },
        bodyLayers:{ enabled:false, list:['windows','modal','tooltip','contextMenu','popup','notification','guide','dialog','mainMenu','dropdown','overlay','selection'],
          pointerPolicy:{ content:'none', overlay:'auto', selection:'none', windows:'auto', modal:'auto', tooltip:'auto', contextMenu:'auto', popup:'auto', notification:'auto', guide:'auto', dialog:'auto', mainMenu:'auto', dropdown:'auto' } },
        styles:{ tokens:{ '--select-color':'#00bcd4', '--marquee-color':'#00bcd455' } }
      },
      interact:{ dragThreshold:2 }
    };
  },
  resolve(app, options={}){
    const base = this.baseDefaults();
    const overrides = (options && typeof options==='object') ? options : {};
    const defaults = this.deepMerge(base, overrides);
    if (app && typeof app.set==='function') app.set('defaults', defaults);
    return { defaults };
  }
};
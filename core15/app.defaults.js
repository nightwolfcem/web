// app.defaults.js
export const defaults = {
  app: { name: 'DesignTool' },
  root: { tag: 'div', class: 'tapp-root' },

  layers: {
    order: ['background','base','content','overlay','selection'],
    // true → Olayers tam sıralama; ['content','overlay'] → seçmeli; {content:true, overlay:true} → map
    subLayers: true
  },

  styles: {
    loadFiles: [], // örn: ['defaults.css']
    tokens: {
      '--select-color': '#4a90e2',
      '--marquee-color': '#4a90e2'
    },
    base: [
`/* selection highlight */
.selected { outline: 1px dashed var(--select-color, #4a90e2); outline-offset: -1px; }

/* marquee rectangle */
.tinteract-overlay .marquee-rect {
  position: absolute;
  border: 1px dashed var(--marquee-color, #4a90e2);
  background: rgba(74, 144, 226, 0.18);
  pointer-events: none;
}

/* generic element */
.Telement { box-sizing: border-box; user-select: none; }`
    ]
  },

serializer: {
  events: true,
  dom: { enabled: true, attributes: true },
  policy: {
    mode: 'min',
    elementOnly: true,
    includeProps: {
      Tinteract: ['move','resize','drag','overlayMode'],
      Tselection: ['mode','multi','range'],
      Telement: ['id','status','rect','data'],
      Tlayer: ['id','name','visible'],
      Tapp: ['_opts']
    },
    excludeProps: {
      Tinteract: ['_S','ghostEl','overlay','groupBox','_moveTarget','keys','root','selection','history'],
      Telement: ['el','root','__proxy__'],
      Tapp: ['_services','_modules','_plugins','_installMap','_installBase']
    },
    includeClasses: ['Tinteract','Tselection','Telement','Tlayer','Tapp']
  }
},
  history:    { merge: true, squash: true },
  interact:   { dragThreshold: 4 }
};



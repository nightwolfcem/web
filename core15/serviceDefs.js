// serviceDefs.js
// (generated) servis bagimlilik grafigi

export const serviceDefs = {
  history:   { deps: [] },
  persist:   { deps: ['history'] },
  selection: { deps: [] },
  snap:      { deps: [] },
  pointer:   { deps: ['snap'] },
  interact:  { deps: ['pointer','selection','snap'] },
  serializer:{ deps: [] },
  clipboard: { deps: ['serializer','selection','history'] },
  shortcut:  { deps: ['history','selection','clipboard'] },
  inspector: { deps: ['selection','history'] }
};

export default serviceDefs;

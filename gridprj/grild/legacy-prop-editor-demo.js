import '../files/js/src/main.js';
import { TpropEditor as TlegacyPropEditor } from '../files/js/src/ui/prop-editor/TlegacyPropEditor.js';
import {AllClass} from '../files/js/src/core/classUtils.js';
let app,editor;
document.addEventListener('DOMContentLoaded', () => {
  app = document.getElementById('app');
 editor = new TlegacyPropEditor(600, 400,{closeMode:"hide"});

  editor.body(app);
  editor.viewObject(document.body);
  editor.show();

});
 export {app,editor,AllClass};

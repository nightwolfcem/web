import '../files/js/src/main.js';
import { TpropEditor as TlegacyPropEditor } from '../files/js/src/ui/prop-editor/TlegacyPropEditor.js';
import {allClass} from '../files/js/src/core/classUtils.js';
document.addEventListener('DOMContentLoaded', () => {
export  const app = document.getElementById('app');
export  const editor = new TlegacyPropEditor(600, 400,{closeMode:"hide");
export allClass=allClass;
  editor.body(app);
  editor.viewObject(document.body);
  editor.show();

});

import '../files/js/src/main.js';
import { TpropEditor as TlegacyPropEditor } from '../files/js/src/ui/prop-editor/TlegacyPropEditor.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  const editor = new TlegacyPropEditor(600, 400);
  editor.body(app);
  editor.viewObject(document.body);
  editor.show();
});

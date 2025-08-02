import '../files/src/main.js';
import { TpropEditor } from '../files/src/ui/prop-editor/TpropEditor.js';

document.addEventListener('DOMContentLoaded', () => {
  const sample = {
    title: 'Örnek Kutu',
    width: 200,
    height: 120,
    visible: true,
    backgroundColor: '#00ff00'
  };

  const editor = new TpropEditor();
  editor.body();
  editor.showDialog();
  editor.setTarget(sample, 'Sample');
});

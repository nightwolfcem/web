import '../files/js/src/main.js';
import { TStyleEditor } from '../files/js/src/ui/style-editor/TStyleEditor.js';

document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('preview');
  const listContainer = document.getElementById('propList');

  const editor = new TStyleEditor(target, listContainer);
  // Tüm bilinen özellikleri listele
  editor.renderAll();
});


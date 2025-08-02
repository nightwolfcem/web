import '../files/js/src/main.js';
import { StyleEditor } from '../files/js/src/ui/style-editor/StyleEditor.js';

document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('preview');
  const listContainer = document.getElementById('propList');

  const editor = new StyleEditor(target, listContainer);
  // Tüm bilinen özellikleri listele
  editor.renderAll();
});


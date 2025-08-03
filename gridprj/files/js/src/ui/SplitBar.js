export class SplitBar {
  constructor(direction = 'vertical', onStart, onDrag, onEnd) {
    this.direction = direction;
    this.htmlObject = document.createElement('div');
    if (direction === 'vertical') {
      this.htmlObject.style.cssText = 'cursor:col-resize;width:5px;position:absolute;min-width:5px;background-color:#999;height:100%;display:inline-block;overflow:hidden;vertical-align:top;';
    } else {
      this.htmlObject.style.cssText = 'cursor:row-resize;height:5px;position:absolute;min-height:5px;background-color:#999;width:100%;display:block;overflow:hidden;';
    }
    this.htmlObject.addEventListener('mousedown', (e) => {
      e.preventDefault();
      let lastX = e.clientX;
      let lastY = e.clientY;
      onStart?.(e);
      const move = (ev) => {
        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;
        onDrag?.(ev, { dx, dy });
      };
      const stop = (ev) => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', stop);
        onEnd?.(ev);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', stop);
    });
  }
}

window.SplitBar = SplitBar;

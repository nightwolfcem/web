export class TSplitBar {
  constructor(direction = 'vertical', onStartMove, onMove, onEndMove) {
    this.direction = direction;
    this.onStartMove = onStartMove;
    this.onMove = onMove || this.defaultMove.bind(this);
    this.onEndMove = onEndMove;
    this.htmlObject = document.createElement('div');
    if (direction === 'vertical') {
      this.htmlObject.style.cssText =
        'cursor:col-resize;width:5px;position:absolute;min-width:5px;background-color:#999;height:100%;display:inline-block;overflow:hidden;vertical-align:top;';
    } else {
      this.htmlObject.style.cssText =
        'cursor:row-resize;height:5px;position:absolute;min-height:5px;background-color:#999;width:100%;display:block;overflow:hidden;';
    }
    this.htmlObject.addEventListener('mousedown', (e) => {
      e.preventDefault();
      let lastX = e.clientX;
      let lastY = e.clientY;
      this.onStartMove?.(e);
      if (typeof this.htmlObject.onstartmove === 'function') this.htmlObject.onstartmove(e);
      this.htmlObject.dispatchEvent(new CustomEvent('startmove'));
      const move = (ev) => {
        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;
        this.onMove?.(ev, { dx, dy });
      };
      const stop = (ev) => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', stop);
        this.onEndMove?.(ev);
        if (typeof this.htmlObject.onendmove === 'function') this.htmlObject.onendmove(ev);
        this.htmlObject.dispatchEvent(new CustomEvent('endmove'));
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', stop);
    });
  }

  defaultMove(ev, { dx, dy }) {
    const t = this.direction === 'vertical' ? dx : dy;
    if (t !== 0) {
      if (this.direction === 'vertical') {
        const w = parseInt(this.htmlObject.previousSibling.style.width);
        if (w + t >= 30 && this.htmlObject.nextSibling.offsetWidth - t >= 30) {
          this.htmlObject.previousSibling.style.width = w + t + 'px';
          this.htmlObject.nextSibling.style.width = 'calc(100% - ' + (w + t + 7) + 'px)';
        }
      } else {
        const h = parseInt(this.htmlObject.previousSibling.style.height);
        if (h + t >= 30 && this.htmlObject.nextSibling.offsetHeight - t >= 30) {
          this.htmlObject.previousSibling.style.height = h + t + 'px';
          this.htmlObject.nextSibling.style.height = 'calc(100% - ' + (h + t + 7) + 'px)';
        }
      }
    }
  }
}

window.TSplitBar = TSplitBar;

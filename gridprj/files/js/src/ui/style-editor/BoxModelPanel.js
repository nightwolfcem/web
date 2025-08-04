import { ControlFactory } from './ControlFactory.js';
import { setStyleProperty, getStyleProperty } from './styleUtils.js';

const sides = ['top', 'right', 'bottom', 'left'];

export class BoxModelPanel {
    constructor(targetElement, container) {
        this.target = targetElement;
        this.container = container;
        this._buildDiagram();
        this.updateDiagram();
    }

    _buildDiagram() {
        const wrap = document.createElement('div');
        wrap.className = 'box-model-wrapper';
        wrap.style.cssText = 'position:relative;width:200px;height:200px;margin:10px auto;';

        const marginBox = document.createElement('div');
        marginBox.className = 'bm-margin';
        marginBox.style.cssText = 'position:absolute;inset:0;background:rgba(255,200,0,0.2);';

        const borderBox = document.createElement('div');
        borderBox.className = 'bm-border';
        borderBox.style.cssText = 'position:absolute;inset:20px;background:rgba(200,200,255,0.2);border-style:solid;';

        const paddingBox = document.createElement('div');
        paddingBox.className = 'bm-padding';
        paddingBox.style.cssText = 'position:absolute;inset:20px;background:rgba(200,255,200,0.2);';

        const contentBox = document.createElement('div');
        contentBox.className = 'bm-content';
        contentBox.style.cssText = 'position:absolute;inset:20px;background:#fff;';

        paddingBox.appendChild(contentBox);
        borderBox.appendChild(paddingBox);
        marginBox.appendChild(borderBox);
        wrap.appendChild(marginBox);

        marginBox.addEventListener('click', () => this.showControls('margin'));
        borderBox.addEventListener('click', (e)=>{e.stopPropagation();this.showControls('border');});
        paddingBox.addEventListener('click', (e)=>{e.stopPropagation();this.showControls('padding');});
        contentBox.addEventListener('click', (e)=>{e.stopPropagation();this.showControls('content');});

        const ctrlLayer = document.createElement('div');
        ctrlLayer.className = 'box-model-controls';
        ctrlLayer.style.cssText = 'position:relative;width:200px;height:0;margin:0 auto;';

        this.container.appendChild(wrap);
        this.container.appendChild(ctrlLayer);

        this.wrapper = wrap;
        this.marginBox = marginBox;
        this.borderBox = borderBox;
        this.paddingBox = paddingBox;
        this.contentBox = contentBox;
        this.ctrlLayer = ctrlLayer;
    }

    showControls(region) {
        this.ctrlLayer.innerHTML = '';
        const propMap = {
            margin: ['margin-top','margin-right','margin-bottom','margin-left'],
            padding: ['padding-top','padding-right','padding-bottom','padding-left'],
            border: ['border-top-width','border-right-width','border-bottom-width','border-left-width','border-color']
        };
        const props = propMap[region];
        if (!props) return;
        props.forEach((prop, idx) => {
            const ctrl = ControlFactory.createControl(prop, this.target, val => {
                setStyleProperty(this.target.style, prop, val);
                this.updateDiagram();
            });
            const wrap = document.createElement('div');
            wrap.className = `control ${sides[idx] || 'center'}`;
            wrap.style.cssText = 'position:absolute;';
            if (sides[idx]) {
                wrap.style[sides[idx]] = '-30px';
                wrap.style.left = sides[idx] === 'top' || sides[idx] === 'bottom' ? '50%' : undefined;
                wrap.style.top = sides[idx] === 'left' || sides[idx] === 'right' ? '50%' : undefined;
                wrap.style.transform = 'translate(-50%, -50%)';
            } else {
                wrap.style.top = '50%';
                wrap.style.left = '50%';
                wrap.style.transform = 'translate(-50%, -50%)';
            }
            wrap.appendChild(ctrl);
            this.ctrlLayer.appendChild(wrap);
        });
    }

    updateDiagram() {
        const st = this.target.style;
        this.paddingBox.style.paddingTop = getStyleProperty(st,'padding-top');
        this.paddingBox.style.paddingRight = getStyleProperty(st,'padding-right');
        this.paddingBox.style.paddingBottom = getStyleProperty(st,'padding-bottom');
        this.paddingBox.style.paddingLeft = getStyleProperty(st,'padding-left');

        this.borderBox.style.borderTopWidth = getStyleProperty(st,'border-top-width');
        this.borderBox.style.borderRightWidth = getStyleProperty(st,'border-right-width');
        this.borderBox.style.borderBottomWidth = getStyleProperty(st,'border-bottom-width');
        this.borderBox.style.borderLeftWidth = getStyleProperty(st,'border-left-width');
        this.borderBox.style.borderColor = getStyleProperty(st,'border-color');

        this.marginBox.style.marginTop = getStyleProperty(st,'margin-top');
        this.marginBox.style.marginRight = getStyleProperty(st,'margin-right');
        this.marginBox.style.marginBottom = getStyleProperty(st,'margin-bottom');
        this.marginBox.style.marginLeft = getStyleProperty(st,'margin-left');
    }

    applyChange(prop, value) {
        setStyleProperty(this.target.style, prop, value);
        this.updateDiagram();
    }
}
window.BoxModelPanel = BoxModelPanel;

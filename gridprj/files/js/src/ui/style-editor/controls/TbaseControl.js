
export  class TbaseControl {
    constructor(styleProp, meta, targetElement, onChange) {
        this.styleProp = styleProp;
        this.meta = meta;
        this.targetElement = targetElement;
        this.onChange = onChange;

        let init = '';
        if (targetElement && targetElement.style) {
            const styleObj = targetElement.style;
            if (typeof styleObj.getPropertyValue === 'function') {
                init = styleObj.getPropertyValue(styleProp);
            } else {
                init = styleObj[styleProp];
            }
        } else if (targetElement) {
            init = targetElement[styleProp];
        }
        this.initialValue = init || meta?.initial || '';
    }
    render() {
        throw new Error("Render metodu alt sınıfta tanımlanmalıdır.");
    }
}
window.TbaseControl = TbaseControl;
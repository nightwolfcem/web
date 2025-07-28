
export  class TbaseControl {
    constructor(styleProp, meta, targetElement, onChange) {
        this.styleProp = styleProp;
        this.meta = meta;
        this.targetElement = targetElement;
        this.onChange = onChange;
        this.initialValue = targetElement.style[styleProp] || meta?.initial || '';
    }
    render() {
        throw new Error("Render metodu alt sınıfta tanımlanmalıdır.");
    }
}
window.TbaseControl = TbaseControl;
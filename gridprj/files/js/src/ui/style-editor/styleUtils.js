export function setStyleProperty(style, prop, value) {
    if (!style) return;
    if (typeof style.setProperty === 'function') {
        style.setProperty(prop, value);
    } else {
        style[prop] = value;
    }
}

export function getStyleProperty(style, prop) {
    if (!style) return '';
    if (typeof style.getPropertyValue === 'function') {
        return style.getPropertyValue(prop) || '';
    }
    return style[prop] || '';
}

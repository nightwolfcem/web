import { Tcommand } from './Command.js';

/**
 * Birden fazla komutu tek bir geri alınabilir işlem olarak gruplar.
 */
export class TbatchCommand extends Tcommand {
    constructor(commands, label = "Toplu İşlem") {
        super(label);
        this.commands = commands || [];
    }
    do() { this.commands.forEach(cmd => cmd.do()); }
    undo() { [...this.commands].reverse().forEach(cmd => cmd.undo()); }
}

/**
 * Bir Telement'i DOM içinde farklı bir konuma taşır.
 */
export class TmoveCommand extends Tcommand {
    constructor(telement, newParent, oldParent, oldNextSibling, newNextSibling = null) {
        super("Taşı");
        this.telement = telement;
        this.newParent = newParent;
        this.oldParent = oldParent;
        this.oldNextSibling = oldNextSibling;
        this.newNextSibling = newNextSibling;
    }
    _executeMove(targetParent, nextSiblingTelement) {
        const currentParentTelement = this.telement.parent;
        const nextNode = nextSiblingTelement ? nextSiblingTelement.htmlObject : null;
        
        targetParent.htmlObject.insertBefore(this.telement.htmlObject, nextNode);

        // Mantıksal ebeveyn-çocuk ilişkisini güncelle
        if (currentParentTelement?.children) {
            const idx = currentParentTelement.children.indexOf(this.telement);
            if (idx > -1) currentParentTelement.children.splice(idx, 1);
        }
        const insertIndex = nextSiblingTelement ? targetParent.children.indexOf(nextSiblingTelement) : -1;
        targetParent.children.splice(insertIndex > -1 ? insertIndex : targetParent.children.length, 0, this.telement);
        this.telement.parent = targetParent;
    }
    do() { this._executeMove(this.newParent, this.newNextSibling); }
    undo() { this._executeMove(this.oldParent, this.oldNextSibling); }
}

/**
 * Bir Telement'in boyutunu ve konumunu değiştirir.
 */
export class TsizeCommand extends Tcommand {
    constructor(telement, oldSize, newSize) {
        super("Boyut Değiştir");
        this.telement = telement;
        this.oldSize = oldSize;
        this.newSize = newSize;
    }
    _apply(size) {
        if (!size) return;
        Object.assign(this.telement.htmlObject.style, {
            left: `${size.left}px`, top: `${size.top}px`,
            width: `${size.width}px`, height: `${size.height}px`
        });
    }
    do() { this._apply(this.newSize); }
    undo() { this._apply(this.oldSize); }
}

/**
 * Bir Telement'in inline stilini (cssText) değiştirir.
 */
export class TstyleCommand extends Tcommand {
    constructor(telement, oldCssText, newCssText) {
        super("Stil Değişimi");
        this.telement = telement;
        this.oldValue = oldCssText;
        this.newValue = newCssText;
    }
    do() { this.telement.htmlObject.style.cssText = this.newValue; }
    undo() { this.telement.htmlObject.style.cssText = this.oldValue; }
}

/**
 * Bir Telement'in HTML özelliğini (attribute) değiştirir.
 */
export class TattributeCommand extends Tcommand {
    constructor(telement, attrName, oldValue, newValue) {
        super("Özellik Değiştir");
        this.telement = telement;
        this.attrName = attrName;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
    _apply(value) {
        if (value === null || typeof value === 'undefined') {
            this.telement.htmlObject.removeAttribute(this.attrName);
        } else {
            this.telement.htmlObject.setAttribute(this.attrName, value);
        }
    }
    do() { this._apply(this.newValue); }
    undo() { this._apply(this.oldValue); }
}

/**
 * Çocuk ekleme/çıkarma işlemleri için temel sınıf.
 */
class ChildCommand extends Tcommand {
    constructor(parentTelement, childTelement, nextSiblingTelement) {
        super("Çocuk Ekle/Sil");
        this.parent = parentTelement;
        this.child = childTelement;
        this.nextSibling = nextSiblingTelement;
    }
    _insert() {
        const nextNode = this.nextSibling ? this.nextSibling.htmlObject : null;
        this.parent.htmlObject.insertBefore(this.child.htmlObject, nextNode);
        const idx = this.nextSibling ? this.parent.children.indexOf(this.nextSibling) : -1;
        this.parent.children.splice(idx > -1 ? idx : this.parent.children.length, 0, this.child);
        this.child.parent = this.parent;
    }
    _remove() {
        this.parent.htmlObject.removeChild(this.child.htmlObject);
        const idx = this.parent.children.indexOf(this.child);
        if (idx > -1) this.parent.children.splice(idx, 1);
        this.child.parent = null;
    }
}

export class TchildAddCommand extends ChildCommand {
    constructor(...args) { super(...args); this.name = "Çocuk Ekle"; }
    do() { this._insert(); }
    undo() { this._remove(); }
}

export class TchildRemoveCommand extends ChildCommand {
    constructor(...args) { super(...args); this.name = "Çocuk Sil"; }
    do() { this._remove(); }
    undo() { this._insert(); }
}

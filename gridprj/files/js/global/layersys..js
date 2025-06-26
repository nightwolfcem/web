

/**
 * layersys.js – Profesyonel ve Optimize Edilmiş Geçmiş Yönetimi Sistemi
 *
 * Sürüm Notları (Kullanıcı Geri Bildirimlerine Göre):
 * - Throttling: Sık tetiklenen observer'lar için performans optimizasyonu.
 * - Gürültü Filtreleme: `subtree:true` kullanan MutationObserver'da yalnızca doğrudan çocukları işleme.
 * - Akıllı Takip: `addTrack` ile aynı element tekrar eklendiğinde observer'ları yeni seçeneklerle günceller.
 * - Komut İyileştirmeleri: `AttributeCommand`, `ChildAddCommand` ve `ResizeObserver` ilk tetikleme mantığı rafine edildi.
 * - API Netliği: JSDoc ve parametre isimleri ile API kullanımı daha anlaşılır hale getirildi. `execute` metodunun davranışı netleştirildi.
 */

// === YARDIMCI FONKSİYONLAR ===
const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};


// === TEMEL KOMUT SINIFI ===
class Command {
    constructor(name) { this.name = name; }
    do() { }
    undo() { }
    redo() { this.do(); } // Varsayılan olarak redo, do işleminin aynısıdır.
}

// === GELİŞMİŞ KOMUT SINIFLARI ===

class BatchCommand extends Command {
    constructor(commands, label = "Toplu İşlem") {
        super(label);
        this.commands = commands || [];
    }
    do() { this.commands.forEach(cmd => cmd.do()); }
    undo() { [...this.commands].reverse().forEach(cmd => cmd.undo()); }
}

class MoveCommand extends Command {
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

class SizeCommand extends Command {
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

class StyleCommand extends Command {
    constructor(telement, oldCssText, newCssText) {
        super("Stil Değişimi");
        this.telement = telement;
        this.oldValue = oldCssText;
        this.newValue = newCssText;
    }
    do() { this.telement.htmlObject.style.cssText = this.newValue; }
    undo() { this.telement.htmlObject.style.cssText = this.oldValue; }
}

class AttributeCommand extends Command {
    constructor(telement, attrName, oldValue, newValue) {
        super("Özellik Değiştir");
        this.telement = telement;
        this.attrName = attrName;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
    _apply(value) {
        // null/undefined ise kaldır, değilse ata (boş string '' geçerli bir değerdir).
        if (value === null || typeof value === 'undefined') {
            this.telement.htmlObject.removeAttribute(this.attrName);
        } else {
            this.telement.htmlObject.setAttribute(this.attrName, value);
        }
    }
    do() { this._apply(this.newValue); }
    undo() { this._apply(this.oldValue); }
}

class ChildCommand extends Command {
    constructor(parentTelement, childTelement, nextSiblingTelement) {
        super("Çocuk Ekle/Sil");
        this.parent = parentTelement;
        this.child = childTelement;
        this.nextSibling = nextSiblingTelement;
    }
    _insert() {
        const nextNode = this.nextSibling ? this.nextSibling.htmlObject : null;
        this.parent.htmlObject.insertBefore(this.child.htmlObject, nextNode);
        // Telement mantıksal ağacını güncelle
        const idx = this.nextSibling ? this.parent.children.indexOf(this.nextSibling) : -1;
        this.parent.children.splice(idx > -1 ? idx : this.parent.children.length, 0, this.child);
        this.child.parent = this.parent;
    }
    _remove() {
        this.parent.htmlObject.removeChild(this.child.htmlObject);
        // Telement mantıksal ağacını güncelle
        const idx = this.parent.children.indexOf(this.child);
        if (idx > -1) this.parent.children.splice(idx, 1);
        this.child.parent = null;
    }
}

class ChildAddCommand extends ChildCommand {
    constructor(...args) { super(...args); this.name = "Çocuk Ekle"; }
    do() { this._insert(); }
    undo() { this._remove(); }
}

class ChildRemoveCommand extends ChildCommand {
    constructor(...args) { super(...args); this.name = "Çocuk Sil"; }
    do() { this._remove(); }
    undo() { this._insert(); }
}


/***********************************************************************/
/*                      EVENT HISTORY KOMUTLARI                       */
/***********************************************************************/
class EventCommand extends Command {
  constructor(name, telement, eventType, listener, options){
    super(name);

    this.telement  = telement;          // ⬅︎ hangi Telement?
    this.eventType = eventType;         // ⬅︎ 'pointerdown' vb.
    this.id        = getOrAddId(listener); // ⬅︎ (*) yalnızca ID
    this.options   = options;
  }
  static origAdd   = ()=>{};
  static origRemove= ()=>{};
}
class EventAddCommand extends EventCommand {
  do () {
    const fn = getFnById(this.id);
    EventCommand.origAdd.call(this.t.htmlObject, this.type, fn, this.options);
  }
  undo () {
    const fn = getFnById(this.id);
    EventCommand.origRemove.call(this.t.htmlObject, this.type, fn, this.options);
  }
}

class EventRemoveCommand extends EventCommand {
  do ()   {
    const fn = getFnById(this.id);
    EventCommand.origRemove.call(this.t.htmlObject, this.type, fn, this.options);
  }
  undo () {
    const fn = getFnById(this.id);
    EventCommand.origAdd.call(this.t.htmlObject, this.type, fn, this.options);
  }
}
function setupEventTracking(history){
  if (EventTarget.prototype._eventTrackPatched) return;   // tek sefer
  EventTarget.prototype._eventTrackPatched = true;

  const origAdd = EventTarget.prototype.addEventListener;
  const origRem = EventTarget.prototype.removeEventListener;
  let   inCmd   = false;

  /* 1) addEventListener override ---------------------------------- */
  EventTarget.prototype.addEventListener = function(type, listener, options){
    // a) History sessizdeyse veya iç işlemdeyse yönlendirme
    if (inCmd || history.muted){
      return origAdd.call(this, type, listener, options);
    }

    // b) Telement sahibi yoksa (ham DOM) history'ye sokma
    const t = this.owner;
    if (!t){
      return origAdd.call(this, type, listener, options);
    }

    // c) Komut üret → history.execute
    const cmd = new EventAddCommand(t, type, listener, options);
    inCmd = true;
    history.execute(cmd);
    inCmd = false;
  };

  /* 2) removeEventListener override -------------------------------- */
  EventTarget.prototype.removeEventListener = function(type, listener, options){
    if (inCmd || history.muted){
      return origRem.call(this, type, listener, options);
    }
    const t = this.owner;
    if (!t){
      return origRem.call(this, type, listener, options);
    }

    const cmd = new EventRemoveCommand(t, type, listener, options);
    inCmd = true;
    history.execute(cmd);
    inCmd = false;
  };

  /* 3) Komutlar core fonksiyonlara erişebilsin --------------------- */
  EventCommand.origAdd    = function(...args){ inCmd = true; origAdd.apply(this, args); inCmd = false; };
  EventCommand.origRemove = function(...args){ inCmd = true; origRem.apply(this, args); inCmd = false; };
} 
class SelectCommand extends BaseCommand {
  constructor(manager, item, multi) {
    super("Select");
    this.manager = manager;
    this.item = item;
    this.multi = multi;
  }
  execute() { this.manager.select(this.item, { multi: this.multi }); }
  undo() { this.manager.toggle(this.item); }
}
// Patch’i etkinleştir


// === GEÇMİŞ YÖNETİCİSİ ===
class HistoryManager {
    constructor(maxSteps = 500) {
        this.undoStack = [];
        this.redoStack = [];
        this.trackedElements = new WeakMap();
        this.isBuffering = false;
        this.commandBuffer = [];
        this.maxSteps = maxSteps;
        globs.historyManager = this
setupEventTracking(globs.historyManager);
    }

    startBuffer() {
        if (this.isBuffering) return;
        this.isBuffering = true;
        this.commandBuffer = [];
    }

    endBuffer(label = "Toplu İşlem") {
        if (!this.isBuffering) return;
        this.isBuffering = false;
        if (this.commandBuffer.length === 0) return;
        const command = this.commandBuffer.length === 1 ? this.commandBuffer[0] : new BatchCommand(this.commandBuffer, label);
        this._pushToUndoStack(command);
    }

    /**
     * Komutu çalıştırır ve geçmiş yığınına ekler.
     * DİKKAT: Bu metoda verilen komut, henüz `do()` metodu çağrılmamış bir komut olmalıdır.
     * `execute` metodu, `do()` metodunu kendisi çağıracaktır.
     * @param {Command} cmd Çalıştırılacak komut nesnesi.
     */
    execute(cmd) {
        cmd.do(); // Komutu çalıştır
        if (this.isBuffering) {
            this.commandBuffer.push(cmd);
            return;
        }
        this._pushToUndoStack(cmd);
    }
    
    _pushToUndoStack(cmd) {
        this.undoStack.push(cmd);
        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Yeni bir işlem yapıldığında redo yığını temizlenir.
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const cmd = this.undoStack.pop();
        cmd.undo();
        this.redoStack.push(cmd);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const cmd = this.redoStack.pop();
        cmd.redo(); // Komutun kendi redo'sunu çağırır (varsayılanı .do()'dur)
        this.undoStack.push(cmd);
    }
    
    _isAncestorTracked(telement) {
        let parent = telement.parent;
        while (parent) {
            const trackingInfo = this.trackedElements.get(parent);
            if (trackingInfo && trackingInfo.options.trackChildren) return true;
            parent = parent.parent;
        }
        return false;
    }

    /**
     * Bir Telement nesnesini değişiklik takibine ekler.
     * @param {Telement} telement İzlenecek Telement nesnesi.
     * @param {object} options İzleme seçenekleri { trackStyle, trackResize, trackChildren, trackAttr }
     */
    addTrack(telement, options = {}) {
        if (!telement || !telement.htmlObject) {
            console.error("addTrack: Geçerli bir Telement nesnesi gereklidir.");
            return;
        }

        // Eğer element zaten izleniyorsa, önce eski izleyiciyi kaldırıp yenisiyle devam et (güncelleme mantığı).
        if (this.trackedElements.has(telement)) {
            this.removeTrack(telement);
        }
        
        if (this._isAncestorTracked(telement)) {
            console.warn("Ebeveyni zaten 'trackChildren:true' ile izlendiği için bu element izlemeye eklenmedi:", telement.name);
            return;
        }

        const finalOptions = { trackStyle: true, trackResize: true, trackChildren: false, trackAttr: false, ...options };
        const observers = {};
        const html = telement.htmlObject;
        
        if (finalOptions.trackResize && window.ResizeObserver) {
            html._$lastSize = Trect.fromElement(html); // İlk ölçümü komut oluşturmadan sakla
            const throttledResizeHandler = throttle(entries => {
                for (const entry of entries) {
                    const t = entry.target.owner;
                    if (!t) continue;
                    const newSize = Trect.fromElement(entry.target);
                    const oldSize = entry.target._$lastSize;
                    if (oldSize.width !== newSize.width || oldSize.height !== newSize.height || oldSize.left !== newSize.left || oldSize.top !== newSize.top) {
                        this.execute(new SizeCommand(t, oldSize, newSize));
                        entry.target._$lastSize = newSize.copy();
                    }
                }
            }, 50); // Resize olaylarını 50ms aralıklarla işle
            observers.resizeObs = new ResizeObserver(throttledResizeHandler);
            observers.resizeObs.observe(html);
        }

        const mutationOptions = {
            attributes: finalOptions.trackStyle || finalOptions.trackAttr,
            attributeOldValue: true,
            childList: finalOptions.trackChildren,
            subtree: finalOptions.trackChildren,
        };

        if (Object.values(mutationOptions).some(val => val)) {
            observers.mutationObs = new MutationObserver(mutations => {
                this.startBuffer();
                for (const mutation of mutations) {
                    const targetOwner = mutation.target.owner;
                    if (!targetOwner) continue;

                    if (mutation.type === "attributes") {
                        const attrName = mutation.attributeName;
                        if (attrName === "style" && finalOptions.trackStyle) {
                            if (mutation.oldValue !== mutation.target.style.cssText)
                                this.execute(new StyleCommand(targetOwner, mutation.oldValue, mutation.target.style.cssText));
                        } else if (attrName !== "style" && finalOptions.trackAttr) {
                            const newValue = mutation.target.getAttribute(attrName);
                            if (mutation.oldValue !== newValue)
                                this.execute(new AttributeCommand(targetOwner, attrName, mutation.oldValue, newValue));
                        }
                    } else if (mutation.type === "childList") {
                        mutation.addedNodes.forEach(node => {
                            if (node.owner && node.owner.parent === targetOwner) // Sadece doğrudan çocukları işle
                                this.execute(new ChildAddCommand(targetOwner, node.owner, node.nextSibling?.owner));
                        });
                        mutation.removedNodes.forEach(node => {
                            if (node.owner) // Çıkarılan düğümün parent'ı artık targetOwner olmadığı için bu kontrol burada yapılmaz.
                                this.execute(new ChildRemoveCommand(targetOwner, node.owner, mutation.nextSibling?.owner));
                        });
                    }
                }
                this.endBuffer("DOM Değişikliği");
            });
            observers.mutationObs.observe(html, mutationOptions);
        }
        
        this.trackedElements.set(telement, { observers, options: finalOptions });
    }

    removeTrack(telement) {
        const trackingInfo = this.trackedElements.get(telement);
        if (!trackingInfo) return;
        trackingInfo.observers.resizeObs?.disconnect();
        trackingInfo.observers.mutationObs?.disconnect();
        this.trackedElements.delete(telement);
    }
}
HistoryManager.prototype.muted = false;
HistoryManager.prototype.mute   = function(){ this.muted = true; };
HistoryManager.prototype.unmute = function(){ this.muted = false; };

import { throttle } from '../utils/performance.js';
import { Trect } from '../dom/geometry.js';
import { TbatchCommand, TsizeCommand, TstyleCommand, TattributeCommand, TchildAddCommand, TchildRemoveCommand } from './commands/DomCommands.js';

/**
 * Undo/Redo işlemlerini yöneten sınıf.
 * Command tasarım desenini ve Observer'ları kullanarak işlem geçmişini otomatik olarak tutar.
 */
export class ThistoryManager {
    constructor(maxSteps = 500) {
        this.undoStack = [];
        this.redoStack = [];
        this.trackedElements = new WeakMap();
        this.isBuffering = false;
        this.commandBuffer = [];
        this.maxSteps = maxSteps;
        this.muted = false;
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
        const command = this.commandBuffer.length === 1 ? this.commandBuffer[0] : new TbatchCommand(this.commandBuffer, label);
        this._pushToUndoStack(command);
    }

    execute(cmd) {
        if (this.muted) return;
        cmd.do();
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
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const cmd = this.undoStack.pop();
        this.muted = true; // Geri alma işlemi sırasında observer'ların yeni komut üretmesini engelle
        cmd.undo();
        this.muted = false;
        this.redoStack.push(cmd);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const cmd = this.redoStack.pop();
        this.muted = true; // İleri alma işlemi sırasında observer'ların yeni komut üretmesini engelle
        cmd.redo();
        this.muted = false;
        this.undoStack.push(cmd);
    }
    
    addTrack(telement, options = {}) {
        if (!telement?.htmlObject) return;
        if (this.trackedElements.has(telement)) this.removeTrack(telement);

        const finalOptions = { trackStyle: true, trackResize: true, trackChildren: false, trackAttr: false, ...options };
        const observers = {};
        const html = telement.htmlObject;
        
        if (finalOptions.trackResize && window.ResizeObserver) {
            html._$lastSize = Trect.fromElement(html);
            const throttledResizeHandler = throttle(entries => {
                for (const entry of entries) {
                    const t = entry.target.owner;
                    if (!t) continue;
                    const newSize = Trect.fromElement(entry.target);
                    const oldSize = entry.target._$lastSize;
                    if (oldSize.width !== newSize.width || oldSize.height !== newSize.height || oldSize.left !== newSize.left || oldSize.top !== newSize.top) {
                        this.execute(new TsizeCommand(t, oldSize, newSize));
                        entry.target._$lastSize = newSize.clone();
                    }
                }
            }, 50);
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
                                this.execute(new TstyleCommand(targetOwner, mutation.oldValue, mutation.target.style.cssText));
                        } else if (attrName !== "style" && finalOptions.trackAttr) {
                            const newValue = mutation.target.getAttribute(attrName);
                            if (mutation.oldValue !== newValue)
                                this.execute(new TattributeCommand(targetOwner, attrName, mutation.oldValue, newValue));
                        }
                    } else if (mutation.type === "childList") {
                        mutation.addedNodes.forEach(node => {
                            if (node.owner && node.owner.parent === targetOwner)
                                this.execute(new TchildAddCommand(targetOwner, node.owner, node.nextSibling?.owner));
                        });
                        mutation.removedNodes.forEach(node => {
                            if (node.owner)
                                this.execute(new TchildRemoveCommand(targetOwner, node.owner, mutation.nextSibling?.owner));
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
window.ThistoryManager = ThistoryManager;
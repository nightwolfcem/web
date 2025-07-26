import { globs } from '../core/globals.js';
import { onDOMLoad } from '../core/loader.js';
import { Telement } from './Telement.js';
import { Tlayer } from './Tlayer.js';
import { getEventMap } from './eventHandling.js';
import { AllClass } from '../core/classUtils.js';
let _styleEl = null;
const INTERACTION_STATE = new WeakMap();
let dragStartX, dragStartY;
let initialPositions = new Map();
  const RESIZE_CURSORS = {
        n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
        ne: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize', sw: 'nesw-resize'
    };

    function createResizeHandle(direction) {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${direction}`;
        handle.dataset.direction = direction;
        handle.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: #0066FF;
        border: 1px solid white;
        z-index: 10000;
        pointer-events: all;
    `;

        const cursors = {
            'nw': 'nwse-resize', 'n': 'ns-resize', 'ne': 'nesw-resize',
            'e': 'ew-resize', 'se': 'nwse-resize', 's': 'ns-resize',
            'sw': 'nesw-resize', 'w': 'ew-resize'
        };
        handle.style.cursor = cursors[direction];

        return handle;
    }
export const DOM = {
    head: document.head,
    path: window.location.href,
    baseLayer: null,
     loadFuncs : [],
    disableScreen: null,
   
    addStyle: function (cssText) {
        if (!_styleEl) {
            _styleEl = document.createElement('style');
            document.head.appendChild(_styleEl);
        }
        _styleEl.appendChild(document.createTextNode(cssText));
        return _styleEl;
    },

   disableSelection: function (target) {
            if (typeof target.onselectstart != undefined) // iE route
                target.onselectstart = function () {
                    return false;
                };
            else if (typeof target.style.MozUserSelect  !== "undefined")
                target.style.MozUserSelect = "none";
            else
                target.onmousedown = function () {
                    return false;
                };
            target.style.cursor = "default";
        },
   
        addLink: function (attributes) {
            const link = document.createElement('link');
            for (const key in attributes) {
                link.setAttribute(key, attributes[key]);
            }
            document.head.appendChild(link);
            return link;
        },
        addScript: function (pathOrOptions) {
            if (typeof pathOrOptions === 'string') {
                if (!document.querySelector(`script[src='${pathOrOptions}']`)) {
                    const script = document.createElement('script');
                    script.src = pathOrOptions;
                    document.head.appendChild(script);
                    return script;
                }
                return null;
            } else {
                const { src = null, inlineContent = '', attributes = {} } = pathOrOptions;
                if (src && document.querySelector(`script[src='${src}']`)) return null;
                const script = document.createElement('script');
                if (src) script.src = src;
                if (inlineContent) script.appendChild(document.createTextNode(inlineContent));
                for (const key in attributes) {
                    script.setAttribute(key, attributes[key]);
                }
                document.head.appendChild(script);
                return script;
            }
        },
        setTitle: function (text) {
            let title = document.head.querySelector('title');
            if (!title) {
                title = document.createElement('title');
                document.head.appendChild(title);
            }
            title.textContent = text;
            return title;
        },
        addStyleSheet: function (path) {
            let link = document.createElement('link');
            link.href = path;
            link.type = 'text/css';
            link.rel = 'stylesheet';
            link.media = 'screen,print';
            document.head.appendChild(link);
            return link;
        },
        getUpPath: function (currentPath = null, levels = 1) {
            const fullUrl = currentPath
                ? new URL(currentPath, window.location.origin).href
                : window.location.href;
            const url = new URL(fullUrl);
            let pathname = url.pathname;
            const parts = pathname.split('/').filter(p => p !== '');
            levels = Math.floor(Math.abs(levels));
            if (levels >= parts.length) {
                pathname = '/';
            } else {
                pathname = '/' + parts.slice(0, -levels).join('/') + '/';
            }
            return url.origin + pathname;
        },
    getHtmlElement :function (element) {
            if (element instanceof Telement) {
                return element.htmlObject;
            } else
                if (element instanceof HTMLElement) {
                    return element;
                } else
                    if (typeof element === 'string' && element.startsWith('<')) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = element;
                        return tempDiv.children[0];
                    } else
                        if (typeof element === 'string') {
                            return document.querySelector(element) || document.createElement(element);
                        }
            return null;
        },
        getDragPlaceholder : () => {
        if (!DOM.dragPlaceHolder) {
            DOM.dragPlaceHolder = document.createElement('div');
            DOM.dragPlaceHolder.className = 'drop-placeholder';
            document.body.appendChild(DOM.dragPlaceHolder);
        }
        return DOM.dragPlaceHolder;
    },
    updateSelectionVisuals : function () {
        if (DOM.selectedElements.size === 0) {
            DOM.selectionRectangle.style.display = 'none';
            DOM.clearResizeHelpers();
            return;
        }

        let minLeft = Infinity, minTop = Infinity;
        let maxRight = -Infinity, maxBottom = -Infinity;

        DOM.selectedElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            minLeft = Math.min(minLeft, rect.left);
            minTop = Math.min(minTop, rect.top);
            maxRight = Math.max(maxRight, rect.right);
            maxBottom = Math.max(maxBottom, rect.bottom);
        });

        DOM.selectionRectangle.style.left = `${minLeft + window.scrollX}px`;
        DOM.selectionRectangle.style.top = `${minTop + window.scrollY}px`;
        DOM.selectionRectangle.style.width = `${maxRight - minLeft}px`;
        DOM.selectionRectangle.style.height = `${maxBottom - minTop}px`;
        DOM.selectionRectangle.style.display = 'block';

        if (globals.designMode) {
            DOM.clearResizeHelpers();

            let allResizable = true;
            DOM.selectedElements.forEach(el => {
                if (!(el.owner?.status?.sizable)) {
                    allResizable = false;
                }
            });

            if (allResizable && DOM.selectedElements.size > 0) {
                const directions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
                directions.forEach(dir => {
                    const handle = createResizeHandle(dir);
                    DOM.resizeHelpers.push(handle);
                    document.body.appendChild(handle);

                    const handleSize = 8;
                    let left, top;

                    switch (dir) {
                        case 'nw': left = minLeft; top = minTop; break;
                        case 'n': left = minLeft + (maxRight - minLeft) / 2 - handleSize / 2; top = minTop; break;
                        case 'ne': left = maxRight - handleSize; top = minTop; break;
                        case 'e': left = maxRight - handleSize; top = minTop + (maxBottom - minTop) / 2 - handleSize / 2; break;
                        case 'se': left = maxRight - handleSize; top = maxBottom - handleSize; break;
                        case 's': left = minLeft + (maxRight - minLeft) / 2 - handleSize / 2; top = maxBottom - handleSize; break;
                        case 'sw': left = minLeft; top = maxBottom - handleSize; break;
                        case 'w': left = minLeft; top = minTop + (maxBottom - minTop) / 2 - handleSize / 2; break;
                    }

                    handle.style.left = `${left + window.scrollX}px`;
                    handle.style.top = `${top + window.scrollY}px`;

                    handle.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const startX = e.clientX;
                        const startY = e.clientY;

                        const startWidth = maxRight - minLeft;
                        const startHeight = maxBottom - minTop;
                        const startLeft = minLeft;
                        const startTop = minTop;

                        const moveHandler = (e) => {
                            const dx = e.clientX - startX;
                            const dy = e.clientY - startY;

                            let newLeft = startLeft;
                            let newTop = startTop;
                            let newWidth = startWidth;
                            let newHeight = startHeight;

                            if (dir.includes('n')) {
                                newHeight -= dy;
                                newTop += dy;
                            }
                            if (dir.includes('s')) {
                                newHeight += dy;
                            }
                            if (dir.includes('e')) {
                                newWidth += dx;
                            }
                            if (dir.includes('w')) {
                                newWidth -= dx;
                                newLeft += dx;
                            }

                            const scaleX = newWidth / startWidth;
                            const scaleY = newHeight / startHeight;
                            const offsetX = newLeft - startLeft;
                            const offsetY = newTop - startTop;

                            DOM.selectedElements.forEach(el => {
                                const elRect = el.getBoundingClientRect();
                                const elLeft = elRect.left - minLeft;
                                const elTop = elRect.top - minTop;

                                const newElLeft = newLeft + elLeft * scaleX;
                                const newElTop = newTop + elTop * scaleY;
                                const newElWidth = elRect.width * scaleX;
                                const newElHeight = elRect.height * scaleY;

                                el.style.left = `${newElLeft}px`;
                                el.style.top = `${newElTop}px`;
                                el.style.width = `${newElWidth}px`;
                                el.style.height = `${newElHeight}px`;
                            });

                            DOM.updateSelectionVisuals();
                        };

                        const upHandler = () => {
                            document.removeEventListener('mousemove', moveHandler);
                            document.removeEventListener('mouseup', upHandler);
                        };

                        document.addEventListener('mousemove', moveHandler);
                        document.addEventListener('mouseup', upHandler);
                    });
                });
            }
        }
    },

    clearResizeHelpers : function () {
        DOM.resizeHelpers.forEach(handle => {
            if (handle.parentNode) {
                handle.parentNode.removeChild(handle);
            }
        });
        DOM.resizeHelpers = [];
   },
   setDesignMode : function (enabled) {
        globals.designMode = enabled;

        if (enabled) {
            document.addEventListener('click', DOM.handleDesignClick);
            document.addEventListener('mousedown', DOM.handleDesignDragStart);
            document.addEventListener('mousemove', DOM.handleDesignDrag);
            document.addEventListener('mouseup', DOM.handleDesignDragEnd);

            DOM.updateSelectionVisuals();
        } else {
            document.removeEventListener('click', DOM.handleDesignClick);
            document.removeEventListener('mousedown', DOM.handleDesignDragStart);
            document.removeEventListener('mousemove', DOM.handleDesignDrag);
            document.removeEventListener('mouseup', DOM.handleDesignDragEnd);

            DOM.selectedElements.clear();
            DOM.updateSelectionVisuals();
        }
    },
    handleDesignClick : function (e) {
        if (e.target.classList.contains('resize-handle')) return;

        const element = e.target.closest('[data-layer]');
        if (!element) {
            DOM.selectedElements.clear();
            DOM.updateSelectionVisuals();
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            if (DOM.selectedElements.has(element)) {
                DOM.selectedElements.delete(element);
            } else {
                DOM.selectedElements.add(element);
            }
        } else {
            DOM.selectedElements.clear();
            DOM.selectedElements.add(element);
        }

        DOM.updateSelectionVisuals();
    },
   handleDesignDragStart : function (e) {
        if (e.target.classList.contains('resize-handle') ||
            !globals.designMode ||
            DOM.selectedElements.size === 0) {
            return;
        }

        const element = e.target.closest('[data-layer]');
        if (!element || !DOM.selectedElements.has(element)) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        dragStartX = e.clientX;
        dragStartY = e.clientY;

        initialPositions.clear();
        DOM.selectedElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            initialPositions.set(el, {
                left: rect.left,
                top: rect.top
            });
        });

        document.addEventListener('mousemove', DOM.handleDesignDrag);
        document.addEventListener('mouseup', DOM.handleDesignDragEnd);
    },

    handleDesignDrag  : function (e) {
        if (!dragStartX || !dragStartY || initialPositions.size === 0) return;

        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        DOM.selectedElements.forEach(el => {
            const initial = initialPositions.get(el);
            el.style.left = `${initial.left + dx}px`;
            el.style.top = `${initial.top + dy}px`;
        });

        DOM.updateSelectionVisuals();
    },

    handleDesignDragEnd  : function () {
        dragStartX = null;
        dragStartY = null;
        initialPositions.clear();

        document.removeEventListener('mousemove', DOM.handleDesignDrag);
        document.removeEventListener('mouseup', DOM.handleDesignDragEnd);
    },
    makeResizable  : function (el, options) {
        const map = getEventMap(el);                       // WeakMap<Element, Map>

        if (map) {
            for (const [type, list] of map) {
                if (type !== 'mousemove' && type !== 'mousedown') continue;
                for (const rec of [...list]) {                 // kopya üzerinden döngü
                    if (rec.listener && rec.listener._isResizeHandler) {
                        el.removeEventListener(type, rec.listener, rec.options);
                    }
                }
            }
        }

        if (!options) {
            el.style.cursor = '';
            return;
        }

        const {
            borders,      // Eborder bitmask: hangi kenarlardan resize edilecek
            useHelper,    // (isteğe bağlı, eklenecekse helper çizim mantığı)
            minWidth, maxWidth,
            minHeight, maxHeight
        } = options;

        function hasBorder(flag) {
            return ((borders & flag) === flag) ||
                (borders === Eborder.all && flag !== 0);
        }

        function hitZone(x, y, w, h) {
            const th = 7; // eşik (px)
            if (hasBorder(Eborder.leftTop) && x < th && y < th) return 'nw';
            if (hasBorder(Eborder.rightTop) && x > w - th && y < th) return 'ne';
            if (hasBorder(Eborder.leftBottom) && x < th && y > h - th) return 'sw';
            if (hasBorder(Eborder.rightBottom) && x > w - th && y > h - th) return 'se';
            if (hasBorder(Eborder.top) && y < th) return 'n';
            if (hasBorder(Eborder.bottom) && y > h - th) return 's';
            if (hasBorder(Eborder.left) && x < th) return 'w';
            if (hasBorder(Eborder.right) && x > w - th) return 'e';
            return '';
        }

        const mouseMoveHandler = function (e) {
            const r = el.getBoundingClientRect();
            const zone = hitZone(
                e.clientX - r.left,
                e.clientY - r.top,
                r.width,
                r.height
            );
            el.style.cursor = zone ? (zone + '-resize') : '';
        };
        mouseMoveHandler._isResizeHandler = true;

        const mouseDownHandler = function (e) {
            const r = el.getBoundingClientRect();
            const zone = hitZone(
                e.clientX - r.left,
                e.clientY - r.top,
                r.width,
                r.height
            );
            if (!zone) return;  // kenarda değilse resize başlatılmaz

            e.preventDefault();
            e.stopPropagation();
            if (INTERACTION_STATE.get(el)) return;
            INTERACTION_STATE.set(el, 'resizing');

            const start = {
                x: e.clientX, y: e.clientY,
                left: el.offsetLeft,
                top: el.offsetTop,
                width: r.width,
                height: r.height
            };

            function onDrag(ev) {
                const dx = ev.clientX - start.x;
                const dy = ev.clientY - start.y;
                let newW = start.width, newH = start.height;
                let newL = start.left, newT = start.top;

                if (zone.includes('e')) newW = start.width + dx;
                if (zone.includes('s')) newH = start.height + dy;
                if (zone.includes('w')) { newW = start.width - dx; newL = start.left + dx; }
                if (zone.includes('n')) { newH = start.height - dy; newT = start.top + dy; }

                if (newW >= minWidth && newW <= maxWidth) {
                    el.style.width = newW + 'px';
                    if (zone.includes('w')) el.style.left = newL + 'px';
                }
                if (newH >= minHeight && newH <= maxHeight) {
                    el.style.height = newH + 'px';
                    if (zone.includes('n')) el.style.top = newT + 'px';
                }
            }

            function onUp() {
                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mouseup', onUp);
                INTERACTION_STATE.delete(el);
            }

            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', onUp, { once: true });
        };
        mouseDownHandler._isResizeHandler = true;

        el.addEventListener('mousemove', mouseMoveHandler);
        el.addEventListener('mousedown', mouseDownHandler);
    },
    makeResizableWithHandles : function (el, flags) {
        (el._resHandles || []).forEach(h => h.remove());
        el._resHandles = [];

        const DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        const isActive = dir => {
            switch (dir) {
                case 'n': return Boolean(flags & Eborder.top);
                case 's': return Boolean(flags & Eborder.bottom);
                case 'e': return Boolean(flags & Eborder.right);
                case 'w': return Boolean(flags & Eborder.left);
                case 'nw': return Boolean(flags & Eborder.top) && Boolean(flags & Eborder.left);
                case 'ne': return Boolean(flags & Eborder.top) && Boolean(flags & Eborder.right);
                case 'sw': return Boolean(flags & Eborder.bottom) && Boolean(flags & Eborder.left);
                case 'se': return Boolean(flags & Eborder.bottom) && Boolean(flags & Eborder.right);
            }
        };

        const rect = () => el.getBoundingClientRect();

        DIRS.forEach(dir => {
            if (!(flags === Eborder.all || isActive(dir))) return;

            const h = document.createElement('div');
            h.className = 'resize-handle ' + dir;
            Object.assign(h.style, {
                position: 'absolute', width: '12px', height: '12px',
                background: '#0066FF', border: '1px solid #fff',
                boxSizing: 'border-box', cursor: RESIZE_CURSORS[dir], zIndex: 10000
            });

            const r = rect();
            const off = 6;
            switch (dir) {
                case 'n': h.style.cssText += `;left:${r.left + r.width / 2 - off}px;top:${r.top - off}px`; break;
                case 's': h.style.cssText += `;left:${r.left + r.width / 2 - off}px;top:${r.bottom - off}px`; break;
                case 'e': h.style.cssText += `;left:${r.right - off}px;top:${r.top + r.height / 2 - off}px`; break;
                case 'w': h.style.cssText += `;left:${r.left - off}px;top:${r.top + r.height / 2 - off}px`; break;
                case 'nw': h.style.cssText += `;left:${r.left - off}px;top:${r.top - off}px`; break;
                case 'ne': h.style.cssText += `;left:${r.right - off}px;top:${r.top - off}px`; break;
                case 'sw': h.style.cssText += `;left:${r.left - off}px;top:${r.bottom - off}px`; break;
                case 'se': h.style.cssText += `;left:${r.right - off}px;top:${r.bottom - off}px`; break;
            }

            el._resHandles.push(h);
            document.body.appendChild(h);

            h.addEventListener('mousedown', e => {
                e.preventDefault(); e.stopPropagation();
                const startX = e.clientX, startY = e.clientY;
                const { left, top, width, height } = rect();
                const dirKey = dir;

                function onMove(ev) {
                    const dx = ev.clientX - startX, dy = ev.clientY - startY;
                    let newW = width, newH = height, newL = left, newT = top;
                    if (dirKey.includes('e')) newW = width + dx;
                    if (dirKey.includes('s')) newH = height + dy;
                    if (dirKey.includes('w')) { newW = width - dx; newL = left + dx; }
                    if (dirKey.includes('n')) { newH = height - dy; newT = top + dy; }
                    if (newW > 20) { el.style.width = newW + 'px'; el.style.left = newL + 'px'; }
                    if (newH > 20) { el.style.height = newH + 'px'; el.style.top = newT + 'px'; }
                }

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true });
            });
        });
    },

    /**
     * Attach edge-based resize (no handles), window-like behavior.
     * @param {HTMLElement} el
     * @param {number} flags - Eborder bitmask to constrain edges
     */
    makeResizableByEdges : function (el, flags) {
        (el._resHandles || []).forEach(h => h.remove()); el._resHandles = [];
        const threshold = 6;
        const rect = () => el.getBoundingClientRect();

        function onMove(e) {
            const { left, top, width, height } = rect();
            const x = e.clientX - left, y = e.clientY - top;
            let dir = '';
            if (y < threshold && (flags & Eborder.top)) dir += 'n';
            else if (y > height - threshold && (flags & Eborder.bottom)) dir += 's';
            if (x < threshold && (flags & Eborder.left)) dir += 'w';
            else if (x > width - threshold && (flags & Eborder.right)) dir += 'e';
            el.style.cursor = RESIZE_CURSORS[dir] || '';
        }

        function onDown(e) {
            const r = rect(); const x = e.clientX - r.left, y = e.clientY - r.top;
            let dir = '';
            if (y < threshold && (flags & Eborder.top)) dir += 'n';
            else if (y > r.height - threshold && (flags & Eborder.bottom)) dir += 's';
            if (x < threshold && (flags & Eborder.left)) dir += 'w';
            else if (x > r.width - threshold && (flags & Eborder.right)) dir += 'e';
            if (!dir) return;
            e.preventDefault();
            const start = { x: e.clientX, y: e.clientY, ...r };

            function onDrag(ev) {
                const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
                let newW = start.width, newH = start.height, newL = start.left, newT = start.top;
                if (dir.includes('e')) newW = start.width + dx;
                if (dir.includes('s')) newH = start.height + dy;
                if (dir.includes('w')) { newW = start.width - dx; newL = start.left + dx; }
                if (dir.includes('n')) { newH = start.height - dy; newT = start.top + dy; }
                if (newW > 20) el.style.width = newW + 'px';
                if (newH > 20) el.style.height = newH + 'px';
                if (dir.includes('w') || dir.includes('n')) {
                    el.style.left = newL + 'px'; el.style.top = newT + 'px';
                }
            }

            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onDrag), { once: true });
        }

        el.addEventListener('mousemove', onMove);
        el.addEventListener('mousedown', onDown);
    },
    makeDraggable : function (
        element,
        handle = null,
        enable = true,
        customDragging = false
    ) {
        const target = handle || element;

        /* ── 1. ÖNCEKİ draggable dinleyicilerini temizle ─────────────── */
        const map = getEventMap(target);                     // WeakMap<Element, Map>
        if (map) {
            for (const [type, list] of map) {
                const isPointer = type === 'pointerdown' ||
                    type === 'pointermove' ||
                    type === 'pointerup';

                const isDrag = type === 'dragstart' ||
                    type === 'dragend';

                if (!isPointer && !isDrag) continue;             // ilgisiz tür

                for (const rec of [...list]) {                   // kopya üzerinde döngü
                    const L = rec.listener;
                    if (!L) continue;

                    const shouldRemove =
                        (isPointer && L._isCustomDraggableHandler) ||
                        (isDrag && L._isNativeDraggableHandler);

                    if (shouldRemove) {
                        target.removeEventListener(type, L, rec.options);
                        /* removeEventListener override’ı listeden silmeyi kendisi yapar */
                    }
                }
            }
        }

        if (!enable) return;

        if (customDragging) {
            let dragging = false, offsetX = 0, offsetY = 0;

            const pointerDown = (e) => {
                if (INTERACTION_STATE.get(element)) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                INTERACTION_STATE.set(element, 'dragging');
                dragging = true;
                offsetX = e.clientX - element.offsetLeft;
                offsetY = e.clientY - element.offsetTop;
                target.setPointerCapture(e.pointerId);
                element.classList.add('dragging');
            };
            const pointerMove = (e) => {
                if (!dragging) return;
                element.style.left = (e.clientX - offsetX) + 'px';
                element.style.top = (e.clientY - offsetY) + 'px';
            };
            const pointerUp = (e) => {
                dragging = false;
                target.releasePointerCapture(e.pointerId);
                element.classList.remove('dragging');
                INTERACTION_STATE.delete(element);
            };

            pointerDown._isCustomDraggableHandler = true;
            pointerMove._isCustomDraggableHandler = true;
            pointerUp._isCustomDraggableHandler = true;
            target.addEventListener('pointerdown', pointerDown, true);
            target.addEventListener('pointermove', pointerMove);
            target.addEventListener('pointerup', pointerUp);
        } else {
            target.setAttribute('draggable', 'true');
            const dragStart = e => {
                if (INTERACTION_STATE.get(element)) { e.preventDefault(); return; }
                INTERACTION_STATE.set(element, 'dragging');
                e.dataTransfer.setData('text/plain', element.id || '');
                element.classList.add('dragging');
            };
            const dragEnd = () => {
                element.classList.remove('dragging');
                INTERACTION_STATE.delete(element);
            };
            dragStart._isNativeDraggableHandler = true;
            dragEnd._isNativeDraggableHandler = true;

            target.addEventListener('dragstart', dragStart);
            target.addEventListener('dragend', dragEnd);
        }
    },
    makeMovable : function (
        element,
        handle = null,
        movableRect = null,
        xable = true,
        yable = true,
        onMoveStartCb = null,
        onMoveCb = null,
        onDropCb = null
    ) {
        if (!handle) return;

        /* ── 1. ÖNCE eski movable dinleyicilerini temizle ─────────────── */
        const map = getEventMap(handle);                   // WeakMap<Element, Map>
        if (map && map.has('pointerdown')) {
            for (const rec of [...map.get('pointerdown')]) { // kopya üzerinde döngü
                if (rec.listener?._isMovableHandler) {
                    handle.removeEventListener('pointerdown', rec.listener, rec.options);
                    /* removeEventListener override’ı listeden de siler */
                }
            }
        }

        const onPointerDown = e => {
            if (e.target !== handle) return;
            if (INTERACTION_STATE.get(element)) return;
            INTERACTION_STATE.set(element, 'moving');
            onMoveStartCb?.();

            const te = element.owner;
            if (te && !globs.selectionManager.has(te)) {
                globs.selectionManager.forEach(el => el.htmlObject.classList.remove('selected'));
                globs.selectionManager.clear();
                globs.selectionManager.add(te);
                te.htmlObject.classList.add('selected');
            }
            const threshold = 7;
            const rect = element.getBoundingClientRect();
            const nearEdge = (
                e.clientX - rect.left < threshold || rect.right - e.clientX < threshold ||
                e.clientY - rect.top < threshold || rect.bottom - e.clientY < threshold
            );
            if (nearEdge) return; // resize öncelikli

            handle.setPointerCapture(e.pointerId);

            const container = movableRect instanceof Element
                ? movableRect
                : (element.offsetParent || document.documentElement);

            const scrollLeft = container.scrollLeft;
            const scrollTop = container.scrollTop;

            const startPageX = e.pageX;
            const startPageY = e.pageY;

            const startLeft = parseInt(getComputedStyle(element).left, 10) || element.offsetLeft;
            const startTop = parseInt(getComputedStyle(element).top, 10) || element.offsetTop;

            let boundRect = null;
            if (movableRect === true) boundRect = new DOMRect(0, 0, 9e9, 9e9);
            else if (movableRect instanceof Element) {
                const r = movableRect.getBoundingClientRect();
                boundRect = new DOMRect(r.left + scrollLeft, r.top + scrollTop, r.width, r.height);
            } else if (movableRect instanceof DOMRect) boundRect = movableRect;

            const onPointerMove = (ev) => {
                const dx = ev.pageX - startPageX;
                const dy = ev.pageY - startPageY;

                let newLeft = startLeft + dx;
                let newTop = startTop + dy;

                if (xable && boundRect) {
                    const minX = boundRect.x;
                    const maxX = boundRect.x + boundRect.width - element.offsetWidth;
                    newLeft = Math.min(Math.max(minX, newLeft), maxX);
                }
                if (yable && boundRect) {
                    const minY = boundRect.y;
                    const maxY = boundRect.y + boundRect.height - element.offsetHeight;
                    newTop = Math.min(Math.max(minY, newTop), maxY);
                }

                element.style.left = `${newLeft}px`;
                element.style.top = `${newTop}px`;

                onMoveCb?.(ev);
                ev.stopPropagation();
            };

            const onPointerUp = (ev) => {
                INTERACTION_STATE.delete(element);
                handle.removeEventListener('pointermove', onPointerMove);
                handle.removeEventListener('pointerup', onPointerUp);
                handle.releasePointerCapture(e.pointerId);
                onDropCb?.({ x: ev.clientX, y: ev.clientY });
            };

            handle.addEventListener('pointermove', onPointerMove);
            handle.addEventListener('pointerup', onPointerUp, { once: true });
        };
        onPointerDown._isMovableHandler = true;

        if (movableRect !== false)
            handle.addEventListener('pointerdown', onPointerDown);
    },

    /**
     * Enable simple drag-reordering of child elements within a container.
     * @param {HTMLElement} container
     * @param {string} [itemSelector] selector for draggable items
     */
    makeSortable : function (container, itemSelector = '> *') {
        let active = null;
        let placeholder = null;
        let stylesAdded = DOM.makeSortable._stylesAdded;

        if (!stylesAdded) {
            DOM.addStyle(`.sort-placeholder{background:#0078d4;height:4px;margin:2px 0;border-radius:2px}`);
            DOM.makeSortable._stylesAdded = true;
        }

        const getItem = (target) => target.closest(itemSelector);

        const onDown = (e) => {
            const item = getItem(e.target);
            if (!item || !container.contains(item)) return;
            e.preventDefault();
            e.stopPropagation();
            active = item;
            placeholder = document.createElement('div');
            placeholder.className = 'sort-placeholder';
            placeholder.style.height = `${item.getBoundingClientRect().height}px`;
            item.after(placeholder);
            item.classList.add('dragging');
            item.setPointerCapture(e.pointerId);
        };

        const onMove = (e) => {
            if (!active) return;
            const over = document.elementFromPoint(e.clientX, e.clientY);
            const target = getItem(over);
            if (target && target !== placeholder && container.contains(target)) {
                const rect = target.getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    container.insertBefore(placeholder, target);
                } else {
                    container.insertBefore(placeholder, target.nextSibling);
                }
            }
        };

        const onUp = (e) => {
            if (!active) return;
            active.classList.remove('dragging');
            container.insertBefore(active, placeholder);
            placeholder.remove();
            active.releasePointerCapture(e.pointerId);
            active = placeholder = null;
        };

        container.addEventListener('pointerdown', onDown);
        container.addEventListener('pointermove', onMove);
        container.addEventListener('pointerup', onUp);

        return () => {
            container.removeEventListener('pointerdown', onDown);
            container.removeEventListener('pointermove', onMove);
            container.removeEventListener('pointerup', onUp);
        };
    }

};


  function initializeDOMModule() {
   DOM.addStyleSheet(DOM.getUpPath(null, 2) + "files/css/dom.css");
        DOM.baseLayer = new Tlayer(document.body, { layerName: "baseLayer" });
        DOM.baseLayer.createSubLayers();
    for (let el of AllClass.byOrder) {
if (typeof el.body === "function" && !el.loaded) {
el.body();
}
}
  };
if (typeof window !== 'undefined') window.DOM = DOM;
onDOMLoad(initializeDOMModule);

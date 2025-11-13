import type { TLayerId } from './TglobalLayers';

/**
 * Ensure a sub-layer container exists under given host.
 * Returns the container element.
 */
export function ensureAt(host: Element | Document | ShadowRoot, layer: TLayerId): HTMLElement;

/** Convenience helpers (if provided in runtime). */
export function ensureOverlay(host: Element | Document | ShadowRoot): HTMLElement;
export function ensureSelection(host: Element | Document | ShadowRoot): HTMLElement;

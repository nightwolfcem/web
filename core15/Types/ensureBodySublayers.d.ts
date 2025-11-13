export interface EnsureReturn { root: HTMLElement|null; map: Record<string,HTMLElement>; list: HTMLElement[]; }
export function getSlot(root: any, name: string): HTMLElement | null;
export function ensureBodySublayers(root: any, args?: { order?: string[] }): EnsureReturn;
export function mountIntoSlot(host: any, targetRoot: any, slot?: string): HTMLElement | null;
export function ensureAndMount(host: any, targetRoot: any, args?: { order?: string[], slot?: string }): HTMLElement | null;

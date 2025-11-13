/** Misc DOM utilities used by core modules. */
export function owner(el: Element | null): any;
export function closestEl(el: Element | null, selector: string): Element | null;
export function rectOf(el: Element): { left:number; top:number; width:number; height:number; };
export function idOf(obj: any): string | null;

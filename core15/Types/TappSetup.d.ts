export interface ApplyOptions { order?: string[]; mountEl?: HTMLElement | null; interact?: any; }
export declare const TappSetup: {
  apply(app: any, defs?: ApplyOptions): any;
  ensureRoot(app: any, defs?: ApplyOptions): any;
  ensureLayers(root: any, order?: string[]): any;
  installInteract(app: any, root: any, opts?: any): any;
  injectStyleTag(id: string, css?: string): HTMLStyleElement | null;
  injectDefaultStyles(tokens?: Record<string,string>, extraCss?: string): void;
};
export default TappSetup;

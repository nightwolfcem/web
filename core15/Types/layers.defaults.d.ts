export const minDefaultLayers: string[];
export const maxDefaultLayers: string[];
export const defaultLayers: string[];
export interface LayerPolicyItem { pointer?: 'auto'|'none'; scroll?: boolean; }
export const layerPolicy: Record<string, LayerPolicyItem>;
export function applyPointerPolicy(mode?: 'strict'|'ui'): void;
export function layerIndex(name: string): number;
declare const _default: {
  minDefaultLayers: typeof minDefaultLayers;
  maxDefaultLayers: typeof maxDefaultLayers;
  defaultLayers: typeof defaultLayers;
  layerPolicy: typeof layerPolicy;
  layerIndex: typeof layerIndex;
  applyPointerPolicy: typeof applyPointerPolicy;
};
export default _default;

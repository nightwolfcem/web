/**
 * Global layer identifiers used by the editor.
 * Typically match Olayers/subLayers names.
 */
export type TLayerId =
  | 'background' | 'base' | 'content' | 'tools' | 'widget' | 'mainMenu' | 'dropdown'
  | 'tooltip' | 'contextMenu' | 'popup' | 'windows' | 'overlay' | 'modal'
  | 'selection' | 'dragPreview' | 'notification' | 'guide' | 'dialog';

/** Ordered list of layer ids (DOM order = z-order). */
export const TglobalLayers: TLayerId[];

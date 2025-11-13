'use strict';
// selectors.js — CSS hook points for layers/ids
export const selectors = {
  root: '[data-app-root],.tapp-root',
  content: '.tlayer-content,[data-layer="content"]',
  overlay: '.tlayer-overlay,[data-layer="overlay"]',
  selection: '.tselection-overlay,[data-layer="selection"]',
  elementIdAttr: 'data-id'
};
export default selectors;

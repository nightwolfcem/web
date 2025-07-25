
import { AllClass } from './core/classUtils.js';
import { DOM } from './dom/dom.js';

import { patchPrototypesForEvents } from './dom/eventHandling.js';
import { patchPrototypesForSerialization } from './dom/serialization.js'; // YENİ EKLENDİ

import './prototypes/object.js';
import './prototypes/date.js';
import './prototypes/string.js';
import './prototypes/array.js';

patchPrototypesForEvents();
patchPrototypesForSerialization(); // YENİ EKLENDİ


for (let el of AllClass.byOrder) {
if (typeof el.body === "function" && !el.loaded) {
el.body();
}
}




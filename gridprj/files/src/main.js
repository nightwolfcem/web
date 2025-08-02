
import  './core/classUtils.js';
import  './dom/dom.js';

import { patchEventTargetPrototypes } from './dom/eventHandling.js';
import { patchPrototypesForSerialization } from './dom/serialization.js'; // YENİ EKLENDİ

import './core/prototypes.js';


patchEventTargetPrototypes();
patchPrototypesForSerialization(); // YENİ EKLENDİ







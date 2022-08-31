import { readable, writable } from 'svelte/store';
import type Caret from './Caret';
import type Project from './Project';

// A store that contains the project currently being viewed.
export const project = writable<Project|undefined>(undefined);

// A store that contains the current editor's curosr.
export const caret = writable<Caret|undefined>(undefined);

// A store that tracks the last time the user has done a keystroke.
export const keyboardIdle = readable<boolean>(false);
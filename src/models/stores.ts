import { writable } from 'svelte/store';
import type Project from './Project';

// A store that contains the project currently being viewed.
export const project = writable<Project|undefined>(undefined);
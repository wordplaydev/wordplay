import { get, writable, type Writable } from 'svelte/store';
import eng_serious from './eng_serious';
import type Translation from './Translation';

// An app-wide list of preferred languages.
export const translations: Writable<Translation[]> = writable<Translation[]>([
    eng_serious,
]);

export function getLanguages() {
    return get(translations).map((t) => t.language);
}

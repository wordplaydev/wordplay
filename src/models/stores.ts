import { get, writable, type Writable } from 'svelte/store';
import { getPersistedValue, setPersistedValue } from '@db/persist';

// A local storage key for the animated state
export const ANIMATED_KEY = 'animated';
// Animations on.
export const animationsOn: Writable<boolean> = writable(
    getPersistedValue(ANIMATED_KEY) ?? true
);
// Animation duration.
export const animationDuration: Writable<number> = writable(200);
// Shorthand for Svelte transitions.
export function getAnimationDuration() {
    return { duration: get(animationsOn) ? get(animationDuration) : 0 };
}

// When the animation flag changes, persist it.
animationsOn.subscribe((on) => setPersistedValue(ANIMATED_KEY, on));

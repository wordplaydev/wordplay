import { get, writable, type Writable } from 'svelte/store';
import { getPersistedValue, setPersistedValue } from '@db/persist';

// A local storage key for the animated state
export const ANIMATED_KEY = 'animated';
// Animations on.

const persistedAnimationFactor = getPersistedValue(ANIMATED_KEY);

export const animationFactor: Writable<number> = writable(
    persistedAnimationFactor === true || persistedAnimationFactor === null
        ? 1
        : 0
);
// Animation duration.
export const animationDuration: Writable<number> = writable(200);
// Shorthand for Svelte transitions.
export function getAnimationDuration() {
    return { duration: get(animationFactor) * get(animationDuration) };
}

// When the animation flag changes, persist it.
animationFactor.subscribe((on) => setPersistedValue(ANIMATED_KEY, on));

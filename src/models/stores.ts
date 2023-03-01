import { get, writable, type Writable } from 'svelte/store';
import {
    getPersistedValue,
    setPersistedValue,
} from '../components/app/persist';

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
    return get(animationsOn) ? { duration: get(animationDuration) } : undefined;
}

// When the animation flag changes, persist it.
animationsOn.subscribe((on) => setPersistedValue(ANIMATED_KEY, on));

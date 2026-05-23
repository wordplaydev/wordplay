import { browser } from '$app/environment';
import { readable } from 'svelte/store';

const query = '(prefers-reduced-motion: reduce)';

/** A reactive store reflecting the OS `prefers-reduced-motion: reduce` media query. */
export const prefersReducedMotion = readable<boolean>(
    browser && window.matchMedia(query).matches,
    (set) => {
        if (!browser) return;
        const mql = window.matchMedia(query);
        const handler = (event: MediaQueryListEvent) => set(event.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    },
);

import { browser } from '$app/environment';
import { readable } from 'svelte/store';

/** ms after the last scroll event before we consider scrolling to have stopped. */
const IDLE_DELAY = 150;

/** True while the user is actively scrolling anywhere in the app; flips false ~IDLE_DELAY ms
 *  after scrolling stops. Used to suspend decorative animations (e.g. Speech bubbles) during
 *  scroll so they don't contend with the compositor and drop frames on mobile. */
export const scrolling = readable<boolean>(false, (set) => {
    if (!browser) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handler = () => {
        set(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => set(false), IDLE_DELAY);
    };
    // Capture + passive lets one cheap document-level listener catch scrolls from any nested
    // scroller (scroll doesn't bubble) without blocking the scroll itself.
    document.addEventListener('scroll', handler, { capture: true, passive: true });
    return () => {
        document.removeEventListener('scroll', handler, { capture: true });
        if (timer) clearTimeout(timer);
    };
});

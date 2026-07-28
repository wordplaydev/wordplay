// aria-description is in ARIA 1.3 (and shipped in browsers and screen
// readers) but not yet in Svelte's ARIA typings; NodeView uses it to
// describe code nodes, since generic elements may not carry aria-label.
import type {} from 'svelte/elements';

declare module 'svelte/elements' {
    interface AriaAttributes {
        'aria-description'?: string | null | undefined;
    }
}

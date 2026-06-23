/**
 * In-app clipboard cell. Lets paste-from-app skip the OS clipboard event
 * (and the per-event clipboard scanning that some browsers, notably Edge
 * on managed Windows, do on every paste). The OS clipboard is still
 * written via toClipboard() so cross-app copy/paste keeps working.
 *
 * Freshness model: the cell is "fresh" only when we can be confident the
 * OS clipboard still holds what we last wrote. We invalidate on:
 *   - window blur          — user moved focus to another window/app
 *   - tab hidden           — user switched tabs
 *   - foreign copy/cut     — DOM copy/cut event we didn't initiate
 *                            (mouse-selection copy in our own page falls
 *                            here too, which is the right call: we didn't
 *                            capture the selection text in this cell)
 *
 * Programmatic writes via navigator.clipboard.writeText do NOT fire a DOM
 * copy event, so our copy commands don't accidentally invalidate
 * themselves through the listener below.
 */

import { writable } from 'svelte/store';

let cell: { text: string } | undefined;
let fresh = false;

/**
 * The clipboard content to show in the editor footer, or undefined to hide it. Holds the last text
 * copied within Wordplay regardless of freshness, so the footer keeps showing what you copied even after
 * focus moves. Cleared when the user dismisses it or when a foreign copy/cut replaces the clipboard with
 * something we don't have.
 */
export const ClipboardContents = writable<string | undefined>(undefined);

if (typeof window !== 'undefined') {
    const invalidate = () => {
        fresh = false;
    };
    window.addEventListener('blur', invalidate);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') invalidate();
    });
    // A foreign copy/cut means the clipboard now holds something we didn't capture, so stop showing the
    // stale content in the footer. (Our own copies write programmatically and don't fire these events.)
    const replaced = () => {
        fresh = false;
        ClipboardContents.set(undefined);
    };
    document.addEventListener('copy', replaced);
    document.addEventListener('cut', replaced);
}

export function setInternalClipboard(text: string): void {
    cell = { text };
    fresh = true;
    ClipboardContents.set(text);
}

/** Clear Wordplay's internal clipboard and hide the footer. Leaves the OS clipboard untouched. */
export function clearInternalClipboard(): void {
    cell = undefined;
    fresh = false;
    ClipboardContents.set(undefined);
}

export function getInternalClipboard(): string | undefined {
    return fresh && cell !== undefined ? cell.text : undefined;
}

/** True if this exact text was the last thing copied from within Wordplay,
 *  regardless of clipboard freshness. Used to skip re-interpreting our own
 *  copied code as foreign data (e.g. CSV) on paste. */
export function wasCopiedHere(text: string): boolean {
    return cell !== undefined && cell.text === text;
}

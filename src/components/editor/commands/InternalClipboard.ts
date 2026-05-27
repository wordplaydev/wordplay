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

let cell: { text: string } | undefined;
let fresh = false;

if (typeof window !== 'undefined') {
    const invalidate = () => {
        fresh = false;
    };
    window.addEventListener('blur', invalidate);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') invalidate();
    });
    document.addEventListener('copy', invalidate);
    document.addEventListener('cut', invalidate);
}

export function setInternalClipboard(text: string): void {
    cell = { text };
    fresh = true;
}

export function getInternalClipboard(): string | undefined {
    return fresh && cell !== undefined ? cell.text : undefined;
}

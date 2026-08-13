/**
 * When tooltips may be shown, by trigger. On touch-primary devices a tap
 * synthesizes hover and leaves the control focused, and nothing ever unhovers
 * or unfocuses it — so a tip triggered by either sat on the screen like a
 * label. The policy: pointer-triggered tips require a device that can
 * actually hover, and focus-triggered tips require visible (keyboard) focus,
 * which also keeps them for external keyboards on touch devices. Labels
 * remain available to screen readers via aria-label either way.
 */

/** Whether the device can hover, and so pointer-enter tips make sense. */
export function canHoverTips(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: hover)').matches
    );
}

/** Whether this focus event reflects keyboard focus (not a tap or click),
 *  and so a focus tip makes sense. */
export function canFocusTips(view: EventTarget | null): boolean {
    return view instanceof Element && view.matches(':focus-visible');
}

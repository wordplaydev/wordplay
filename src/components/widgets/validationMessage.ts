/**
 * Where a field's validation message goes.
 *
 * It floats free of every ancestor rather than hanging off the field, because
 * an absolutely positioned message is clipped by anything that scrolls or caps
 * its height — and a field is very often inside one. Shared by TextField and
 * TextBox so a message reads the same wherever it comes from.
 *
 * Deliberately not `placeNearTarget`, which is the tooltip's geometry: a
 * tooltip centers on its target and prefers above, while this is the field's
 * own answer to what was typed. It belongs below the field and starting where
 * the field starts, so it reads as that field's message rather than as
 * something floating nearby.
 */

export type Box = {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
};

export type Size = { width: number; height: number };

export type Placement = { left: number; top: number };

export const ValidationMargin = 4;

let topLayer: boolean | undefined = undefined;

/**
 * Whether this browser can put the message in the **top layer**, which is the
 * only thing that gets it out of trouble. A field's ancestors routinely have a
 * `z-index` or a `transform` — the tile header has both — and each of those
 * creates a stacking context the message's own `z-index` cannot escape, while a
 * transform *also* makes `position: fixed` resolve against that ancestor rather
 * than the viewport. So a floating message was painted under the toolbar beside
 * it and positioned against the wrong box. The top layer answers all of it:
 * above everything, viewport-relative, and clipped by nothing.
 *
 * Where it is missing, callers fall back to the message hanging below the
 * field, which is what it did before — anchored correctly, and clippable.
 */
export function supportsTopLayer(): boolean {
    if (topLayer === undefined)
        topLayer =
            typeof HTMLElement !== 'undefined' &&
            'showPopover' in HTMLElement.prototype;
    return topLayer;
}

/**
 * The one message showing, if any.
 *
 * A message outlives the focus that raised it, and each is placed directly under
 * its own field — so two on a stacked form would put the upper one over the
 * lower field. Focus used to guarantee one at a time by accident; this does it
 * on purpose.
 */
let showing: HTMLElement | undefined = undefined;

/** Put the message in the top layer, if it isn't already, closing whichever
 *  other one was there. */
export function showMessage(view: HTMLElement) {
    if (!supportsTopLayer()) return;
    if (showing !== undefined && showing !== view) hideMessage(showing);
    try {
        if (!view.matches(':popover-open')) view.showPopover();
        showing = view;
    } catch {
        // A popover can refuse to open if it isn't connected yet; the effect
        // that calls this runs again when it is.
    }
}

/** Take it back out. */
export function hideMessage(view: HTMLElement) {
    if (!supportsTopLayer()) return;
    if (showing === view) showing = undefined;
    try {
        if (view.matches(':popover-open')) view.hidePopover();
    } catch {
        // Already closed, or never opened.
    }
}

/**
 * @param field where the field is, in viewport coordinates
 * @param panel how big the message is
 * @param viewport how much room there is
 * @param beside put it at the field's inline end rather than below it, for a
 * field whose own line is the thing being labelled
 * @param rtl whether the field reads right to left, which flips "start" and
 * "end"
 */
export default function placeValidationMessage(
    field: Box,
    panel: Size,
    viewport: Size,
    beside = false,
    rtl = false,
    margin = ValidationMargin,
): Placement {
    const clampLeft = (left: number) =>
        Math.max(margin, Math.min(left, viewport.width - panel.width - margin));

    // Beside the field, at its inline end — but only if it actually fits
    // there, since off-screen is worse than below.
    if (beside) {
        const start = rtl
            ? field.left - panel.width - margin
            : field.right + margin;
        if (start >= margin && start + panel.width + margin <= viewport.width)
            return { left: start, top: field.top };
    }

    // Below, which is where the answer to what you typed belongs; above only
    // when there is no room for it there.
    const below = field.bottom + panel.height + margin <= viewport.height;
    return {
        left: clampLeft(rtl ? field.right - panel.width : field.left),
        top: below ? field.bottom + margin : field.top - panel.height - margin,
    };
}

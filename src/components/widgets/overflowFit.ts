/**
 * How many of a toolbar's items fit inline, and therefore which of them collapse into the
 * overflow menu. Pure, so the policy below can be tested without a layout engine.
 */

/** What the toolbar knows when it decides. Widths are measured pixels. */
export type OverflowFit = {
    /** The container's inner width. */
    available: number;
    /** Each item's measured width, in the order they are rendered. */
    itemWidths: number[];
    /** Total width already committed to pinned groups, including their own gaps. */
    reserved: number;
    /** The flex gap between items. */
    gap: number;
    /** The overflow toggle's measured width. */
    toggleWidth: number;
    /** How many items were showing before this measurement. */
    previous: number;
};

/**
 * How much slack an item needs before it is allowed back inline.
 *
 * Without it the decision is a bare threshold, and a toolbar parked on that threshold flips
 * its answer on every measurement — which is the same control appearing and disappearing
 * from the bar. One gap is enough to be sure the room is real and small enough that nothing
 * stays collapsed once there is space for it.
 */
export const OverflowHysteresis = 1;

/** The width `count` items occupy inline, gaps included. An item that renders nothing has
 *  no width and emits no flex item, so it costs no gap either — counting one for it made
 *  the toolbar overflow slightly before it had to. */
function widthOf(itemWidths: number[], count: number, gap: number): number {
    let total = 0;
    let shown = 0;
    for (let i = 0; i < count; i++) {
        const width = itemWidths[i];
        if (width <= 0) continue;
        total += width + (shown > 0 ? gap : 0);
        shown++;
    }
    return total;
}

/**
 * How many items to show inline.
 *
 * Items keep their order and the first that doesn't fit truncates the rest, so an item that
 * grows doesn't merely push itself out — it takes the budget from everything behind it.
 * That is why the toolbar's stability depends on its items holding still, and why the
 * hysteresis below matters: the arithmetic is a cliff, and measurement noise at the edge of
 * it is indistinguishable from a real change.
 */
export default function overflowFit({
    available,
    itemWidths,
    reserved,
    gap,
    toggleWidth,
    previous,
}: OverflowFit): number {
    const count = itemWidths.length;
    if (available <= 0) return previous;

    const forItems = available - reserved;

    // Everything fits with no toggle at all? Then there is nothing to collapse. Held to the
    // hysteresis margin as well, so the toggle can't blink in and out at the boundary.
    if (
        widthOf(itemWidths, count, gap) <=
        forItems - hysteresisFor(previous, count, gap)
    )
        return count;

    // Otherwise the toggle is showing and reserves its own width. Measured rather than
    // assumed: it used to be read off the live element, which only exists once the toolbar
    // has decided to show it — so the toggle's width helped decide whether the toggle
    // existed, and that loop could oscillate with no content changing at all.
    const target = forItems - toggleWidth - gap;

    let fitting = 0;
    while (fitting < count && widthOf(itemWidths, fitting + 1, gap) <= target)
        fitting++;

    // Growing back needs slack; shrinking does not, since an item that no longer fits is
    // already overlapping something.
    if (fitting > previous) {
        while (
            fitting > previous &&
            widthOf(itemWidths, fitting, gap) >
                target - gap * OverflowHysteresis
        )
            fitting--;
    }
    return fitting;
}

/** The slack an already-collapsed toolbar must find before expanding again. None when it is
 *  already showing everything, so a first measurement isn't held back by it. */
function hysteresisFor(previous: number, count: number, gap: number): number {
    return previous >= count ? 0 : gap * OverflowHysteresis;
}

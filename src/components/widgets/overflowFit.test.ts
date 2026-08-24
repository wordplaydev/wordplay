import { expect, test } from 'vitest';
import overflowFit, {
    OverflowHysteresis,
} from '@components/widgets/overflowFit';

/** A toolbar of five equal items, with room for a toggle. */
function toolbar(available: number, previous: number, widths?: number[]) {
    return {
        available,
        itemWidths: widths ?? [40, 40, 40, 40, 40],
        reserved: 0,
        gap: 8,
        toggleWidth: 36,
        previous,
    };
}

test('everything fits when there is room for it', () => {
    // Five 40px items with four 8px gaps is 232px.
    expect(overflowFit(toolbar(400, 5))).toBe(5);
    expect(overflowFit(toolbar(232, 5))).toBe(5);
});

test('items collapse in order, and one that grows takes the room from those behind it', () => {
    // The prefix rule: the first item that doesn't fit truncates the rest, so an item that
    // grows doesn't merely push itself out — which is why the toolbar's stability depends
    // on its items holding still.
    const narrow = overflowFit(toolbar(180, 5));
    const grown = overflowFit(toolbar(180, 5, [40, 120, 40, 40, 40]));
    expect(grown).toBeLessThan(narrow);
});

test('a toolbar parked on the boundary keeps the answer it had', () => {
    // The reported symptom: with a bare threshold, a width sitting exactly where an item
    // stops fitting flips its answer on every measurement, and a control appears and
    // disappears from the bar. Find that width, then confirm both states hold.
    let boundary: number | undefined = undefined;
    for (let available = 100; available < 400; available++) {
        if (
            overflowFit(toolbar(available, 0)) >
            overflowFit(toolbar(available - 1, 0))
        ) {
            boundary = available;
            break;
        }
    }
    expect(boundary).toBeDefined();
    const just = boundary as number;
    // Approaching from below, the extra item is only taken once there is slack for it.
    const fromBelow = overflowFit(
        toolbar(just, overflowFit(toolbar(just - 1, 0))),
    );
    // Approaching from above, it is not given back at the same pixel it was taken.
    const fromAbove = overflowFit(
        toolbar(just, overflowFit(toolbar(just + 1, 0))),
    );
    expect(fromAbove).toBeGreaterThanOrEqual(fromBelow);
    expect(OverflowHysteresis).toBeGreaterThan(0);
});

test('an item that renders nothing costs no gap', () => {
    // A snippet that renders nothing emits no flex item and no gap, but the measurement
    // clone still exists — counting a gap for it made the toolbar overflow before it had to.
    const withEmpties = overflowFit(toolbar(200, 5, [40, 0, 40, 0, 40]));
    const withoutEmpties = overflowFit({
        ...toolbar(200, 3),
        itemWidths: [40, 40, 40],
    });
    expect(withEmpties).toBeGreaterThanOrEqual(withoutEmpties);
    // Three real items and two gaps is 136px, comfortably inside 200.
    expect(withEmpties).toBe(5);
});

test('the toggle is reserved from a measured width, not from whether it is showing', () => {
    // Its width used to be read off the live element, which exists only once the toolbar has
    // decided to show it — so the toggle's width helped decide whether the toggle existed.
    const wide = overflowFit({ ...toolbar(180, 0), toggleWidth: 36 });
    const wider = overflowFit({ ...toolbar(180, 0), toggleWidth: 100 });
    expect(wider).toBeLessThan(wide);
});

test('an unmeasured container changes nothing', () => {
    // Before layout there is no answer to give, and guessing one would collapse the toolbar
    // for a frame.
    expect(overflowFit({ ...toolbar(0, 4) })).toBe(4);
});

test('pinned groups take their room off the top', () => {
    const free = overflowFit(toolbar(300, 5));
    const crowded = overflowFit({ ...toolbar(300, 5), reserved: 150 });
    expect(crowded).toBeLessThan(free);
});

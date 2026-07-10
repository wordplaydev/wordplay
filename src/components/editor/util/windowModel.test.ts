import { test, expect, describe } from 'vitest';
import {
    lineStarts,
    lineAt,
    estimateSlotHeights,
    computeWindow,
    unionWindow,
    prefixSums,
    perLineHeight,
} from './windowModel';

describe('lineStarts / lineAt', () => {
    test('maps offsets to lines', () => {
        const code = 'ab\ncd\n\nef';
        const starts = lineStarts(code);
        expect(starts).toEqual([0, 3, 6, 7]); // lines start at 0, 3, 6, 7
        expect(lineAt(starts, 0)).toBe(0);
        expect(lineAt(starts, 1)).toBe(0);
        expect(lineAt(starts, 3)).toBe(1);
        expect(lineAt(starts, 5)).toBe(1);
        expect(lineAt(starts, 6)).toBe(2); // blank line
        expect(lineAt(starts, 7)).toBe(3);
        expect(lineAt(starts, 8)).toBe(3);
    });
});

describe('estimateSlotHeights', () => {
    test('gapless partition by line span × lineHeight', () => {
        // 3 statements at lines 0, 2, 5; total 7 lines; lineHeight 10.
        const code = Array(7).fill('x').join('\n'); // 7 lines
        const starts = lineStarts(code);
        // statement first-offsets at line 0, line 2, line 5
        const offs = [starts[0], starts[2], starts[5]];
        const heights = estimateSlotHeights(offs, starts, 10);
        expect(heights).toEqual([20, 30, 20]); // (2-0), (5-2), (7-5) × 10
        expect(heights.reduce((a, b) => a + b, 0)).toBe(70); // = totalLines × lineHeight
    });

    test('last slot stops at lastContentLine, excluding trailing End-token lines', () => {
        // Same 3 statements, but the final statement's content ends at line 5 (its
        // one line), with lines 6–7 belonging to the End token's trailing space.
        const code = Array(7).fill('x').join('\n');
        const starts = lineStarts(code);
        const offs = [starts[0], starts[2], starts[5]];
        // lastContentLine = 6 → last slot spans lines 5..6 = 1 line, not 2.
        const heights = estimateSlotHeights(offs, starts, 10, 6);
        expect(heights).toEqual([20, 30, 10]); // last is (6-5)×10, trailing line dropped
    });
});

describe('perLineHeight', () => {
    test('single-line gaps give the exact line height', () => {
        expect(perLineHeight([{ px: 24, lines: 1 }])).toBe(24);
    });
    test('multi-line and blank-line-led slots do not inflate the estimate', () => {
        // A 3-line slot (72px) and a single-line slot (24px): min ratio wins.
        expect(
            perLineHeight([
                { px: 72, lines: 3 },
                { px: 24, lines: 1 },
            ]),
        ).toBe(24);
        // Even with only a multi-line gap, dividing by the span is right.
        expect(perLineHeight([{ px: 72, lines: 3 }])).toBe(24);
    });
    test('wrapped slots (more pixels than lines) lose to unwrapped ones', () => {
        // A single source line wrapped to 2 visual lines measures 48px/1 line;
        // the unwrapped 24px/1 line is closer to the truth.
        expect(
            perLineHeight([
                { px: 48, lines: 1 },
                { px: 24, lines: 1 },
            ]),
        ).toBe(24);
    });
    test('unusable gaps are skipped; no gaps yield undefined', () => {
        expect(
            perLineHeight([
                { px: 0, lines: 1 },
                { px: 24, lines: 0 },
                { px: -5, lines: 1 },
            ]),
        ).toBeUndefined();
        expect(perLineHeight([])).toBeUndefined();
    });
});

describe('prefixSums', () => {
    test('cumulative offsets with the total last', () => {
        expect(prefixSums([])).toEqual([0]);
        expect(prefixSums([10, 0, 5])).toEqual([0, 10, 10, 15]);
    });
});

describe('computeWindow', () => {
    const heights = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]; // 10 statements, 100px total
    const prefix = prefixSums(heights);

    test('top of scroll, no buffer', () => {
        const w = computeWindow(prefix, 0, 30, 0);
        expect(w.first).toBe(0);
        expect(w.last).toBe(2); // [0,30) touches statements 0,1,2 (2 starts at 20 < 30)
        expect(w.topHeight).toBe(0);
        expect(w.bottomHeight).toBe(70); // statements 3..9
    });

    test('scrolled to middle with buffer', () => {
        const w = computeWindow(prefix, 40, 30, 10);
        // window [30, 80): statements 3..7
        expect(w.first).toBe(3);
        expect(w.last).toBe(7);
        expect(w.topHeight).toBe(30);
        expect(w.bottomHeight).toBe(20); // statements 8,9
    });

    test('spacers + rendered heights always sum to total', () => {
        const w = computeWindow(prefix, 55, 25, 15);
        let rendered = 0;
        for (let i = w.first; i <= w.last; i++) rendered += heights[i];
        expect(w.topHeight + rendered + w.bottomHeight).toBe(100);
    });

    test('variable heights', () => {
        const h = [5, 50, 5, 5, 50, 5]; // total 120
        const w = computeWindow(prefixSums(h), 60, 20, 0);
        // offsets: 0,5,55,60,65,115. window [60,80): statement 3 (60-65) and 4 (65-115)
        expect(w.first).toBe(3);
        expect(w.last).toBe(4);
        expect(w.topHeight).toBe(60);
        expect(w.bottomHeight).toBe(5);
    });

    test('empty list', () => {
        const w = computeWindow(prefixSums([]), 0, 30, 0);
        expect(w).toEqual({ first: 0, last: -1, topHeight: 0, bottomHeight: 0 });
    });

    test('scrolled past end clamps to last', () => {
        const w = computeWindow(prefix, 500, 30, 0);
        expect(w.first).toBe(9);
        expect(w.last).toBe(9);
        expect(w.topHeight).toBe(90);
        expect(w.bottomHeight).toBe(0);
    });

    test('asymmetric buffers extend only the lead side', () => {
        // Scrolling down: lead below. Window [40−0, 40+30+20) = [40, 90).
        const down = computeWindow(prefix, 40, 30, 0, 20);
        expect(down.first).toBe(4);
        expect(down.last).toBe(8);
        // Scrolling up: lead above. Window [40−20, 40+30+0) = [20, 70).
        const up = computeWindow(prefix, 40, 30, 20, 0);
        expect(up.first).toBe(2);
        expect(up.last).toBe(6);
        // Spacer-sum invariant holds under asymmetry.
        let rendered = 0;
        for (let i = down.first; i <= down.last; i++) rendered += heights[i];
        expect(down.topHeight + rendered + down.bottomHeight).toBe(100);
    });

    test('at rest (equal buffers) is identical to the symmetric form', () => {
        expect(computeWindow(prefix, 40, 30, 10, 10)).toEqual(
            computeWindow(prefix, 40, 30, 10),
        );
    });

    test('zero-height slots (statements sharing a line) keep spacer sums exact', () => {
        const h = [10, 0, 10, 10]; // total 30; statement 1 shares statement 0's line
        const w = computeWindow(prefixSums(h), 0, 15, 0);
        // [0,15) touches 0 (0-10) and 2 (10-20); the zero-height 1 never intersects.
        expect(w.first).toBe(0);
        expect(w.last).toBe(2);
        let rendered = 0;
        for (let i = w.first; i <= w.last; i++) rendered += h[i];
        expect(w.topHeight + rendered + w.bottomHeight).toBe(30);
    });
});

describe('unionWindow', () => {
    const heights = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]; // 100 total
    const prefix = prefixSums(heights);

    test('expands the range and recomputes spacers', () => {
        const w = computeWindow(prefix, 40, 30, 0); // statements 4..6
        const u = unionWindow(prefix, w, 2, 8);
        expect(u.first).toBe(2);
        expect(u.last).toBe(8);
        expect(u.topHeight).toBe(20);
        expect(u.bottomHeight).toBe(10);
        let rendered = 0;
        for (let i = u.first; i <= u.last; i++) rendered += heights[i];
        expect(u.topHeight + rendered + u.bottomHeight).toBe(100);
    });

    test('is a no-op when the held range is inside the window', () => {
        const w = computeWindow(prefix, 40, 30, 0);
        expect(unionWindow(prefix, w, 5, 5)).toBe(w);
    });

    test('clamps a stale held range to the current array', () => {
        const w = computeWindow(prefix, 40, 30, 0); // 4..6
        const u = unionWindow(prefix, w, -3, 42);
        expect(u.first).toBe(0);
        expect(u.last).toBe(9);
        expect(u.topHeight).toBe(0);
        expect(u.bottomHeight).toBe(0);
    });

    test('leaves the empty sentinel alone', () => {
        const empty = computeWindow(prefixSums([]), 0, 30, 0);
        expect(unionWindow(prefixSums([]), empty, 0, 5)).toBe(empty);
    });
});

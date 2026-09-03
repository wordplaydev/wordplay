import type { WritingDirection, WritingLayout } from '@locale/Scripts';
import { describe, expect, test } from 'vitest';
import createAxes, { ArrowKeys, type ArrowKey, type CaretMotion } from './axes';

/** An arbitrary off-origin container, so a projection that forgets to subtract
 *  the container's origin can't pass by accident. */
const Container = { left: 100, top: 40, right: 500, bottom: 340 };

const Modes: { layout: WritingLayout; direction: WritingDirection }[] = [
    { layout: 'horizontal-tb', direction: 'ltr' },
    { layout: 'horizontal-tb', direction: 'rtl' },
    { layout: 'vertical-rl', direction: 'ltr' },
    { layout: 'vertical-lr', direction: 'ltr' },
];

const name = (m: { layout: WritingLayout; direction: WritingDirection }) =>
    `${m.layout}/${m.direction}`;

describe('projection', () => {
    test.each(Modes)(
        'place inverts point in $layout/$direction',
        ({ layout, direction }) => {
            const axes = createAxes(layout, direction, Container);
            for (const [x, y] of [
                [100, 40],
                [220, 130],
                [500, 340],
            ]) {
                const back = axes.place(axes.point(x, y));
                // place returns container-relative offsets, which is what an
                // absolutely positioned child needs.
                expect(back.left).toBeCloseTo(x - Container.left);
                expect(back.top).toBeCloseTo(y - Container.top);
            }
        },
    );

    test.each(Modes)(
        'client round-trips a viewport point in $layout/$direction',
        ({ layout, direction }) => {
            const axes = createAxes(layout, direction, Container);
            for (const [x, y] of [
                [120, 60],
                [340, 210],
            ]) {
                const back = axes.client(axes.point(x, y));
                expect(back.clientX).toBeCloseTo(x);
                expect(back.clientY).toBeCloseTo(y);
            }
        },
    );

    test.each(Modes)(
        'the container origin projects to zero in $layout/$direction',
        ({ layout, direction }) => {
            const axes = createAxes(layout, direction, Container);
            // Whichever physical corner it is, the logical origin is 0,0.
            const corners = [
                axes.point(Container.left, Container.top),
                axes.point(Container.right, Container.top),
                axes.point(Container.left, Container.bottom),
                axes.point(Container.right, Container.bottom),
            ];
            expect(corners.some((c) => c.inline === 0 && c.block === 0)).toBe(
                true,
            );
        },
    );
});

describe('monotonicity', () => {
    // Two points, the second later in the line, per mode.
    const laterInLine: Record<string, [number, number][]> = {
        'horizontal-tb/ltr': [
            [150, 100],
            [300, 100],
        ],
        'horizontal-tb/rtl': [
            [300, 100],
            [150, 100],
        ],
        'vertical-rl/ltr': [
            [300, 100],
            [300, 200],
        ],
        'vertical-lr/ltr': [
            [300, 100],
            [300, 200],
        ],
    };
    // Two points, the second on a later line.
    const laterLine: Record<string, [number, number][]> = {
        'horizontal-tb/ltr': [
            [200, 100],
            [200, 200],
        ],
        'horizontal-tb/rtl': [
            [200, 100],
            [200, 200],
        ],
        // Lines progress right to left, so a later line is further left.
        'vertical-rl/ltr': [
            [300, 100],
            [200, 100],
        ],
        'vertical-lr/ltr': [
            [200, 100],
            [300, 100],
        ],
    };

    test.each(Modes)('later in the line is a larger inline', (mode) => {
        const axes = createAxes(mode.layout, mode.direction, Container);
        const [first, second] = laterInLine[name(mode)];
        expect(axes.point(...second).inline).toBeGreaterThan(
            axes.point(...first).inline,
        );
    });

    test.each(Modes)('a later line is a larger block', (mode) => {
        const axes = createAxes(mode.layout, mode.direction, Container);
        const [first, second] = laterLine[name(mode)];
        expect(axes.point(...second).block).toBeGreaterThan(
            axes.point(...first).block,
        );
    });

    test.each(Modes)('rect orders its edges in $layout/$direction', (mode) => {
        const axes = createAxes(mode.layout, mode.direction, Container);
        const r = axes.rect({ left: 150, top: 80, right: 260, bottom: 120 });
        expect(r.inlineStart).toBeLessThan(r.inlineEnd);
        expect(r.blockStart).toBeLessThan(r.blockEnd);
    });
});

describe('boxing', () => {
    test.each(Modes)('a logical rect boxes inside the container', (mode) => {
        const axes = createAxes(mode.layout, mode.direction, Container);
        const raw = { left: 150, top: 80, right: 260, bottom: 120 };
        const box = axes.box(axes.rect(raw));
        // Whatever the mode, projecting a physical rect and boxing it again
        // recovers the same container-relative box.
        expect(box.left).toBeCloseTo(raw.left - Container.left);
        expect(box.top).toBeCloseTo(raw.top - Container.top);
        expect(box.width).toBeCloseTo(raw.right - raw.left);
        expect(box.height).toBeCloseTo(raw.bottom - raw.top);
    });
});

describe('sizing', () => {
    test('a caret bar is thin across the text and long down the line', () => {
        const horizontal = createAxes('horizontal-tb', 'ltr', Container);
        // A horizontal-writing caret is a vertical bar: 2px wide, a line tall.
        expect(horizontal.size(2, 18)).toEqual({ width: 2, height: 18 });

        const vertical = createAxes('vertical-rl', 'ltr', Container);
        // A vertical-writing caret is a horizontal bar: a line wide, 2px tall.
        expect(vertical.size(2, 18)).toEqual({ width: 18, height: 2 });
    });
});

describe('key mapping', () => {
    // The whole table, written out, because it is the contract the editor's
    // arrow keys are judged against and deriving it here would just restate
    // the implementation.
    const Expected: Record<string, Record<ArrowKey, CaretMotion>> = {
        'horizontal-tb/ltr': {
            ArrowLeft: { axis: 'inline', direction: -1 },
            ArrowRight: { axis: 'inline', direction: 1 },
            ArrowUp: { axis: 'block', direction: -1 },
            ArrowDown: { axis: 'block', direction: 1 },
        },
        'horizontal-tb/rtl': {
            ArrowLeft: { axis: 'inline', direction: 1 },
            ArrowRight: { axis: 'inline', direction: -1 },
            ArrowUp: { axis: 'block', direction: -1 },
            ArrowDown: { axis: 'block', direction: 1 },
        },
        'vertical-rl/ltr': {
            ArrowLeft: { axis: 'block', direction: 1 },
            ArrowRight: { axis: 'block', direction: -1 },
            ArrowUp: { axis: 'inline', direction: -1 },
            ArrowDown: { axis: 'inline', direction: 1 },
        },
        'vertical-lr/ltr': {
            ArrowLeft: { axis: 'block', direction: -1 },
            ArrowRight: { axis: 'block', direction: 1 },
            ArrowUp: { axis: 'inline', direction: -1 },
            ArrowDown: { axis: 'inline', direction: 1 },
        },
    };

    test.each(Modes)('$layout/$direction maps every arrow', (mode) => {
        const axes = createAxes(mode.layout, mode.direction, Container);
        for (const key of ArrowKeys)
            expect(axes.motionForKey(key)).toEqual(Expected[name(mode)][key]);
    });

    test.each(Modes)('keyForMotion inverts motionForKey', (mode) => {
        const axes = createAxes(mode.layout, mode.direction, Container);
        for (const key of ArrowKeys)
            expect(axes.keyForMotion(axes.motionForKey(key))).toBe(key);
    });

    test.each(Modes)('all four motions are reachable', (mode) => {
        const axes = createAxes(mode.layout, mode.direction, Container);
        const motions = ArrowKeys.map((k) => axes.motionForKey(k));
        // No two keys mean the same thing, so no motion is unreachable.
        expect(
            new Set(motions.map((m) => `${m.axis}${m.direction}`)).size,
        ).toBe(4);
    });
});

describe('the scalar block accessors', () => {
    /* They exist only to keep a per-token filter allocation-free, so what has to
       hold is that they agree exactly with the projected rect they replace —
       otherwise hit-testing quietly diverges from outlining in one writing mode
       and nothing else would notice. */
    const rects = [
        { left: 120, top: 60, right: 200, bottom: 80 },
        { left: 300, top: 200, right: 460, bottom: 260 },
        // Degenerate along one axis, which a collapsed token view produces.
        { left: 150, top: 100, right: 150, bottom: 120 },
    ];

    test.each(Modes)('agree with rect in $layout/$direction', (mode) => {
        const axes = createAxes(mode.layout, mode.direction, Container);
        for (const r of rects) {
            const projected = axes.rect(r);
            expect(axes.blockStart(r)).toBe(projected.blockStart);
            expect(axes.blockEnd(r)).toBe(projected.blockEnd);
        }
    });

    test.each(Modes)(
        'containsBlock matches the projected span in $layout/$direction',
        (mode) => {
            const axes = createAxes(mode.layout, mode.direction, Container);
            for (const r of rects) {
                const { blockStart, blockEnd } = axes.rect(r);
                for (const at of [
                    blockStart - 1,
                    blockStart,
                    (blockStart + blockEnd) / 2,
                    blockEnd,
                    blockEnd + 1,
                ])
                    expect({ at, inside: axes.containsBlock(r, at) }).toEqual({
                        at,
                        inside: at >= blockStart && at <= blockEnd,
                    });
            }
        },
    );
});

import { describe, expect, test } from 'vitest';
import {
    buildRows,
    findRowAt,
    nearestInRow,
    targetRowPosition,
    targetRowPositionFromSpan,
    type RectLike,
    type RowMember,
} from './rowModel';

/** Build a member whose `data` is a string id, for terse assertions. */
function m(
    id: string,
    top: number,
    bottom: number,
    left = 0,
    right = 10,
): RowMember<string> {
    return { data: id, rect: { top, bottom, left, right } satisfies RectLike };
}

/** The ids of each row, top-to-bottom (sorted within a row, since intra-row
 *  member order is unspecified), for comparing whole clusterings. */
function rowIds(members: RowMember<string>[]): string[][] {
    return buildRows(members).map((r) =>
        r.members.map((mm) => mm.data).sort(),
    );
}

describe('buildRows', () => {
    test('clusters members on the same horizontal band into one row', () => {
        // Two normal lines, two tokens each. Members given out of order.
        expect(
            rowIds([
                m('b1', 0, 10, 0, 10),
                m('a1', 0, 10, 12, 20),
                m('b2', 20, 30, 12, 20),
                m('a2', 20, 30, 0, 10),
            ]),
        ).toEqual([
            ['a1', 'b1'],
            ['a2', 'b2'],
        ]);
    });

    test('a scaled (tall) member shares a row with its normal-height neighbour', () => {
        // A 2x-height paren on the same baseline as a normal token: their bands
        // overlap and both centers fall within the accumulated span, so they
        // cluster — the fix for "trapped between scaled parens".
        expect(
            rowIds([
                m('paren', -5, 25, 0, 8), // center 10, tall
                m('token', 5, 15, 10, 20), // center 10, normal
                m('next', 30, 40, 0, 10), // center 35, the row below
            ]),
        ).toEqual([['paren', 'token'], ['next']]);
    });

    test('a zero-width (blank-line) member still forms its own row', () => {
        // Blank lines render as zero-WIDTH but non-zero-HEIGHT space spans.
        expect(
            rowIds([
                m('line1', 0, 10),
                m('blank', 12, 22, 5, 5), // zero width
                m('line3', 24, 34),
            ]),
        ).toEqual([['line1'], ['blank'], ['line3']]);
    });

    test('soft-wrap fragments of one token become separate rows', () => {
        // Caller emits one member per getClientRects() fragment; each lands on
        // its own visual row rather than a single union box merging them.
        expect(
            rowIds([
                m('wrapA', 0, 10, 0, 100),
                m('wrapB', 12, 22, 0, 40),
            ]),
        ).toEqual([['wrapA'], ['wrapB']]);
    });
});

describe('findRowAt', () => {
    const rows = buildRows([m('r0', 0, 10), m('r1', 20, 30), m('r2', 40, 50)]);

    test('returns the row whose span contains y', () => {
        expect(findRowAt(rows, 25)).toBe(1);
    });

    test('snaps to the nearest row by center when y is in a gap', () => {
        expect(findRowAt(rows, 13)).toBe(0); // closer to r0 center (5) than r1 (25)
        expect(findRowAt(rows, 17)).toBe(1);
    });

    test('returns -1 when there are no rows', () => {
        expect(findRowAt([], 5)).toBe(-1);
    });
});

describe('nearestInRow', () => {
    const row = buildRows([m('left', 0, 10, 0, 10), m('right', 0, 10, 20, 30)])[0];

    test('picks the member containing x and clamps x into it', () => {
        expect(nearestInRow(row, 5)).toEqual({ member: row.members[0], x: 5 });
        expect(nearestInRow(row, 25)).toEqual({ member: row.members[1], x: 25 });
    });

    test('x in a gap clamps to the nearest member edge', () => {
        // x=14 is closer to left's right edge (10) than right's left edge (20).
        expect(nearestInRow(row, 14)).toEqual({ member: row.members[0], x: 10 });
        expect(nearestInRow(row, 17)).toEqual({ member: row.members[1], x: 20 });
    });

    test('x past all content clamps to the far member edge', () => {
        expect(nearestInRow(row, 100)).toEqual({ member: row.members[1], x: 30 });
    });
});

describe('targetRowPosition', () => {
    const rows = buildRows([
        m('top', 0, 10, 0, 30),
        m('mid', 20, 30, 0, 10),
        m('bot', 40, 50, 0, 30),
    ]);

    test('steps exactly one row down and lands at the goal column', () => {
        const result = targetRowPosition(rows, 5, 1, 25);
        expect(result?.member.data).toBe('mid');
        expect(result?.x).toBe(10); // clamped to mid's narrow right edge
    });

    test('steps exactly one row up', () => {
        expect(targetRowPosition(rows, 25, -1, 5)?.member.data).toBe('top');
    });

    test('returns undefined only at the document edges', () => {
        expect(targetRowPosition(rows, 5, -1, 5)).toBeUndefined(); // above first
        expect(targetRowPosition(rows, 45, 1, 5)).toBeUndefined(); // below last
    });

    test('a tall origin still steps only one row (no overshoot)', () => {
        const tall = buildRows([
            m('a', 0, 60, 0, 10), // very tall origin row
            m('b', 70, 80, 0, 10),
            m('c', 90, 100, 0, 10),
        ]);
        // Origin center 30 is on row a; down moves to b, never skipping to c.
        expect(targetRowPosition(tall, 30, 1, 5)?.member.data).toBe('b');
    });
});

describe('targetRowPositionFromSpan', () => {
    // r0 spans rows 0; a node spanning rows 1-2; r3, r4 below.
    const rows = buildRows([
        m('r0', 0, 10),
        m('r1', 20, 30),
        m('r2', 40, 50),
        m('r3', 60, 70),
        m('r4', 80, 90),
    ]);

    test('a span covering several rows steps below its LAST row going down', () => {
        // A node occupying rows r1+r2 (y 20..50): down lands on r3, not inside it.
        expect(targetRowPositionFromSpan(rows, 22, 48, 1, 5)?.member.data).toBe(
            'r3',
        );
    });

    test('a span covering several rows steps above its FIRST row going up', () => {
        expect(targetRowPositionFromSpan(rows, 22, 48, -1, 5)?.member.data).toBe(
            'r0',
        );
    });

    test('a zero-height span (a plain caret) behaves like a single-row step', () => {
        expect(targetRowPositionFromSpan(rows, 25, 25, 1, 5)?.member.data).toBe(
            'r2',
        );
        expect(targetRowPositionFromSpan(rows, 25, 25, -1, 5)?.member.data).toBe(
            'r0',
        );
    });

    test('a span ending on the last row has no row below (edge)', () => {
        expect(
            targetRowPositionFromSpan(rows, 62, 88, 1, 5),
        ).toBeUndefined();
    });
});

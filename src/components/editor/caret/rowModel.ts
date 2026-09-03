/**
 * Pure geometry for caret movement across lines. The editor's rendered glyphs
 * are carved into a stack of visual *rows* (a row is a blank line, or
 * one-or-more tokens/space runs sharing a band of the block axis). Moving
 * across lines finds the current row, steps exactly one row in the requested
 * direction, and lands at the member of that row nearest along the inline axis.
 *
 * Everything here is in the **logical** basis of `axes.ts`: `blockStart`/
 * `blockEnd` run across lines and `inlineStart`/`inlineEnd` run along the text,
 * both increasing in reading order whatever the writing mode. That is what lets
 * one implementation serve horizontal, RTL, and vertical writing alike — the
 * caller projects `DOMRect`s through `Axes.rect` before handing them over.
 *
 * This module is intentionally DOM-free — it operates on plain logical
 * rectangles and a caller-supplied payload `T` (e.g. the source element + how
 * to resolve it to a caret position) — so the clustering and row-walk logic is
 * unit-testable even though `getBoundingClientRect` returns zero everywhere in
 * JSDOM. The mode-specific gathering (which elements are members) and
 * resolution (member → caret position) live with the DOM code that owns those
 * concerns.
 */

import type { LogicalRect } from '@components/editor/util/axes';

/** A rendered thing that can host a caret position, plus where it is. */
export type RowMember<T> = {
    /** Caller payload used to resolve this member to a caret position. */
    data: T;
    rect: LogicalRect;
};

/** A band of members on the block axis, ordered in reading order within a Row[]. */
export type Row<T> = {
    blockStart: number;
    blockEnd: number;
    members: RowMember<T>[];
};

function centerBlock(rect: LogicalRect): number {
    return (rect.blockStart + rect.blockEnd) / 2;
}

function centerInline(rect: LogicalRect): number {
    return (rect.inlineStart + rect.inlineEnd) / 2;
}

/**
 * Cluster members into rows by block-center overlap (NOT a fixed line-height
 * grid, so scaled delimiters and mixed-height tokens cluster correctly). Sorts
 * by block start, then a member joins the current row when its block center
 * lies within the row's accumulated span, else it starts a new row. Rows here
 * are baseline-aligned, so members on the same line overlap heavily and
 * center-in-span is stable.
 */
export function buildRows<T>(members: RowMember<T>[]): Row<T>[] {
    const sorted = [...members].sort(
        (a, b) => a.rect.blockStart - b.rect.blockStart,
    );
    const rows: Row<T>[] = [];
    for (const member of sorted) {
        const c = centerBlock(member.rect);
        const current = rows[rows.length - 1];
        if (
            current !== undefined &&
            c >= current.blockStart &&
            c <= current.blockEnd
        ) {
            current.members.push(member);
            current.blockStart = Math.min(
                current.blockStart,
                member.rect.blockStart,
            );
            current.blockEnd = Math.max(current.blockEnd, member.rect.blockEnd);
        } else {
            rows.push({
                blockStart: member.rect.blockStart,
                blockEnd: member.rect.blockEnd,
                members: [member],
            });
        }
    }
    return rows;
}

/**
 * Index of the row whose block span contains `block`, else the row whose center
 * is nearest it. Returns -1 only when there are no rows.
 */
export function findRowAt<T>(rows: Row<T>[], block: number): number {
    let nearest = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        if (block >= row.blockStart && block <= row.blockEnd) return index;
        const distance = Math.abs((row.blockStart + row.blockEnd) / 2 - block);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = index;
        }
    }
    return nearest;
}

/**
 * The member of `row` nearest `inline`, and that inline coordinate clamped to
 * the member's span. A member containing `inline` wins (gap 0); ties break to
 * the member whose center is closest, so a boundary between a token and an
 * adjacent space run resolves deterministically.
 */
export function nearestInRow<T>(
    row: Row<T>,
    inline: number,
): { member: RowMember<T>; inline: number } {
    let best = row.members[0];
    let bestGap = Number.POSITIVE_INFINITY;
    let bestCenterDistance = Number.POSITIVE_INFINITY;
    for (const member of row.members) {
        const { inlineStart, inlineEnd } = member.rect;
        const gap =
            inline < inlineStart
                ? inlineStart - inline
                : inline > inlineEnd
                  ? inline - inlineEnd
                  : 0;
        const centerDistance = Math.abs(centerInline(member.rect) - inline);
        if (
            gap < bestGap ||
            (gap === bestGap && centerDistance < bestCenterDistance)
        ) {
            best = member;
            bestGap = gap;
            bestCenterDistance = centerDistance;
        }
    }
    return {
        member: best,
        inline: Math.min(
            Math.max(inline, best.rect.inlineStart),
            best.rect.inlineEnd,
        ),
    };
}

/**
 * The whole cross-line move as pure geometry: find the row at
 * `originCenterBlock`, step one row in `direction`, and return the nearest
 * member of that row at `goalInline` (clamped into it). Returns undefined when
 * there is no row to step to — before the first row or past the last of the
 * rows it was GIVEN. With a virtualized editor those are the rendered rows, not
 * the document's, so this is a window edge as often as a document edge; the
 * caller decides what to do about it (see Caret.moveLineVertical).
 */
export function targetRowPosition<T>(
    rows: Row<T>[],
    originCenterBlock: number,
    direction: -1 | 1,
    goalInline: number,
): { member: RowMember<T>; inline: number } | undefined {
    const current = findRowAt(rows, originCenterBlock);
    if (current < 0) return undefined;
    const target = current + direction;
    if (target < 0 || target >= rows.length) return undefined;
    return nearestInRow(rows[target], goalInline);
}

/**
 * Like targetRowPosition, but for an origin that spans a block range — a
 * selected node, which may cover several rows. The "current" row is the LAST
 * row the span overlaps when moving forward and the FIRST when moving back, so
 * the step lands on the row just past the node (never a row still inside it).
 * Falls back to the span's center when it overlaps no row.
 */
export function targetRowPositionFromSpan<T>(
    rows: Row<T>[],
    blockStart: number,
    blockEnd: number,
    direction: -1 | 1,
    goalInline: number,
): { member: RowMember<T>; inline: number } | undefined {
    let first = -1;
    let last = -1;
    for (let index = 0; index < rows.length; index++) {
        if (
            rows[index].blockStart <= blockEnd &&
            rows[index].blockEnd >= blockStart
        ) {
            if (first < 0) first = index;
            last = index;
        }
    }
    if (first < 0)
        return targetRowPosition(
            rows,
            (blockStart + blockEnd) / 2,
            direction,
            goalInline,
        );
    const target = (direction > 0 ? last : first) + direction;
    if (target < 0 || target >= rows.length) return undefined;
    return nearestInRow(rows[target], goalInline);
}

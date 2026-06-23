/**
 * Pure geometry for vertical caret movement. The editor's rendered glyphs are
 * carved into a stack of visual *rows* (a row is a blank line, or one-or-more
 * tokens/space runs sharing a horizontal band). Vertical arrow movement finds
 * the current row, steps exactly one row in the requested direction, and lands
 * at the horizontally nearest member of that row.
 *
 * This module is intentionally DOM-free — it operates on plain rectangles and a
 * caller-supplied payload `T` (e.g. the source element + how to resolve it to a
 * caret position) — so the clustering and row-walk logic is unit-testable even
 * though `getBoundingClientRect` returns zero everywhere in JSDOM. The mode-
 * specific gathering (which elements are members) and resolution (member → caret
 * position) live with the DOM code that owns those concerns.
 */

export type RectLike = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};

/** A rendered thing that can host a caret position, plus where it is on screen. */
export type RowMember<T> = {
    /** Caller payload used to resolve this member to a caret position. */
    data: T;
    rect: RectLike;
};

/** A horizontal band of members, ordered top-to-bottom within a Row[]. */
export type Row<T> = {
    top: number;
    bottom: number;
    members: RowMember<T>[];
};

function centerY(rect: RectLike): number {
    return (rect.top + rect.bottom) / 2;
}

function centerX(rect: RectLike): number {
    return (rect.left + rect.right) / 2;
}

/**
 * Cluster members into rows by vertical-center overlap (NOT a fixed line-height
 * grid, so scaled delimiters and mixed-height tokens cluster correctly). Sorts
 * by top, then a member joins the current row when its vertical center lies
 * within the row's accumulated [top, bottom] span, else it starts a new row.
 * Rows here are baseline-aligned, so members on the same line overlap heavily
 * and center-in-span is stable.
 */
export function buildRows<T>(members: RowMember<T>[]): Row<T>[] {
    const sorted = [...members].sort((a, b) => a.rect.top - b.rect.top);
    const rows: Row<T>[] = [];
    for (const member of sorted) {
        const c = centerY(member.rect);
        const current = rows[rows.length - 1];
        if (current !== undefined && c >= current.top && c <= current.bottom) {
            current.members.push(member);
            current.top = Math.min(current.top, member.rect.top);
            current.bottom = Math.max(current.bottom, member.rect.bottom);
        } else {
            rows.push({
                top: member.rect.top,
                bottom: member.rect.bottom,
                members: [member],
            });
        }
    }
    return rows;
}

/**
 * Index of the row whose vertical span contains `y`, else the row whose center
 * is nearest `y`. Returns -1 only when there are no rows.
 */
export function findRowAt<T>(rows: Row<T>[], y: number): number {
    let nearest = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        if (y >= row.top && y <= row.bottom) return index;
        const distance = Math.abs((row.top + row.bottom) / 2 - y);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = index;
        }
    }
    return nearest;
}

/**
 * The member of `row` nearest horizontal `x`, and the x clamped to that
 * member's [left, right]. A member containing `x` wins (gap 0); ties break to
 * the member whose center is closest to `x`, so a boundary between a token and
 * an adjacent space run resolves deterministically.
 */
export function nearestInRow<T>(
    row: Row<T>,
    x: number,
): { member: RowMember<T>; x: number } {
    let best = row.members[0];
    let bestGap = Number.POSITIVE_INFINITY;
    let bestCenterDistance = Number.POSITIVE_INFINITY;
    for (const member of row.members) {
        const { left, right } = member.rect;
        const gap = x < left ? left - x : x > right ? x - right : 0;
        const centerDistance = Math.abs(centerX(member.rect) - x);
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
        x: Math.min(Math.max(x, best.rect.left), best.rect.right),
    };
}

/**
 * The whole vertical move as pure geometry: find the row at `originCenterY`,
 * step one row in `direction`, and return the nearest member of that row at
 * `goalX` (with x clamped into it). Returns undefined only at a document edge —
 * stepping above the first row or below the last — which is the sole case where
 * vertical movement should fail to change the caret.
 */
export function targetRowPosition<T>(
    rows: Row<T>[],
    originCenterY: number,
    direction: -1 | 1,
    goalX: number,
): { member: RowMember<T>; x: number } | undefined {
    const current = findRowAt(rows, originCenterY);
    if (current < 0) return undefined;
    const target = current + direction;
    if (target < 0 || target >= rows.length) return undefined;
    return nearestInRow(rows[target], goalX);
}

/**
 * Like targetRowPosition, but for an origin that spans a vertical range
 * [top, bottom] — a selected node, which may cover several rows. The "current"
 * row is the LAST row the span overlaps when moving down and the FIRST when
 * moving up, so the step lands on the row just past the node (never a row still
 * inside it). Falls back to the span's center when it overlaps no row.
 */
export function targetRowPositionFromSpan<T>(
    rows: Row<T>[],
    top: number,
    bottom: number,
    direction: -1 | 1,
    goalX: number,
): { member: RowMember<T>; x: number } | undefined {
    let first = -1;
    let last = -1;
    for (let index = 0; index < rows.length; index++) {
        if (rows[index].top <= bottom && rows[index].bottom >= top) {
            if (first < 0) first = index;
            last = index;
        }
    }
    if (first < 0)
        return targetRowPosition(rows, (top + bottom) / 2, direction, goalX);
    const target = (direction > 0 ? last : first) + direction;
    if (target < 0 || target >= rows.length) return undefined;
    return nearestInRow(rows[target], goalX);
}

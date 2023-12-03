type Rect = {
    l: number;
    t: number;
    r: number;
    b: number;
    w: number;
    h: number;
};

export type Outline = {
    path: string;
    minx: number;
    miny: number;
    maxx: number;
    maxy: number;
};

export const OutlinePadding = 5;

function leftmost(rects: Rect[], at?: number) {
    return Math.min.apply(
        undefined,
        rects
            .filter((rect) => at === undefined || (rect.t < at && at < rect.b))
            .map((r) => r.l)
    );
}

function topmost(rects: Rect[], at?: number) {
    return Math.min.apply(
        undefined,
        rects
            .filter((rect) => at === undefined || (rect.l < at && at < rect.r))
            .map((r) => r.t)
    );
}

function rightmost(rects: Rect[], at?: number) {
    return Math.max.apply(
        undefined,
        rects
            .filter((rect) => at === undefined || (rect.t < at && at < rect.b))
            .map((r) => r.r)
    );
}

function bottommost(rects: Rect[], at?: number) {
    return Math.max.apply(
        undefined,
        rects
            .filter((rect) => at === undefined || (rect.l < at && at < rect.r))
            .map((r) => r.b)
    );
}

function getEditorOffset(el: HTMLElement) {
    // Account for the editor's viewport
    const editorViewport = el.closest('.editor');

    let _x = 0;
    let _y = 0;

    if (editorViewport) {
        const editorRect = editorViewport.getBoundingClientRect();
        _x = _x + editorRect.left - editorViewport.scrollLeft;
        _y = _y + editorRect.top - editorViewport.scrollTop;
    }

    return { top: _y, left: _x };
}

function getViewRect(offset: { left: number; top: number }, view: HTMLElement) {
    const rect = view.getBoundingClientRect();

    const left = rect.left - offset.left;
    const top = rect.top - offset.top;
    return {
        l: left,
        t: top,
        r: left + rect.width,
        b: top + rect.height,
        w: rect.width,
        h: rect.height,
    };
}

function getTokenRects(nodeView: HTMLElement) {
    const rects: Rect[] = [];

    // We do this instead of getBoundingClientRect() because the node view's position
    const nodeViewportOffset = getEditorOffset(nodeView);

    // Get the rectangles of all of the tokens's text (or if a value, it's symbols).
    const tokenViews = nodeView.querySelectorAll('.token-view, .symbol');
    for (const view of tokenViews) {
        if (view.closest('.hide') === null)
            rects.push(getViewRect(nodeViewportOffset, view as HTMLElement));
    }

    return rects;
}

export function createRectangleOutlineOf(nodeView: HTMLElement): string {
    const rects: Rect[] = getTokenRects(nodeView);

    // Start on the top left
    const lm = leftmost(rects);
    const tm = topmost(rects);
    const rm = rightmost(rects);
    const bm = bottommost(rects);

    return `M ${lm - OutlinePadding} ${tm - OutlinePadding} L ${
        rm + OutlinePadding
    } ${tm - OutlinePadding} L ${rm + OutlinePadding} ${
        bm + OutlinePadding
    } L ${lm - OutlinePadding} ${bm + OutlinePadding} Z`;
}

function toRows(
    nodeView: HTMLElement,
    horizontal: boolean,
    rtl: boolean
): Rect[] {
    const rects: Rect[] = getTokenRects(nodeView);

    // The official way to render nothing...
    if (rects.length === 0) return [];

    // Segment the rectangles into rows. We rely on document order to segment.
    const rows: Rect[][] = [[]];
    for (const rect of rects) {
        const currentRow = rows[rows.length - 1];
        const lastRect =
            currentRow.length === 0
                ? undefined
                : currentRow[currentRow.length - 1];
        // If this row is empty or this rect's vertical center is below the last rect's bottom, add to the current row.
        if (
            lastRect === undefined ||
            (horizontal
                ? rect.t + rect.h / 2 <= lastRect.b
                : rtl
                ? rect.r - rect.w / 2 >= lastRect.l
                : rect.l + rect.w / 2 <= lastRect.r)
        )
            currentRow.push(rect);
        else rows.push([rect]);
    }

    // Create a single rectangle for each row.
    return rows.map((row) => {
        return {
            l: leftmost(row),
            t: topmost(row),
            r: rightmost(row),
            b: bottommost(row),
            w: rightmost(row) - leftmost(row),
            h: bottommost(row) - topmost(row),
        };
    });
}

export function getUnderlineOf(
    nodeView: HTMLElement,
    horizontal: boolean,
    rtl: boolean,
    offset = 0
) {
    const rows = toRows(nodeView, horizontal, rtl);

    // If the rows are empty, draw an arrow where the element is
    if (rows.length === 0) {
        const radius = 10;
        const rect = getViewRect(getEditorOffset(nodeView), nodeView);
        return {
            path: `M ${rect.l - radius} ${rect.b + radius} L ${rect.l} ${
                rect.b
            } L ${rect.l + radius} ${rect.b + radius} Z`,
            minx: rect.l - radius,
            miny: rect.b,
            maxx: rect.l + radius,
            maxy: rect.b + radius,
        };
    }
    // Generate a path from the bottom edge (horizontal) or left edge (vertical) of each line's rectangle.
    // Each line starts with a move to, and then a single line to to the edge of the rectangle.
    else {
        rows.forEach((row) => {
            row.t += offset;
            row.b += offset;
        });

        return {
            path: horizontal
                ? rows
                      .map((row) => `M ${row.l} ${row.b} L ${row.r} ${row.b}`)
                      .join(' ')
                : rows
                      .map((row) => `M ${row.l} ${row.t} L ${row.l} ${row.b}`)
                      .join(' '),
            minx: Math.min(...rows.map((row) => row.l)),
            miny: Math.min(...rows.map((row) => row.t)),
            maxx: Math.max(...rows.map((row) => row.r)),
            maxy: Math.max(...rows.map((row) => row.b)),
        };
    }
}

export default function getOutlineOf(
    nodeView: HTMLElement,
    horizontal: boolean,
    rtl: boolean
): Outline {
    const lines = toRows(nodeView, horizontal, rtl);

    if (lines.length === 0)
        return { path: '', minx: 0, miny: 0, maxx: 0, maxy: 0 };

    const padding = 3;

    // Construct a path clockwise by moving through the rows.
    // Start with the top left of the first row.
    type Pos = { x: number; y: number };
    const path: Pos[] = [{ x: lines[0].l - padding, y: lines[0].t - padding }];
    // Trace the right edge of the remaining rows.
    for (let i = 0; i < lines.length; i++) {
        // Right top, then right bottom, extending down to the below row's top if there is one.
        // Account for padding between lines if the next row moves left.
        path.push({
            x: lines[i].r + padding,
            y:
                lines[i].t -
                padding * (i > 0 && lines[i].r < lines[i - 1].r ? -1 : 1),
        });
        path.push({
            x: lines[i].r + padding,
            y:
                i < lines.length - 1
                    ? lines[i + 1].t -
                      padding * (lines[i + 1].r < lines[i].r ? -1 : 1)
                    : lines[i].b + padding,
        });
    }
    // Trace the left edge of the rows in reverse.
    for (let i = lines.length - 1; i >= 0; i--) {
        // Bottom left, then top left, extending up to the above row's bottom if there is one.
        // Account for padding between lines if the next row moves right.
        path.push({
            x: lines[i].l - padding,
            y:
                lines[i].b +
                padding *
                    (i < lines.length - 1 && lines[i].l > lines[i + 1].l
                        ? -1
                        : 1),
        });
        path.push({
            x: lines[i].l - padding,
            y:
                i > 0
                    ? lines[i - 1].b +
                      padding * (lines[i - 1].l > lines[i].l ? -1 : 1)
                    : lines[i].t + padding,
        });
    }

    // Construct the path and bounding box
    return {
        path: `M ${path.map((pos) => `${pos.x} ${pos.y}`).join(' L ')} Z`,
        minx: Math.min(...path.map((pos) => pos.x)),
        miny: Math.min(...path.map((pos) => pos.y)),
        maxx: Math.max(...path.map((pos) => pos.x)),
        maxy: Math.max(...path.map((pos) => pos.y)),
    };
}

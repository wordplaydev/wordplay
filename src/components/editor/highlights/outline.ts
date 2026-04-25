import { TAB_WIDTH } from '@parser/Spaces';
import { measureTokenSegment } from './measureTokenSegment';

export type Rect = {
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

export const OutlinePadding = 2;

function leftmost(rects: Rect[], at?: number) {
    return Math.min.apply(
        undefined,
        rects
            .filter((rect) => at === undefined || (rect.t < at && at < rect.b))
            .map((r) => r.l),
    );
}

function topmost(rects: Rect[], at?: number) {
    return Math.min.apply(
        undefined,
        rects
            .filter((rect) => at === undefined || (rect.l < at && at < rect.r))
            .map((r) => r.t),
    );
}

function rightmost(rects: Rect[], at?: number) {
    return Math.max.apply(
        undefined,
        rects
            .filter((rect) => at === undefined || (rect.t < at && at < rect.b))
            .map((r) => r.r),
    );
}

function bottommost(rects: Rect[], at?: number) {
    return Math.max.apply(
        undefined,
        rects
            .filter((rect) => at === undefined || (rect.l < at && at < rect.r))
            .map((r) => r.b),
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

/** Given a node view, get the bounding boxes of the space prior to it. */
function getPrecedingSpaceRects(nodeView: HTMLElement): Rect[] {
    const rects: Rect[] = [];

    // Find the space view preceding the node view.
    const spaceView = nodeView.previousElementSibling;
    if (spaceView instanceof HTMLElement) {
        const spaces = spaceView.querySelectorAll('.space-text');
        for (const space of spaces)
            if (space instanceof HTMLElement)
                rects.push(getViewRect(getEditorOffset(nodeView), space));
    }

    return rects;
}

function getNodeTokenRects(nodeView: HTMLElement, blocks: boolean): Rect[] {
    // Get the rectangles of all of the tokens's text (or if a value, it's symbols).
    const tokenViews = nodeView.querySelectorAll('.token-view, .symbol');

    return getTokenRects(Array.from(tokenViews) as HTMLElement[], blocks);
}

export function getTokenRects(
    tokenViews: HTMLElement[],
    blocks: boolean,
    // The offset from the first view to render from, for partial rects
    clip?: {
        start: number;
        // The offset from the last view to render from, for partial rects
        end: number;
    },
): Rect[] {
    if (tokenViews.length === 0) return [];
    const offset = getEditorOffset(tokenViews[0]);

    const rects: Rect[] = [];
    for (const view of tokenViews) {
        if (view instanceof HTMLElement) {
            // If the view is not hidden, include it in the rects.
            if (view.closest('.hide') === null) {
                // Add rects for token
                const tokenRect = getViewRect(offset, view);

                if (clip) {
                    const { start, end } = clip;
                    // If the start and end are the same, clip both sides of the rect
                    if (tokenViews[0] === view && view === tokenViews.at(-1)) {
                        const tokenView = view.querySelector('.token-view');
                        if (tokenView) {
                            const [startWidth] = measureTokenSegment(
                                tokenView,
                                start,
                                blocks,
                            ) ?? [0];
                            const [endWidth] = measureTokenSegment(
                                tokenView,
                                end,
                                blocks,
                            ) ?? [0];
                            const initialLeft = tokenRect.l;
                            tokenRect.l += startWidth;
                            tokenRect.w = initialLeft + endWidth - startWidth;
                            tokenRect.r = initialLeft + endWidth;
                        }
                    }
                    // If there is a start offset, clip the left side of the rect
                    else if (tokenViews[0] === view) {
                        const tokenView = view.querySelector('.token-view');
                        if (tokenView) {
                            const [width] = measureTokenSegment(
                                tokenView,
                                start,
                                blocks,
                            ) ?? [0];
                            tokenRect.l += width;
                            tokenRect.w -= width;
                        }
                    }
                    // If there is an end offset, and this is the end token, clip the right side of the rect.
                    else if (tokenViews.at(-1) === view) {
                        const tokenView = view.querySelector('.token-view');
                        if (tokenView) {
                            const [width] = measureTokenSegment(
                                tokenView,
                                end,
                                blocks,
                            ) ?? [0];
                            tokenRect.r -= tokenRect.w - width;
                            tokenRect.w -= tokenRect.r - tokenRect.l;
                        }
                    }
                }

                rects.push(tokenRect);
            }
        }
    }
    return rects;
}

export function createRectangleOutlineOf(
    nodeView: HTMLElement,
    blocks: boolean,
): string {
    const rects: Rect[] = getNodeTokenRects(nodeView, blocks);

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

function nodeToRows(
    nodeView: HTMLElement,
    horizontal: boolean,
    rtl: boolean,
    blocks: boolean,
): Rect[] {
    let rects: Rect[] = [
        // If this is a program node, include the program's preceding space, since it will be deleted if the program is deleted.
        ...(nodeView.dataset.uiid === 'Program'
            ? getPrecedingSpaceRects(nodeView)
            : []),
        ...getNodeTokenRects(nodeView, blocks),
    ];

    // If we didn't get any rectangles, that means the node has no tokens.
    // Let's get the rectangle of the node itself instead.
    if (rects.length === 0)
        rects = [getViewRect(getEditorOffset(nodeView), nodeView)];

    return rectsToRows(rects, horizontal, rtl);
}

export function rectsToRows(
    rects: Rect[],
    horizontal: boolean,
    rtl: boolean,
): Rect[] {
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
    blocks: boolean,
    offset = 0,
) {
    const rows = nodeToRows(nodeView, horizontal, rtl, blocks);

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
    rtl: boolean,
    blocks: boolean,
): Outline {
    const lines = nodeToRows(nodeView, horizontal, rtl, blocks);

    return getOutlineOfRows(lines);
}

export function getOutlineOfRows(lines: Rect[]): Outline {
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

export type SpaceLineClip = {
    /** First selected source-character index within this line (0-based). */
    charStart: number;
    /** Exclusive end of selected source characters within this line. */
    charEnd: number;
    /** Original source content of this line (spaces/tabs only, no '\n'). */
    lineContent: string;
};

/**
 * Return bounding rects for the .space-text spans that precede the given
 * token view element.  The .space container is located by querying the
 * editor ancestor by data-id, so it is found correctly regardless of where
 * getSpaceRoot placed it in the DOM.
 *
 * lineClips maps each included line index (from space.split('\n')) to the
 * source-char range that is selected within that line.  Only spans whose
 * data-line attribute appears in the map are processed, and each is clipped
 * horizontally to the selected character range using measureTokenSegment —
 * the same technique used for token rects.  Tab characters are accounted for
 * by converting source-char offsets to rendered-char offsets first.
 *
 * Empty lines (lineContent === '') receive a 4-px minimum-width sliver.
 * Zero-height spans receive fallbackHeight.
 */
export function getSpaceRects(
    tokenView: HTMLElement,
    fallbackHeight: number,
    blocks: boolean,
    lineClips: Map<number, SpaceLineClip>,
): Rect[] {
    const id = tokenView.dataset.id;
    const editorEl = tokenView.closest('.editor');
    if (!id || !(editorEl instanceof HTMLElement)) return [];

    const spaceEl = editorEl.querySelector(`.space[data-id="${id}"]`);
    if (!(spaceEl instanceof HTMLElement)) return [];

    const offset = getEditorOffset(tokenView);
    const rects: Rect[] = [];

    for (const span of spaceEl.querySelectorAll('[data-uiid="space-text"]')) {
        if (!(span instanceof HTMLElement)) continue;
        const lineAttr = span.dataset.line;
        if (lineAttr === undefined) continue;
        const clip = lineClips.get(parseInt(lineAttr, 10));
        if (!clip) continue;

        const raw = getViewRect(offset, span);
        if (raw.w === 0 && raw.h === 0) continue;

        const h = raw.h === 0 ? fallbackHeight : raw.h;

        if (clip.lineContent.length === 0) {
            // Empty line: show a minimum-width sliver at this line's position.
            rects.push({ l: raw.l, t: raw.t, r: raw.l + 4, b: raw.t + h, w: 4, h });
        } else {
            // Non-empty line: clip horizontally to the selected character range.
            // Tabs expand to TAB_WIDTH rendered characters, so convert source
            // indices to rendered indices before calling measureTokenSegment.
            const renderedStart = toRenderedOffset(
                clip.lineContent,
                clip.charStart,
            );
            const renderedEnd = toRenderedOffset(
                clip.lineContent,
                clip.charEnd,
            );
            const startW =
                measureTokenSegment(span, renderedStart, blocks)?.[0] ?? 0;
            const endW =
                measureTokenSegment(span, renderedEnd, blocks)?.[0] ?? 0;
            const w = endW - startW;
            if (w <= 0) continue;
            const l = raw.l + startW;
            rects.push({ l, t: raw.t, r: l + w, b: raw.t + h, w, h });
        }
    }

    return rects;
}

/** Convert a source character index within a space line to the corresponding
 *  rendered character offset, expanding each tab to TAB_WIDTH characters. */
function toRenderedOffset(lineContent: string, charIdx: number): number {
    let rendered = 0;
    for (let i = 0; i < charIdx && i < lineContent.length; i++)
        rendered += lineContent[i] === '\t' ? TAB_WIDTH : 1;
    return rendered;
}

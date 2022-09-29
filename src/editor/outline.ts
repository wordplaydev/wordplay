type Rect = { l: number, t: number, r: number, b: number, w: number, h: number }

function leftmost(rects: Rect[], at?: number) {
    return Math.min.apply(undefined, rects.filter(rect => at === undefined || (rect.t < at && at < rect.b)).map(r => r.l));
}

function topmost(rects: Rect[], at?: number) {
    return Math.min.apply(undefined, rects.filter(rect => at === undefined || (rect.l < at && at < rect.r)).map(r => r.t));
}

function rightmost(rects: Rect[], at?: number) {
    return Math.max.apply(undefined, rects.filter(rect => at === undefined || (rect.t < at && at < rect.b)).map(r => r.r));
}

function bottommost(rects: Rect[], at?: number) {
    return Math.max.apply(undefined, rects.filter(rect => at === undefined || (rect.l < at && at < rect.r)).map(r => r.b));
}


function getTokenRects(nodeView: Element, offsetX: number, offsetY: number) {

    const rects: Rect[] = [];

    // Get the rectangles of all of the tokens
    const tokenViews = nodeView.querySelectorAll(".Token .text");
    for(const view of tokenViews) {
        const rect = view.getBoundingClientRect();
        rects.push({
            l: rect.left + offsetX,
            t: rect.top + offsetY,
            r: rect.left + offsetX + rect.width,
            b: rect.top + offsetY + rect.height,
            w: rect.width,
            h: rect.height
        });
    }

    return rects;

}

export function createRectangleOutlineOf(nodeView: Element, offsetX: number, offsetY: number): string {

    const rects: Rect[] = getTokenRects(nodeView, offsetX, offsetY);
    const PADDING = 5;

    // Start on the top left
    const lm = leftmost(rects);
    const tm = topmost(rects);
    const rm = rightmost(rects);
    const bm = bottommost(rects);

    return `M ${lm - PADDING} ${tm - PADDING} L ${rm + PADDING} ${tm - PADDING} L ${rm + PADDING} ${bm + PADDING} L ${lm - PADDING} ${bm + PADDING} Z`;


}

function lineTo(d: string, x: number, y: number) { return `${d} L ${x} ${y}`; }

export default function createRowOutlineOf(nodeView: Element, offsetX: number, offsetY: number): string {

    const rects: Rect[] = getTokenRects(nodeView, offsetX, offsetY);

    // Segment the rectangles into rows. We rely on document order to segment.
    const rows: Rect[][] = [[]];
    for(const rect of rects) {
        const currentRow = rows[rows.length - 1];
        const lastRect = currentRow.length === 0 ? undefined : currentRow[currentRow.length - 1];
        // If this row is empty or this rect's vertical center is below the last rect's bottom
        if(lastRect === undefined || rect.t + rect.h / 2 <= lastRect.b)
            currentRow.push(rect);
        else
            rows.push([rect]);
    }

    // Create a single rectangle for each row.
    const lines = rows.map((row) => {
        return {
            l: leftmost(row),
            t: topmost(row),
            r: rightmost(row),
            b: bottommost(row),
            w: rightmost(row) - leftmost(row),
            h: bottommost(row) - topmost(row)
        }
    });

    const padding = 6;

    // Construct a path clockwise by moving through the rows.
    // Start with the top left of the first row.
    let path = `M ${lines[0].l - padding} ${lines[0].t - padding}`;
    // Trace the right edge of the remaining rows.
    for(let i = 0; i < lines.length; i++) {
        // Right top, then right bottom, extending down to the below row's top if there is one.
        // Account for padding between lines if the next row moves left.
        path = lineTo(path, lines[i].r + padding, lines[i].t - padding * (i > 0 && lines[i].r < lines[i - 1].r ? -1 : 1));
        path = lineTo(path, lines[i].r + padding, i < lines.length - 1 ? lines[i + 1].t - padding * (lines[i + 1].r < lines[i].r ? -1 : 1) : lines[i].b + padding);
    }
    // Trace the left edge of the rows in reverse.
    for(let i = lines.length - 1; i >= 0; i--) {
        // Bottom left, then top left, extending up to the above row's bottom if there is one.
        // Account for padding between lines if the next row moves right.
        path = lineTo(path, lines[i].l - padding, lines[i].b + padding * (i < lines.length - 1 && lines[i].l > lines[i + 1].l ? -1 : 1));
        path = lineTo(path, lines[i].l - padding, i > 0 ? lines[i - 1].b + padding * (lines[i - 1].l > lines[i].l ? -1 : 1) : lines[i].t + padding);
    }

    // That's it!
    return path + "Z";

}
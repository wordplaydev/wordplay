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

function getEditorOffset(el: HTMLElement) {
    let currentNode: HTMLElement | null = el;
    var _x = 0;
    var _y = 0;
    while( currentNode && !isNaN( currentNode.offsetLeft ) && !isNaN( currentNode.offsetTop )) {
        _x += currentNode.offsetLeft - currentNode.scrollLeft;
        _y += currentNode.offsetTop - currentNode.scrollTop;
        currentNode = currentNode.offsetParent instanceof HTMLElement ? currentNode.offsetParent : null;
        // Stop when we reach the scroll box.
        if(currentNode?.style.overflow === "scroll")
            break;

    }
    return { top: _y, left: _x };
}

function getTokenRects(nodeView: HTMLElement) {

    const rects: Rect[] = [];

    const nodeViewportOffset = getEditorOffset(nodeView);
    const viewport = nodeView.closest(".source-content");
    let scrollLeft = viewport?.scrollLeft ?? 0;
    let scrollTop = viewport?.scrollTop ?? 0;

    // Get the rectangles of all of the tokens's text
    const tokenViews = nodeView.querySelectorAll(".Token .text");
    for(const view of tokenViews) {
        const rect = view.getBoundingClientRect();
        const left = rect.left - nodeViewportOffset.left + scrollLeft;
        const top = rect.top - nodeViewportOffset.top + scrollTop;
        rects.push({
            l: left,
            t: top,
            r: left + rect.width,
            b: top + rect.height,
            w: rect.width,
            h: rect.height
        });
    }    

    return rects;

}

export function createRectangleOutlineOf(nodeView: HTMLElement): string {

    const rects: Rect[] = getTokenRects(nodeView);
    const PADDING = 5;

    // Start on the top left
    const lm = leftmost(rects);
    const tm = topmost(rects);
    const rm = rightmost(rects);
    const bm = bottommost(rects);

    return `M ${lm - PADDING} ${tm - PADDING} L ${rm + PADDING} ${tm - PADDING} L ${rm + PADDING} ${bm + PADDING} L ${lm - PADDING} ${bm + PADDING} Z`;


}

export default function createRowOutlineOf(nodeView: HTMLElement): {path: string, minx: number, miny: number, maxx: number, maxy: number } {

    const rects: Rect[] = getTokenRects(nodeView);

    // The official way to render nothing...
    if(rects.length === 0) return { path: "", minx: 0, miny: 0, maxx: 0, maxy: 0 };

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

    const padding = 3;

    // Construct a path clockwise by moving through the rows.
    // Start with the top left of the first row.
    type Pos = { x: number, y: number }
    let path: Pos[] = [ { x: lines[0].l - padding, y: lines[0].t - padding } ];
    // Trace the right edge of the remaining rows.
    for(let i = 0; i < lines.length; i++) {
        // Right top, then right bottom, extending down to the below row's top if there is one.
        // Account for padding between lines if the next row moves left.
        path.push({ 
            x: lines[i].r + padding, 
            y: lines[i].t - padding * (i > 0 && lines[i].r < lines[i - 1].r ? -1 : 1)
        });
        path.push({ 
            x: lines[i].r + padding, 
            y: i < lines.length - 1 ? lines[i + 1].t - padding * (lines[i + 1].r < lines[i].r ? -1 : 1) : lines[i].b + padding
        });
    }
    // Trace the left edge of the rows in reverse.
    for(let i = lines.length - 1; i >= 0; i--) {
        // Bottom left, then top left, extending up to the above row's bottom if there is one.
        // Account for padding between lines if the next row moves right.
        path.push({
            x: lines[i].l - padding, 
            y: lines[i].b + padding * (i < lines.length - 1 && lines[i].l > lines[i + 1].l ? -1 : 1)
        });
        path.push({
            x: lines[i].l - padding, 
            y: i > 0 ? lines[i - 1].b + padding * (lines[i - 1].l > lines[i].l ? -1 : 1) : lines[i].t + padding
        });
    }

    // Construct the path and bounding box
    return { 
        path: `M ${path.map(pos => `${pos.x} ${pos.y}`).join(" L ")} Z`, 
        minx: Math.min.apply(Math, path.map(pos => pos.x)),
        miny: Math.min.apply(Math, path.map(pos => pos.y)),
        maxx: Math.max.apply(Math, path.map(pos => pos.x)),
        maxy: Math.max.apply(Math, path.map(pos => pos.y))
    };

}
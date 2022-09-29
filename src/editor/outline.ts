type Rect = { l: number, t: number, r: number, b: number }

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

const INCREMENT = 1;
const PADDING = 5;

export default function createOutlineOf(nodeView: Element, offsetX: number, offsetY: number): string {

    const rects: Rect[] = [];

    // Get the rectangles of all of the tokens
    const tokenViews = nodeView.querySelectorAll(".Token .text");
    for(const view of tokenViews) {
        const rect = view.getBoundingClientRect();
        rects.push({
            l: rect.left + offsetX,
            t: rect.top + offsetY,
            r: rect.left + offsetX + rect.width,
            b: rect.top + offsetY + rect.height
        });
    }

    // Start on the top left
    const lm = leftmost(rects);
    const tm = topmost(rects);
    const rm = rightmost(rects);
    const bm = bottommost(rects);

    // This algorithm below tried to draw a more precise border around the tokens, but it failed to account for whitespace, so
    // it ended up with all of these jagged gaps. We could revise it in the future to make it more precise, but a simple rectangle is enough for now.

    // const startX = lm;
    // const startY = tm;
    // let x = startX;
    // let y = startY;
    // let path = `M ${x} ${y}\n`;

    // // Scan top edge until we're past the right most rect.
    // { 
    //     while(x < rm) {
    //         // At each horizontal position, find top most point and if it’s changed from the last increment, make a new vertical line segment down
    //         const tmAt = topmost(rects, x);
    //         if(isFinite(tmAt) && y !== tmAt) {
    //             path += ` L ${x} ${y}`;
    //             path += ` L ${x} ${tmAt}`;
    //             y = tmAt;
    //         }
    //         x += INCREMENT;
    //     }
    //     path += ` L ${x} ${y}`;
    // }

    // // Scan right edge until we're past the bottom most rect.
    // {
    //     while(y < bm) {
    //         // At each vertical position, find the right most point and if it’s changed from the last increment, make a new horizontal line left
    //         const rmAt = rightmost(rects, y);
    //         if(isFinite(rmAt) && x !== rmAt) {
    //             path += ` L ${x} ${y}`;
    //             path += ` L ${rmAt} ${y}`;
    //             x = rmAt;
    //         }
    //         y += INCREMENT;
    //     }
    //     path += ` L ${x} ${y}`;
    // }
    
    // // Scan bottom edge until we're past the left most rect.
    // {
    //     while(x > lm) {
    //         // At each horizontal position, find bottom most point and if it’s changed from the last increment, make a new vertical line segment down
    //         const bmAt = bottommost(rects, x);
    //         if(isFinite(bmAt) && x !== bmAt) {
    //             path += ` L ${x} ${y}`;
    //             path += ` L ${x} ${bmAt}`;
    //             y = bmAt;
    //         }
    //         x -= INCREMENT;
    //     }
    //     path += ` L ${x} ${y}`;
    // }

    // // Scan left edge until we're past the top most rect.
    // {
    //     while(y > tm) {
    //         // At each vertical position, find the left most point and if it’s changed from the last increment, make a new horizontal line left
    //         const lmAt = leftmost(rects, y);
    //         if(isFinite(lmAt) && x !== lmAt) {
    //             path += ` L ${x} ${y}`;
    //             path += ` L ${lmAt} ${y}`;
    //             x = lmAt;
    //         }
    //         y -= INCREMENT;
    //     }
    //     path += ` L ${x} ${y}`;
    // }

    // // Finish the path by returning to the starting point
    // path += ` Z`;

    // return path;

    return `M ${lm - PADDING} ${tm - PADDING} L ${rm + PADDING} ${tm - PADDING} L ${rm + PADDING} ${bm + PADDING} L ${lm - PADDING} ${bm + PADDING} Z`;

}
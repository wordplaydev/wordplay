/**
 * Pure geometry for text-mode editor windowing (virtualizing the root block's
 * statement list). No DOM: given per-statement heights (estimated, then measured)
 * and the scroll viewport, it decides which contiguous run of statements to render
 * and how tall the top/bottom spacer divs must be so the scroll container's total
 * height — and thus the native scrollbar — matches the full content.
 *
 * The height array is the single source of truth: entry i is statement i's slot
 * height (its rendered box, which in text mode includes its leading whitespace).
 * Heights start as estimates from the source line model and are replaced by real
 * getBoundingClientRect measurements as statements render.
 */

/** Master switch for the text-mode windowing, currently ON while it stabilizes;
 *  if it proves contentious it can become a setting. */
export const WINDOWING_ENABLED = true;

/** Only window the root statement list when it has more than this many statements,
 *  so small programs render normally with zero windowing overhead. */
export const WINDOWING_MIN_STATEMENTS = 60;

/** Character offsets at which each source line begins. Line 0 starts at 0; every
 *  '\n' at offset i begins a new line at i+1. Built once per source so a
 *  statement's first line is a binary search rather than an O(tokens) walk. */
export function lineStarts(code: string): number[] {
    const starts = [0];
    for (let i = 0; i < code.length; i++)
        if (code[i] === '\n') starts.push(i + 1);
    return starts;
}

/** The 0-based line containing `offset` — the largest line whose start is ≤ offset. */
export function lineAt(starts: number[], offset: number): number {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= offset) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

/**
 * Initial slot-height estimates for `statementFirstOffsets` (each statement's
 * first character offset, in document order), partitioning the content so slots
 * are gapless: statement i spans from its first line up to the next statement's
 * first line; the last runs to `lastContentLine` (the line past the final
 * statement's last line — NOT `totalLines`). Trailing blank lines after the last
 * statement belong to the End token, which is rendered separately after the
 * windowed block, so folding them into the last slot would double-count them (the
 * bottom spacer reserves them AND the End token draws them) and inflate the
 * scrollbar until you reach the very bottom. Rough on purpose — measured heights
 * replace these as statements render.
 */
export function estimateSlotHeights(
    statementFirstOffsets: number[],
    starts: number[],
    lineHeight: number,
    lastContentLine: number = starts.length,
): number[] {
    const firstLines = statementFirstOffsets.map((o) => lineAt(starts, o));
    return firstLines.map((line, i) => {
        const nextLine =
            i + 1 < firstLines.length ? firstLines[i + 1] : lastContentLine;
        return Math.max(1, nextLine - line) * lineHeight;
    });
}

/**
 * The best per-line height estimate from measured slot gaps: each gap is the
 * pixel distance between two rendered statements' tops (`px`) spanning `lines`
 * source lines. Wrapping can only ADD pixels to a slot, never remove them, so the
 * smallest px-per-line ratio is the closest to the true line height. Returns
 * undefined when no gap is usable (zero/negative spans or pixels).
 */
export function perLineHeight(
    gaps: { px: number; lines: number }[],
): number | undefined {
    let best: number | undefined = undefined;
    for (const { px, lines } of gaps) {
        if (lines <= 0 || px <= 0) continue;
        const ratio = px / lines;
        if (best === undefined || ratio < best) best = ratio;
    }
    return best;
}

export type WindowRange = {
    /** Index of the first statement to render (inclusive). */
    first: number;
    /** Index of the last statement to render (inclusive); -1 when there are none. */
    last: number;
    /** Spacer height above the rendered run (sum of heights[0..first-1]). */
    topHeight: number;
    /** Spacer height below the rendered run (total − offset of last's end). */
    bottomHeight: number;
};

/**
 * Cumulative slot offsets: prefix[i] is slot i's top (prefix[0] = 0) and
 * prefix[heights.length] is the total content height. Computed once per
 * heights change so the per-scroll-frame window computation is a binary
 * search over it rather than an O(n) scan and allocation.
 */
export function prefixSums(heights: number[]): number[] {
    const prefix = new Array<number>(heights.length + 1);
    prefix[0] = 0;
    for (let i = 0; i < heights.length; i++)
        prefix[i + 1] = prefix[i] + heights[i];
    return prefix;
}

/** The largest index i with prefix[i] <= x (0 when x < 0). With duplicate
 * entries (zero-height slots) this lands on the LAST duplicate, which is
 * exactly the first slot whose half-open [prefix[i], prefix[i+1]) range can
 * contain x. */
function slotAt(prefix: number[], x: number): number {
    let lo = 0;
    let hi = prefix.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (prefix[mid] <= x) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

/** The largest index i with prefix[i] < x (0 when nothing is). */
function slotBefore(prefix: number[], x: number): number {
    let lo = 0;
    let hi = prefix.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (prefix[mid] < x) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

/**
 * The contiguous statement run intersecting the scroll viewport, plus overscan
 * above (`bufferAbove` px) and below (`bufferBelow`, defaulting to symmetric),
 * and the two spacer heights. Asymmetric buffers let the scroll handler extend
 * the overscan in the scroll direction proportional to velocity, so fast flicks
 * pre-mount the content they're about to reveal. `prefix` is the height
 * prefix-sum array (see prefixSums); `scrollTop` is the viewport's top in the
 * statements' own coordinate space (0 = first statement's top). Clamps to a
 * single end statement when scrolled entirely past the content. O(log n).
 */
export function computeWindow(
    prefix: number[],
    scrollTop: number,
    viewportHeight: number,
    bufferAbove: number,
    bufferBelow: number = bufferAbove,
): WindowRange {
    const n = prefix.length - 1;
    if (n === 0) return { first: 0, last: -1, topHeight: 0, bottomHeight: 0 };

    const top = scrollTop - bufferAbove;
    const bottom = scrollTop + viewportHeight + bufferBelow;
    const total = prefix[n];

    // Scrolled past all content (or degenerate): render one anchor statement so
    // the window is never empty (keeps the caret/measurement path alive).
    if (top >= total || bottom <= 0) {
        const i = scrollTop <= 0 ? 0 : n - 1;
        return {
            first: i,
            last: i,
            topHeight: prefix[i],
            bottomHeight: total - prefix[i + 1],
        };
    }

    // Half-open [prefix[i], prefix[i+1]): a zero-height statement never
    // intersects (slotAt skips it via the last-duplicate rule; slotBefore's
    // strict bound excludes it at the bottom edge).
    const first = Math.min(n - 1, slotAt(prefix, Math.max(0, top)));
    const last = Math.min(n - 1, slotBefore(prefix, Math.min(total, bottom)));

    // A degenerate band (e.g. an unmeasured zero-height viewport) intersects
    // nothing; anchor like the scrolled-past case above.
    if (last < first) {
        const i = scrollTop <= 0 ? 0 : n - 1;
        return {
            first: i,
            last: i,
            topHeight: prefix[i],
            bottomHeight: total - prefix[i + 1],
        };
    }

    return {
        first,
        last,
        topHeight: prefix[first],
        bottomHeight: total - prefix[last + 1],
    };
}

/**
 * Expand `win` to also include [first, last] (clamped to the slot range),
 * recomputing the spacer heights. Used to avoid unmounting mid-scroll: while a
 * scroll gesture is in progress the rendered range only grows — unmount work
 * competes with the mounts the viewport is waiting on, and a shrinking lead
 * buffer would otherwise retreat and remount the same statements.
 */
export function unionWindow(
    prefix: number[],
    win: WindowRange,
    first: number,
    last: number,
): WindowRange {
    const n = prefix.length - 1;
    if (n === 0 || win.last < win.first) return win;
    const f = Math.max(0, Math.min(win.first, first));
    const l = Math.min(n - 1, Math.max(win.last, last));
    if (f === win.first && l === win.last) return win;
    return {
        first: f,
        last: l,
        topHeight: prefix[f],
        bottomHeight: prefix[n] - prefix[l + 1],
    };
}

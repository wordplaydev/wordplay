/** What a document-scrolling key should do to a scroller. */
export type ScrollKeyAction =
    { kind: 'by'; delta: number } | { kind: 'to'; where: 'start' | 'end' };

/** One arrow press, in pixels — Chromium's and WebKit's `kPixelsPerLineStep`. */
const LineStep = 40;

/** The two constants both engines use to size a page step: never less than this
 *  fraction of the viewport, and never overlapping the previous page by more
 *  than `MaxPageOverlap` (Chromium's `MinFractionToStepWhenPaging` and
 *  `MaxOverlapBetweenPages`; WebKit's `Scrollbar` equivalents). */
const MinPageFraction = 0.875;
const MaxPageOverlap = 40;

/** How far a page key scrolls, matching what the engines do natively so paging
 *  the app's scroller feels identical to paging a document. */
export function pageStep(viewportHeight: number): number {
    return Math.max(
        viewportHeight * MinPageFraction,
        viewportHeight - MaxPageOverlap,
    );
}

/**
 * Where a scroll key should land, given the position the scroller is already
 * heading toward. Callers accumulate against the pending target rather than the
 * live `scrollTop`: a smooth `scrollBy` issued while an earlier one is still
 * animating restarts that animation from wherever the box currently is, so at
 * auto-repeat speed each press cancels the last one's progress and a held key
 * barely moves (measured: thirty repeats travelled 147px and settled at 881 of a
 * 3578px document, about one page). Clamping matters for the same reason — an
 * unclamped target built up over a long hold would leave the release with nothing
 * visible to do.
 */
export function nextScrollTarget(
    base: number,
    action: ScrollKeyAction,
    maxScroll: number,
): number {
    const raw =
        action.kind === 'by'
            ? base + action.delta
            : action.where === 'start'
              ? 0
              : maxScroll;
    return Math.max(0, Math.min(maxScroll, raw));
}

/** The longest a key scroll animates, however far it has to go. Chromium's own
 *  key scrolling settles in about this long; `behavior: 'smooth'` instead scales
 *  its duration with distance, so a target several pages away crawled. */
const MaxScrollMs = 150;

/** Pixels per millisecond, so a short hop finishes sooner than the cap. */
const ScrollSpeed = 8;

/** How long a key scroll of `distance` pixels should take. */
export function scrollDuration(distance: number): number {
    return Math.min(MaxScrollMs, Math.abs(distance) / ScrollSpeed);
}

/** Where the scroll should be `elapsed` ms into a move from `from` to `to`.
 *  Eased out, so it leaves immediately — the slow start of an ease-in-out is
 *  what made the first page feel like it lagged — and settles gently. */
export function scrollPosition(
    from: number,
    to: number,
    elapsed: number,
    duration: number,
): number {
    if (duration <= 0 || elapsed >= duration) return to;
    const t = Math.max(0, elapsed / duration);
    return from + (to - from) * (1 - Math.pow(1 - t, 3));
}

/**
 * The behavior for a programmatic scroll. Motion is gated app-wide by the
 * animation factor (0 when the creator chose calm, or their OS asks for reduced
 * motion). The gate has to be explicit: Chrome and Safari do NOT downgrade
 * `behavior: 'smooth'` under `prefers-reduced-motion` — only Firefox does.
 */
export function scrollBehaviorFor(animationFactor: number): ScrollBehavior {
    return animationFactor > 0 ? 'smooth' : 'auto';
}

/**
 * The scroll a document-scrolling key asks for, or undefined if the key isn't
 * one. Pure so the mapping can be tested without a browser; the caller decides
 * whether the keystroke is theirs to act on (see Page.svelte).
 */
export default function scrollKeyAction(
    key: string,
    shiftKey: boolean,
    viewportHeight: number,
): ScrollKeyAction | undefined {
    const page = pageStep(viewportHeight);
    switch (key) {
        case 'PageDown':
            return { kind: 'by', delta: page };
        case 'PageUp':
            return { kind: 'by', delta: -page };
        // Space pages down, Shift+Space pages up — the reading gesture every
        // document scroller has.
        case ' ':
            return { kind: 'by', delta: shiftKey ? -page : page };
        case 'ArrowDown':
            return { kind: 'by', delta: LineStep };
        case 'ArrowUp':
            return { kind: 'by', delta: -LineStep };
        case 'Home':
            return { kind: 'to', where: 'start' };
        case 'End':
            return { kind: 'to', where: 'end' };
        default:
            return undefined;
    }
}

import type Node from '@nodes/Node';
import type Source from '@nodes/Source';
import Token from '@nodes/Token';

/** The set of token ids currently rendered in the editor. A token is hidden by a
 *  fold exactly when its id is absent here — folding removes a collapsed node's
 *  hidden child tokens from the DOM (the folded view omits them), so the rendered
 *  `.token-view` set is the single source of truth shared by caret movement, the
 *  store-level normalization, and rendering. */
const renderedCache = new WeakMap<HTMLElement[], Set<number>>();

export function renderedTokenIds(
    getTokenViews: () => HTMLElement[],
): Set<number> {
    // The editor returns a STABLE array reference until it invalidates the cache
    // (source/fold/play change), then a fresh array. Keying the Set on that
    // reference rebuilds it once per invalidation instead of on every caller —
    // a single keystroke hits this from skipFolded, normalizeFolded, the
    // multi-click walk, and the delete-folded guard.
    const views = getTokenViews();
    const cached = renderedCache.get(views);
    if (cached !== undefined) return cached;
    const rendered = new Set<number>();
    for (const view of views) {
        const id = view.dataset.id;
        if (id !== undefined) rendered.add(parseInt(id));
    }
    renderedCache.set(views, rendered);
    return rendered;
}

/** The contiguous run of hidden (non-rendered) tokens that `pos` lands within,
 *  as `[lo, hi]` indices into `source.tokens`, or undefined when `pos` is on a
 *  rendered token. Token i owns `(prevTextEnd, textEnd]` — its leading whitespace
 *  through its text — so a position in the whitespace before a hidden token (a
 *  blank line included) counts as hidden too. On a token boundary the direction
 *  of travel decides which side we're entering. */
function hiddenRun(
    source: Source,
    pos: number,
    direction: -1 | 1,
    rendered: Set<number>,
): { lo: number; hi: number } | undefined {
    const tokens = source.tokens;
    let index = -1;
    let prevEnd = 0;
    for (let i = 0; i < tokens.length; i++) {
        const end = source.getTokenLastPosition(tokens[i]);
        if (end === undefined) continue;
        const within =
            direction > 0
                ? pos >= prevEnd && pos < end
                : pos > prevEnd && pos <= end;
        if (within) {
            index = i;
            break;
        }
        prevEnd = end;
    }
    if (index === -1 || rendered.has(tokens[index].id)) return undefined;
    let lo = index;
    let hi = index;
    while (lo - 1 >= 0 && !rendered.has(tokens[lo - 1].id)) lo--;
    while (hi + 1 < tokens.length && !rendered.has(tokens[hi + 1].id)) hi++;
    return { lo, hi };
}

/** If `pos` lands within a hidden token's span, return the far edge of that
 *  contiguous hidden run in the travel direction — just past it when moving
 *  forward, just before it when moving back — so only the collapsed tokens are
 *  skipped. Otherwise return `pos` unchanged. Used by horizontal caret movement
 *  (direction = the key pressed). */
export function skipHiddenIndex(
    source: Source,
    pos: number,
    direction: -1 | 1,
    rendered: Set<number>,
): number {
    const run = hiddenRun(source, pos, direction, rendered);
    if (run === undefined) return pos;
    const tokens = source.tokens;
    if (direction > 0)
        return source.getTokenLastPosition(tokens[run.hi]) ?? pos;
    return run.lo > 0
        ? (source.getTokenLastPosition(tokens[run.lo - 1]) ?? pos)
        : 0;
}

/** Whether `pos` is strictly interior to a hidden run — i.e. hidden in BOTH
 *  directions. A fold boundary such as a colon's text end (colon rendered, value
 *  hidden) has a rendered neighbour on one side, so it is NOT strictly hidden and
 *  stays placeable (a click just before the `…` must survive). */
export function isStrictlyHidden(
    source: Source,
    pos: number,
    rendered: Set<number>,
): boolean {
    return (
        skipHiddenIndex(source, pos, 1, rendered) !== pos &&
        skipHiddenIndex(source, pos, -1, rendered) !== pos
    );
}

/** The nearer visible edge of the hidden run containing `pos` (direction-agnostic;
 *  ties resolve to the leading edge). Only meaningful when `isStrictlyHidden`.
 *  Both edges are rendered-token boundaries, so the result is idempotent. */
export function nearestVisibleBoundary(
    source: Source,
    pos: number,
    rendered: Set<number>,
): number {
    const before = skipHiddenIndex(source, pos, -1, rendered);
    const after = skipHiddenIndex(source, pos, 1, rendered);
    return pos - before <= after - pos ? before : after;
}

/** Whether a node is wholly folded out of view — it has leaves, but none of its
 *  token leaves are rendered. The Node-level analogue of `isStrictlyHidden`,
 *  used to redirect a node selection that landed on collapsed-away content (e.g.
 *  Escape, blocks-mode movement) onto a visible ancestor. A partly-visible node
 *  (a folded Bind whose header still renders) is NOT hidden. */
export function isNodeHidden(node: Node, rendered: Set<number>): boolean {
    const leaves = node.leaves();
    return (
        leaves.length > 0 &&
        !leaves.some((leaf) => leaf instanceof Token && rendered.has(leaf.id))
    );
}

/** The nearest ancestor of a folded-out node whose wrapper is actually rendered —
 *  i.e. the first ancestor with at least one rendered leaf (the fold node, whose
 *  header renders). Used to redirect a node selection (e.g. Escape) that landed on
 *  a collapsed-away node onto the fold node. Undefined if none is found. */
export function nearestRenderedAncestor(
    source: Source,
    node: Node,
    rendered: Set<number>,
): Node | undefined {
    let current = source.root.getParent(node);
    while (current !== undefined) {
        if (
            current
                .leaves()
                .some((leaf) => leaf instanceof Token && rendered.has(leaf.id))
        )
            return current;
        current = source.root.getParent(current);
    }
    return undefined;
}

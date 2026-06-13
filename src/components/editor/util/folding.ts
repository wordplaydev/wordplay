import Node from '@nodes/Node';
import type Spaces from '@parser/Spaces';
import type { Writable } from 'svelte/store';
import Block from '@nodes/Block';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import Conditional from '@nodes/Conditional';
import Bind from '@nodes/Bind';
import Reaction from '@nodes/Reaction';
import Match from '@nodes/Match';
import Docs from '@nodes/Docs';
import ListLiteral from '@nodes/ListLiteral';
import SetLiteral from '@nodes/SetLiteral';
import MapLiteral from '@nodes/MapLiteral';
import TableLiteral from '@nodes/TableLiteral';

/** A container (list/set/map/table) is foldable once it has more than this many
 *  items, even on a single line — replacing NodeSequenceView's old "show more"
 *  count threshold so there's a single collapse model. */
export const FOLD_ITEM_THRESHOLD = 10;

/** The right-facing chevron `›` shared by every fold control: the inline toggle
 *  and both toolbar commands. Pointing right it means "collapsed → click to
 *  expand"; rotated by FOLD_GLYPH_ROTATION it points down ("expanded → click to
 *  collapse"), so every state uses one glyph — identical size and centering.
 *  Deliberately NOT the filled `▾` menu trigger or the `+` add-node trigger, so
 *  the fold control reads as distinct. */
export const FOLD_GLYPH = '›';
/** Degrees to rotate FOLD_GLYPH for the expanded/collapse state, shared by the
 *  inline toggle and the toolbar fold-all command so they stay in sync. */
export const FOLD_GLYPH_ROTATION = 90;

/** Whether any leaf after the first carries a newline in its preceding space —
 *  i.e. the leaves span more than one line. Shared by the whole-node and the
 *  docs-excluded foldability checks. */
function leavesSpanLines(leaves: Node[], spaces: Spaces): boolean {
    if (leaves.length < 2) return false;
    for (let i = 1; i < leaves.length; i++)
        if (spaces.getSpace(leaves[i]).includes('\n')) return true;
    return false;
}

/** A node is multi-line when one of its inner leaves carries a newline in its
 *  preceding space. */
export function isFoldable(node: Node, spaces: Spaces | undefined): boolean {
    return spaces !== undefined && leavesSpanLines(node.leaves(), spaces);
}

/** The docs node of a documented node, if any. Docs fold on their own, so the
 *  body's foldability is computed independently of them. */
function getDocs(node: Node): Docs | undefined {
    if (
        node instanceof Bind ||
        node instanceof Block ||
        node instanceof FunctionDefinition ||
        node instanceof StructureDefinition
    )
        return node.docs;
    return undefined;
}

/** A documented node's body is multi-line, ignoring leaves inside its docs (the
 *  docs fold separately, so a single-line body with multi-line docs is not
 *  itself foldable). Falls back to the whole node when there are no docs.
 *  Allocation-free: docs are the node's first child, so their leaves are the
 *  leading prefix of node.leaves(); we skip that many leaves instead of building
 *  a Set and filtering (this runs for every documented view on every render). */
function isBodyFoldable(node: Node, spaces: Spaces | undefined): boolean {
    if (spaces === undefined) return false;
    const docs = getDocs(node);
    const leaves = node.leaves();
    const skip =
        docs !== undefined && !docs.isEmpty() ? docs.leaves().length : 0;
    // Span lines iff some body leaf after the first carries a newline (the first
    // body leaf's leading space is the gap before the body and doesn't count —
    // matching leavesSpanLines on the docs-excluded leaves).
    for (let i = skip + 1; i < leaves.length; i++)
        if (spaces.getSpace(leaves[i]).includes('\n')) return true;
    return false;
}

/** Memoize isFoldableNode by (spaces, node). Both are immutable for a given
 *  parse — an edit yields a fresh Spaces and fresh nodes — so entries are
 *  naturally invalidated and garbage-collected, and the many callers in a single
 *  keystroke (every foldable view's `foldable` derivation plus the fold-all
 *  walk) share one computation per node. */
const foldableCache = new WeakMap<Spaces, WeakMap<Node, boolean>>();

/** Whether a node is one of the types that supports code folding AND currently
 *  meets the criteria (multi-line, or — for containers — over the item
 *  threshold). The single source of truth: each foldable view gates its control
 *  on this, and "fold all" collects exactly these nodes. The root Block (the
 *  whole program) is excluded. Memoized; the uncached computation is
 *  `computeFoldableNode`. */
export function isFoldableNode(
    node: Node,
    spaces: Spaces | undefined,
): boolean {
    if (spaces === undefined) return computeFoldableNode(node, spaces);
    let perNode = foldableCache.get(spaces);
    if (perNode === undefined) {
        perNode = new WeakMap();
        foldableCache.set(spaces, perNode);
    }
    const cached = perNode.get(node);
    if (cached !== undefined) return cached;
    const result = computeFoldableNode(node, spaces);
    perNode.set(node, result);
    return result;
}

function computeFoldableNode(
    node: Node,
    spaces: Spaces | undefined,
): boolean {
    if (node instanceof Block)
        return !node.isRoot() && isBodyFoldable(node, spaces);
    // Containers fold when multi-line OR over the item threshold (so long
    // single-line collections collapse too — replacing the old "show more").
    if (
        node instanceof ListLiteral ||
        node instanceof SetLiteral ||
        node instanceof MapLiteral ||
        node instanceof TableLiteral
    ) {
        const count =
            node instanceof TableLiteral
                ? node.rows.length
                : node.values.length;
        return isFoldable(node, spaces) || count > FOLD_ITEM_THRESHOLD;
    }
    // Docs fold on their own when they span more than one line.
    if (node instanceof Docs) return isFoldable(node, spaces);
    return (
        isBodyFoldable(node, spaces) &&
        (node instanceof FunctionDefinition ||
            node instanceof StructureDefinition ||
            node instanceof Conditional ||
            node instanceof Bind ||
            node instanceof Reaction ||
            node instanceof Match)
    );
}

/** Add or remove a node from the editor's set of folded nodes. Shared by every
 *  fold control (the toggle and the collapsed ellipsis). */
export function toggleFolded(
    folded: Writable<Set<Node>> | undefined,
    node: Node,
): void {
    folded?.update((set) => {
        const next = new Set(set);
        if (next.has(node)) next.delete(node);
        else next.add(node);
        return next;
    });
}

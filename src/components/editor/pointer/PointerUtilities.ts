import Caret from '@edit/caret/Caret';
import {
    AssignmentPoint,
    getInsertionPoint,
    InsertionPoint,
    kindAcceptsDrop,
} from '@edit/drag/Drag';
import Block from '@nodes/Block';
import type Context from '@nodes/Context';
import Node, { ListOf } from '@nodes/Node';
import type Program from '@nodes/Program';
import type Source from '@nodes/Source';
import Token from '@nodes/Token';
import { TAB_WIDTH } from '@parser/Spaces';
import {
    buildRows,
    targetRowPositionFromSpan,
    type Row,
    type RowMember,
} from '@components/editor/caret/rowModel';

/**
 * Given a rendered source, and a pointer event, find the empty list insertion under the
 * pointer and return the corresponding index into the buffer.
 * */
export function getEmptyList(
    source: Source,
    event: PointerEvent,
): number | undefined {
    // If the token is over an empty list, insertion point for that list.
    const el = document.elementFromPoint(event.clientX, event.clientY);

    const emptyView = el?.closest(`.empty`);
    if (
        emptyView instanceof HTMLElement &&
        emptyView.dataset.field &&
        emptyView.dataset.nodeid
    ) {
        const node = source.getNodeByID(parseInt(emptyView.dataset.nodeid));
        const field = emptyView.dataset.field;
        if (node === undefined) return undefined;
        const adjacentBefore = node.getAdjacentFieldNode(field, true);
        if (adjacentBefore !== undefined)
            return source.getNodeLastPosition(adjacentBefore);
        const adjacentAfter = node.getAdjacentFieldNode(field, false);
        if (adjacentAfter !== undefined)
            return source.getNodeFirstPosition(adjacentAfter);
        return source.getNodeFirstPosition(node);
    }
    return undefined;
}

/** Get the node under the pointer for the given rendered source */
export function getNodeAt(
    source: Source,
    event: PointerEvent | MouseEvent,
    includeTokens: boolean,
    // Optional pre-resolved element under the pointer. Pass this to avoid a
    // second document.elementFromPoint (a forced reflow) when the caller already
    // hit-tested the same point — e.g. hover resolves both the token and
    // non-token node from one elementFromPoint.
    resolved?: Element | null,
) {
    const el =
        resolved !== undefined
            ? resolved
            : document.elementFromPoint(event.clientX, event.clientY);
    // Only return a node if hovering over its text. Space isn't eligible.
    if (el instanceof HTMLElement) {
        const nodeView = el.closest(
            `.node-view${includeTokens ? '' : `:not(.Token)`}`,
        );
        if (nodeView instanceof HTMLElement && nodeView.dataset.id) {
            return source.expression.getNodeByID(parseInt(nodeView.dataset.id));
        }
    }
    return undefined;
}

/** Given a source context, a node being dragged, and a pointer event, identify the list insertion or field assignment under the pointer. */
/** Given a pointer event, find the insertion points in blocks mode. */
export function getBlockInsertionPoint(
    context: Context,
    event: PointerEvent,
    candidate: Node,
): InsertionPoint | AssignmentPoint | undefined {
    // Find the node under the pointer. If there isn't one, bail.
    const nodeUnderPointer = getNodeAt(context.source, event, false);
    if (nodeUnderPointer === undefined) return undefined;

    // Don't allow parents to be inserted into their children.
    if (candidate.contains(nodeUnderPointer)) return undefined;

    // Does the node under the pointer have an empty or node-list inside it?
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!(el instanceof HTMLElement)) return undefined;

    // Find the empty view closest to the element under the pointer.
    const emptyView = el.closest(`.empty`);
    if (emptyView instanceof HTMLElement && emptyView.dataset.field) {
        const point = getEmptyInsertionPoint(
            nodeUnderPointer,
            emptyView.dataset.field,
            candidate,
            context,
        );
        if (point) return point;
    }

    const list = el.closest('.node-list');
    if (list instanceof HTMLElement) {
        const point = getListInsertionPoint(
            list,
            nodeUnderPointer,
            event,
            candidate,
        );
        return point;
    }
}

function getEmptyInsertionPoint(
    nodeUnderPointer: Node,
    fieldName: string,
    candidate: Node,
    context: Context,
): InsertionPoint | AssignmentPoint | undefined {
    const fieldValue = nodeUnderPointer.getField(fieldName);
    const fieldInfo = nodeUnderPointer.getFieldNamed(fieldName);
    const kind = fieldInfo?.kind;

    // If it's a list and it allows the node kind being inserted, return an insertion point.
    // We don't gate on types here: type-erroring drops are permitted and explained, not blocked,
    // so insertion-point detection uses the same structural rule as node-replacement.
    if (
        fieldInfo !== undefined &&
        kind !== undefined &&
        Array.isArray(fieldValue) &&
        kind instanceof ListOf &&
        kindAcceptsDrop(kind, candidate)
    ) {
        // Special case a root block being dragged onto a root block's statements, replacing it with a replacement of the root block.
        // Makes it easier to drag onto an empty program.
        if (
            nodeUnderPointer instanceof Block &&
            nodeUnderPointer.isRoot() &&
            fieldName === 'statements' &&
            candidate instanceof Block &&
            candidate.isRoot()
        ) {
            return new AssignmentPoint(context.source.expression, 'expression');
        }

        return new InsertionPoint(
            nodeUnderPointer,
            fieldName,
            fieldValue,
            undefined,
            undefined,
            0,
        );
    }
    // If it's an unassigned field, offer an insertion point.
    else if (
        fieldValue === undefined &&
        kind !== undefined &&
        kind.allows(candidate)
    ) {
        return new AssignmentPoint(nodeUnderPointer, fieldName);
    }
}

function getListInsertionPoint(
    list: HTMLElement,
    nodeUnderPointer: Node,
    event: PointerEvent,
    candidate: Node,
): InsertionPoint | undefined {
    // Get the relevant metadata.
    const fieldName = list.dataset.field;
    if (fieldName === undefined) return undefined;

    const inline = list.dataset.direction === 'inline';
    const nodeList = nodeUnderPointer.getField(fieldName);
    const field = nodeUnderPointer.getFieldNamed(fieldName);
    const kind = field?.kind;

    if (
        field === undefined ||
        kind === undefined ||
        nodeList === undefined ||
        !Array.isArray(nodeList) ||
        !(kind instanceof ListOf)
    )
        return;

    // Get all the node views from the list's child nodes.
    const children = Array.from(list.childNodes).filter(
        (node): node is HTMLElement =>
            node instanceof HTMLElement && node.classList.contains('node-view'),
    );

    // Find the closest child based on the layout of the children. For block,
    // we assume a vertical list, finding the closest vertical child.
    // For inline, we assume a column of rows, finding the closest row first,
    // and then the closest child within that row.
    let closestChild: HTMLElement | undefined;
    if (inline) {
        // First, organize the children into rows.
        const rows: { child: HTMLElement; rect: DOMRect }[][] = [];
        for (const child of children) {
            const rect = child.getBoundingClientRect();
            // Is this child's top greater than the lowest bottom of the current row.
            if (
                rows.length === 0 ||
                rect.top >
                    Math.max(...rows[rows.length - 1].map((c) => c.rect.bottom))
            ) {
                rows.push([{ child, rect }]);
            } else rows[rows.length - 1].push({ child, rect });
        }
        // Find the closest vertical row.
        const closestRow = rows
            .map((row) => {
                const top = Math.min(...row.map((c) => c.rect.top));
                const bottom = Math.max(...row.map((c) => c.rect.bottom));
                return {
                    row,
                    distance: Math.abs(
                        event.clientY - (top + (bottom - top) / 2),
                    ),
                };
            })
            .sort((a, b) => a.distance - b.distance)[0]?.row;
        if (closestRow !== undefined) {
            // Within that row, find the closest child horizontally.
            closestChild = closestRow
                .map(({ child, rect }) => {
                    return {
                        child,
                        distance: Math.abs(
                            event.clientX - (rect.left + rect.width / 2),
                        ),
                    };
                })
                .sort((a, b) => a.distance - b.distance)[0]?.child;
        }
    } else {
        closestChild = children
            .map((child) => {
                const rect = child.getBoundingClientRect();
                return {
                    child,
                    distance: Math.abs(
                        event.clientY - (rect.top + rect.height / 2),
                    ),
                };
            })
            .sort((a, b) => a.distance - b.distance)[0]?.child;
    }

    // Find the index of the closest child.
    let index = 0;
    if (closestChild === undefined) return;

    index = children.indexOf(closestChild);
    if (index === -1) return;

    // If the pointer is past the center of the closest child, insert after it.
    const rect = closestChild.getBoundingClientRect();
    if (
        inline
            ? event.clientX > rect.left + rect.width / 2
            : event.clientY > rect.top + rect.height / 2
    )
        index += 1;

    // We don't gate on types here: type-erroring drops are permitted and explained, not blocked,
    // so insertion-point detection uses the same structural rule as node-replacement.
    if (kindAcceptsDrop(kind, candidate)) {
        return new InsertionPoint(
            nodeUnderPointer,
            fieldName,
            nodeList,
            undefined,
            undefined,
            index,
        );
    }
}

/** Given a pointer event, find the insertion points in text mode. */
export function getTextInsertionPointsAt(
    caret: Caret,
    event: PointerEvent,
    getTokenViews: () => HTMLElement[],
    editor: HTMLElement | null,
    blocks: boolean,
    /** True if the editor's writing direction is right-to-left */
    rtl: boolean,
): InsertionPoint[] {
    const source = caret.source;

    // Is the caret position between tokens?
    // If so, are any of the token's parents inside a list in which we could insert something?
    const position = getCaretPositionAt(
        caret,
        event,
        getTokenViews,
        editor,
        blocks,
        rtl,
    );

    // If we found a position, find what's between.
    if (position !== undefined) {
        // Create a caret for the position and get the token it's at.
        const caret = new Caret(
            source,
            position,
            undefined,
            undefined,
            undefined,
        );
        const token = caret.getToken();
        if (token === undefined) return [];

        // What is the space prior to this insertion point?
        const index = source.getTokenSpacePosition(token);
        if (index === undefined) return [];

        // Find what space is prior.
        const spacePrior = source.spaces
            .getSpace(token)
            .substring(0, position - index);

        // How many lines does the space prior include?
        const line = spacePrior.split('\n').length - 1;

        // What nodes are between this and are any of them insertion points?
        const { before, after } = caret.getNodesBetween();

        // If there are nodes between the point, construct insertion points
        // that exist in lists.
        return (
            [
                ...before.map((tree) =>
                    getInsertionPoint(source, tree, false, token, line),
                ),
                ...after.map((tree) =>
                    getInsertionPoint(source, tree, true, token, line),
                ),
            ]
                // Filter out duplicates and undefineds
                .filter<InsertionPoint>(
                    (
                        insertion1: InsertionPoint | undefined,
                        i1,
                        insertions,
                    ): insertion1 is InsertionPoint =>
                        insertion1 !== undefined &&
                        insertions.find(
                            (insertion2, i2) =>
                                i1 > i2 &&
                                insertion1 !== insertion2 &&
                                insertion2 !== undefined &&
                                insertion1.equals(insertion2),
                        ) === undefined,
                )
        );
    }
    return [];
}

/** A viewport coordinate to hit-test. PointerEvent satisfies this structurally,
 *  so click handlers pass their event directly; synthetic callers (e.g. visual
 *  vertical caret movement) pass a plain {clientX, clientY}. */
export type ViewportPoint = { clientX: number; clientY: number };

/** Determine an appropriate place for the text caret given a viewport point.
 *  Used for pointer clicks, which are always in the viewport, so it resolves the
 *  element via document.elementFromPoint. (Visual vertical movement uses the
 *  geometry-based resolver below, which also handles off-screen rows.) */
export function getCaretPositionAt(
    caret: Caret,
    point: ViewportPoint,
    getTokenViews: () => HTMLElement[],
    /** The editor element, for resolving a click on the actual visual row.
     *  Null only in contexts without a mounted editor, where we fall back to the
     *  source-line resolver. */
    editor: HTMLElement | null,
    /** True if in blocks editing mode */
    blocks: boolean,
    /** True if the editor's writing direction is right-to-left */
    rtl: boolean,
): number | undefined {
    const source = caret.source;

    // What element is under the point?
    const elementAtCursor = document.elementFromPoint(
        point.clientX,
        point.clientY,
    );

    // If there's no element (which should be impossible), return nothing.
    if (elementAtCursor === null || !(elementAtCursor instanceof HTMLElement))
        return undefined;

    // Is the pointer over a token?
    const tokenPosition = getTokenPosition(elementAtCursor, point, caret);
    if (tokenPosition !== undefined) return tokenPosition;

    // Is the pointer over space before a token?
    const spacePosition = getSpacePosition(point, elementAtCursor, source);
    if (spacePosition !== undefined) return spacePosition;

    if (!blocks) {
        // Resolve on the actual visual row the click is over (geometry over the
        // rendered token-views and space-texts), which is fold-correct: it never
        // walks into a folded node's hidden source-line tail or to a line below.
        // Only when there's no editor element do we use the source-line resolver.
        // (geometricCaretIndexAt itself defers to getEndOfLinePosition for rows
        // with no rendered elements, e.g. a truly empty line.)
        const fallback =
            editor !== null
                ? geometricCaretIndexAt(
                      editor,
                      caret,
                      getTokenViews,
                      rtl,
                      point.clientX,
                      point.clientY,
                  )
                : getEndOfLinePosition(point, source, getTokenViews, caret, rtl);
        if (fallback !== undefined) return fallback;
    }

    // Otherwise, choose the last position if nothing else matches.
    return source.getCode().getLength();
}

/** The on-screen caret bar's rect. We measure .bar (not .caret, which also wraps
 *  the menu trigger and would inflate the box). Undefined when no bar is laid out
 *  — including for range/node selections, where CaretView renders no bar. Remote
 *  collaborators' carets use the distinct .remote-caret class. */
export function caretBarRect(editor: HTMLElement): DOMRect | undefined {
    const bar = editor.querySelector('.caret .bar');
    if (!(bar instanceof HTMLElement)) return undefined;
    const rect = bar.getBoundingClientRect();
    return rect.height === 0 ? undefined : rect;
}

/** The bounding rect of the token at `index` — the visual row of a position that
 *  has no rendered caret bar (e.g. the moving end of a range). getBoundingClientRect
 *  works for off-screen rows too. */
function rowRectOfIndex(
    editor: HTMLElement,
    caret: Caret,
    index: number,
): DOMRect | undefined {
    const token = caret.source.getTokenAt(index);
    if (token === undefined) return undefined;
    const view = editor.querySelector(`.token-view[data-id="${token.id}"]`);
    if (!(view instanceof HTMLElement)) return undefined;
    const rect = view.getBoundingClientRect();
    return rect.height === 0 ? undefined : rect;
}

/** Resolve the source index at horizontal `x` on the visual row whose vertical
 *  band contains `y`, using element geometry only — getBoundingClientRect and
 *  Range, which work for off-screen rows too (unlike document.elementFromPoint).
 *  This is the single mechanism behind visual vertical movement; there is no
 *  source-line fallback. Returns undefined only when there is no row at `y` (a
 *  document edge). */
function geometricCaretIndexAt(
    editor: HTMLElement,
    caret: Caret,
    getTokenViews: () => HTMLElement[],
    rtl: boolean,
    x: number,
    y: number,
): number | undefined {
    // Gather the token-views and space runs whose vertical band contains y —
    // i.e. everything on the target *visual* row. We resolve within this row
    // only, so a caret never escapes to another visual row of the same wrapped
    // source line (e.g. snapping to the source line's end when x is past a short
    // row's content, instead of to that row's end).
    const onRow: { el: HTMLElement; rect: DOMRect; space: boolean }[] = [];
    for (const tokenView of getTokenViews()) {
        const r = tokenView.getBoundingClientRect();
        if (r.height > 0 && y >= r.top && y <= r.bottom)
            onRow.push({ el: tokenView, rect: r, space: false });
    }
    for (const spaceText of editor.querySelectorAll('.space-text')) {
        if (!(spaceText instanceof HTMLElement)) continue;
        const r = spaceText.getBoundingClientRect();
        if (r.height > 0 && y >= r.top && y <= r.bottom)
            onRow.push({ el: spaceText, rect: r, space: true });
    }

    // No element on this row (e.g. a blank line): defer to the line-boundary
    // resolver, which derives an empty line's position from neighbouring rows,
    // and returns undefined when there's genuinely no row at y (a document edge).
    if (onRow.length === 0)
        return getEndOfLinePosition(
            { clientX: x, clientY: y },
            caret.source,
            getTokenViews,
            caret,
            rtl,
        );

    const resolve = (item: (typeof onRow)[number], clientX: number) =>
        item.space
            ? getSpacePosition({ clientX, clientY: y }, item.el, caret.source)
            : getTokenPosition(item.el, { clientX, clientY: y }, caret);

    // The element horizontally containing x → precise offset within it.
    for (const item of onRow) {
        if (x >= item.rect.left && x <= item.rect.right) {
            const p = resolve(item, x);
            if (p !== undefined) return p;
        }
    }

    // x is in a gap, or before/after all content on this row. Clamp to the
    // nearest element's edge and resolve there, so we land at this row's
    // start/end rather than the source line's, staying on the target row.
    let nearest = onRow[0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const item of onRow) {
        const distance =
            x < item.rect.left
                ? item.rect.left - x
                : x > item.rect.right
                  ? x - item.rect.right
                  : 0;
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = item;
        }
    }
    return resolve(
        nearest,
        Math.min(Math.max(x, nearest.rect.left), nearest.rect.right),
    );
}

/** The visual rectangles of an element, one per soft-wrap fragment. Defaults to
 *  the bounding box (the proven, reliable measurement) and only uses the
 *  per-fragment client rects when the element actually wraps (more than one),
 *  so a token that spans rows contributes one member per fragment instead of a
 *  single union box that would merge those rows. */
export function elementRowRects(el: HTMLElement): DOMRect[] {
    const rects = el.getClientRects();
    if (rects.length > 1) return Array.from(rects);
    return [el.getBoundingClientRect()];
}

/** Member payload for a text-mode visual row: the rendered element and whether
 *  it's a whitespace run (resolved differently than a token). */
type TextMember = { el: HTMLElement; space: boolean };

/** Carve the editor's rendered token-views and space runs into visual rows. A
 *  blank line is a zero-WIDTH but non-zero-HEIGHT space span, so it still marks
 *  a row. Excludes folded (.hide) and zero-height elements. */
function gatherTextRows(
    editor: HTMLElement,
    getTokenViews: () => HTMLElement[],
): Row<TextMember>[] {
    const members: RowMember<TextMember>[] = [];
    for (const tokenView of getTokenViews()) {
        if (tokenView.closest('.hide') !== null) continue;
        for (const rect of elementRowRects(tokenView))
            if (rect.height > 0)
                members.push({ data: { el: tokenView, space: false }, rect });
    }
    for (const spaceText of editor.querySelectorAll('.space-text')) {
        if (!(spaceText instanceof HTMLElement)) continue;
        if (spaceText.closest('.hide') !== null) continue;
        const rect = spaceText.getBoundingClientRect();
        if (rect.height > 0)
            members.push({ data: { el: spaceText, space: true }, rect });
    }
    return buildRows(members);
}

/** The bounding rect of a node's view, for anchoring a vertical move from a
 *  selected node. Undefined when the node has no laid-out view. */
function nodeViewRect(editor: HTMLElement, node: Node): DOMRect | undefined {
    const view = editor.querySelector(`.node-view[data-id="${node.id}"]`);
    if (!(view instanceof HTMLElement)) return undefined;
    const rect = view.getBoundingClientRect();
    return rect.height === 0 ? undefined : rect;
}

/** Resolve a chosen text-mode row member to a source index at horizontal `x`. */
function resolveTextMember(
    member: RowMember<TextMember>,
    x: number,
    caret: Caret,
): number | undefined {
    const point: ViewportPoint = {
        clientX: x,
        clientY: (member.rect.top + member.rect.bottom) / 2,
    };
    return member.data.space
        ? getSpacePosition(point, member.data.el, caret.source)
        : getTokenPosition(member.data.el, point, caret);
}

/** The source index of a caret's active (moving) end — the position whose visual
 *  row anchors a vertical move when there's no rendered caret bar (a range). */
function activeEndIndex(caret: Caret): number | undefined {
    const pos = caret.position;
    if (typeof pos === 'number') return pos;
    if (Array.isArray(pos)) return pos[1];
    return caret.source.getNodeFirstPosition(pos);
}

/** The rect whose vertical center identifies the row a caret is currently on:
 *  its rendered bar when laid out, else the token at its active end (for ranges
 *  and off-screen rows, where no bar is rendered). */
export function caretOriginRect(
    editor: HTMLElement,
    caret: Caret,
): DOMRect | undefined {
    const bar = caretBarRect(editor);
    if (bar !== undefined) return bar;
    const end = activeEndIndex(caret);
    return end === undefined ? undefined : rowRectOfIndex(editor, caret, end);
}

/** Move the text caret one visual row up (-1) or down (1), keeping its
 *  horizontal pixel position. Carves the editor into a stack of visual rows,
 *  finds the row the caret is on, steps exactly one row, and lands at the
 *  horizontally nearest position — so it respects proportional fonts, tabs, wide
 *  characters, scaled delimiters, and soft-wrapped rows. Returns undefined only
 *  at a document edge (no row in that direction). */
export function moveCaretVisualVertical(
    direction: -1 | 1,
    editor: HTMLElement,
    caret: Caret,
    getTokenViews: () => HTMLElement[],
    rtl: boolean,
): Caret | undefined {
    // A selected node anchors the move from its whole box (its bottom going
    // down, top going up), so a move steps to the row just past the node rather
    // than somewhere inside it. The rendered "bar" for a node selection is a
    // scroll-placement spot, not the node's location, so we must NOT use it.
    const node = caret.position instanceof Node ? caret.position : undefined;
    const origin =
        node !== undefined
            ? nodeViewRect(editor, node)
            : caretOriginRect(editor, caret);
    if (origin === undefined) return undefined;

    // The remembered goal column from a prior vertical move, so moving through a
    // short line and back to a longer one returns to the original column;
    // otherwise anchor to the origin's leading edge.
    const goalX = caret.visualColumn ?? (rtl ? origin.right : origin.left);
    // For a plain caret the span is its center (a single row); for a node it's
    // the node's full vertical extent (it may cover several rows).
    const top = node !== undefined ? origin.top : (origin.top + origin.bottom) / 2;
    const bottom =
        node !== undefined ? origin.bottom : (origin.top + origin.bottom) / 2;
    const target = targetRowPositionFromSpan(
        gatherTextRows(editor, getTokenViews),
        top,
        bottom,
        direction,
        goalX,
    );
    if (target === undefined) return undefined;
    const index = resolveTextMember(target.member, target.x, caret);
    // Carry the goal column forward so the next consecutive vertical move reuses
    // it. Any non-vertical caret operation omits it via withPosition and resets.
    return index === undefined
        ? undefined
        : caret.withPosition(index, undefined, goalX);
}

/** Expand (or shrink) the selection by one visual row up (-1) or down (1) —
 *  the Shift+Arrow counterpart of moveCaretVisualVertical. Keeps the selection's
 *  anchor fixed and moves its active end by visual row at the remembered goal
 *  column. Returns undefined for node selections or at a document edge. */
export function expandCaretVisualVertical(
    direction: -1 | 1,
    editor: HTMLElement,
    caret: Caret,
    getTokenViews: () => HTMLElement[],
    rtl: boolean,
): Caret | undefined {
    const pos = caret.position;
    let anchor: number;
    let movingEnd: number;
    if (typeof pos === 'number') {
        anchor = pos;
        movingEnd = pos;
    } else if (Array.isArray(pos)) {
        anchor = pos[0];
        movingEnd = pos[1];
    } else return undefined; // Node selection: no vertical expansion.

    // The moving end's row: its caret bar when collapsed (a bar is rendered), or
    // the token at the moving end when it's already a range (no bar is rendered).
    const bar = caretBarRect(editor);
    const fromRect = bar ?? rowRectOfIndex(editor, caret, movingEnd);
    if (fromRect === undefined) return undefined;

    // Horizontal goal: the remembered column if a vertical run is in progress,
    // else the bar (collapsed), else the moving end's row start.
    const goalX =
        caret.visualColumn ??
        (bar
            ? rtl
                ? bar.right
                : bar.left
            : rtl
              ? fromRect.right
              : fromRect.left);

    const center = (fromRect.top + fromRect.bottom) / 2;
    const target = targetRowPositionFromSpan(
        gatherTextRows(editor, getTokenViews),
        center,
        center,
        direction,
        goalX,
    );
    if (target === undefined) return undefined;
    const index = resolveTextMember(target.member, target.x, caret);
    if (index === undefined) return undefined;
    // Collapse to a plain caret if the active end lands back on the anchor; a
    // zero-width range would render neither a bar nor a highlight.
    return anchor === index
        ? caret.withPosition(index, undefined, goalX)
        : caret.withPosition([anchor, index], undefined, goalX);
}

export function getTokenPosition(
    elementAtCursor: HTMLElement,
    point: ViewportPoint,
    caret: Caret,
): number | undefined {
    // If we've selected a token view, figure out what position in the text to place the caret.
    // Use closest() so that child elements inside a placeholder's .token-view are also handled.
    const tokenViewEl = elementAtCursor.classList.contains('token-view')
        ? elementAtCursor
        : (elementAtCursor.closest('.token-view') as HTMLElement | null);
    if (!(tokenViewEl instanceof HTMLElement)) return undefined;

    // Find the token this corresponds to.
    const [token, tokenView] =
        getTokenFromElement(caret, tokenViewEl) ?? [];

    // If we found a token, find the position in it corresponding to the mouse position.
    if (!(token instanceof Token)) return undefined;
    if (!(tokenView instanceof HTMLElement)) return undefined;
    const startIndex = caret.source.getTokenTextPosition(token);
    const lastIndex = caret.source.getTokenLastPosition(token);
    if (startIndex === undefined || lastIndex === undefined) return undefined;

    // Horizontal offset of the point within the token view's box.
    const tokenRect = tokenViewEl.getBoundingClientRect();
    const offset = point.clientX - tokenRect.left;
    const newPosition = Math.max(
        startIndex,
        Math.min(
            lastIndex,
            startIndex +
                (tokenRect.width === 0
                    ? 0
                    : Math.round(
                          token.getTextLength() * (offset / tokenRect.width),
                      )),
        ),
    );
    return newPosition;
}

function getSpacePosition(
    point: ViewportPoint,
    elementAtCursor: HTMLElement,
    source: Source,
): number | undefined {
    // Find the overall space view the cursor is in.
    const spaceView = elementAtCursor.closest('.space');
    if (!(spaceView instanceof HTMLElement)) return undefined;

    // Find the token the space is after.
    const tokenID = spaceView.dataset.id
        ? parseInt(spaceView.dataset.id)
        : null;
    if (tokenID === null || isNaN(tokenID)) return undefined;
    const token = source.getNodeByID(tokenID);
    if (!(token instanceof Token)) return undefined;

    // Find the space text we're over (may be absent when cursor is over a
    // &ZeroWidthSpace; rendered in the .before span for empty or newline-only spaces).
    const spaceTextView = elementAtCursor.closest('.space-text');
    if (!(spaceTextView instanceof HTMLElement))
        // Cursor is inside .space but not over a .space-text span.
        // Return the start of this token's space as the best approximation.
        return source.getTokenSpacePosition(token);

    // Get the line number of the space text
    const spaceLine = spaceTextView.dataset.line;
    if (spaceLine === undefined) return undefined;

    // Get the starting position of the space
    const spaceStartPosition = source.getTokenSpacePosition(token);
    if (spaceStartPosition === undefined) return undefined;

    // Get the space text overall, on this line, and before this line.
    const allSpace = source.spaces.getSpace(token);
    const lineSpace = spaceTextView.textContent;
    const lines = allSpace.split('\n');
    // Source offset from the start of this token's space to the start of the
    // target line's segment: each preceding segment's length plus its newline.
    // (slice(0,n).join('\n') dropped the newline right before this segment, so
    // blank/continuation lines resolved one char too early — which made
    // Arrow-Down onto a blank line land on the current position and do nothing.)
    const offsetToLine = lines
        .slice(0, parseInt(spaceLine))
        .reduce((sum, segment) => sum + segment.length + 1, 0);

    // Get the percent within the bounds of the space text that the pointer is.
    const spaceTextViewBounds = spaceTextView.getBoundingClientRect();

    // Zero-width space text (e.g. a lone newline) has no horizontal extent to
    // measure against — return the position at the start of this space line,
    // which is the end of the previous line's content.
    if (spaceTextViewBounds.width === 0)
        return spaceStartPosition + offsetToLine;

    const proportion =
        (point.clientX - spaceTextViewBounds.left) / spaceTextViewBounds.width;

    // Map the proportion to a SOURCE offset within this line. The rendered line
    // expands each tab to TAB_WIDTH columns (lineSpace is the rendered text), so
    // we can't add the rendered character count to a source position — that
    // overshoots tab lines and spills the caret into the line below. Walk the
    // SOURCE characters, accumulating rendered width, and pick the source
    // boundary nearest the pointer's rendered column.
    const sourceLine = lines[parseInt(spaceLine)] ?? '';
    const renderedTarget =
        Math.max(0, Math.min(1, proportion)) * (lineSpace?.length ?? 0);
    let renderedSoFar = 0;
    let bestOffset = 0;
    let bestDistance = renderedTarget;
    for (let i = 0; i < sourceLine.length; i++) {
        renderedSoFar += sourceLine[i] === '\t' ? TAB_WIDTH : 1;
        const distance = Math.abs(renderedSoFar - renderedTarget);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestOffset = i + 1;
        }
    }
    return spaceStartPosition + offsetToLine + bestOffset;
}

/** In blocks mode, blank lines render as `.break` divs (the only navigable
 *  whitespace). A click on one resolves to that line's beginning — the source
 *  position right after its newline — which is exactly the position blocks-mode
 *  arrow movement (`Caret.getBlockPositions`) targets, so click and keyboard
 *  navigation agree. Each break is tagged with the id of the node whose leading
 *  space it belongs to and the 1-indexed newline within that space it sits on
 *  (see NodeSequenceView). Returns undefined when the click isn't on a break or
 *  the resolved line isn't actually empty. */
/** The empty-line source position a `.break` div represents, from its
 *  `data-node-id` + 1-indexed `data-newline` (set in NodeSequenceView). Shared by
 *  click placement (getBreakPosition) and blocks-mode vertical movement so the two
 *  resolve identically. Returns undefined if the element isn't a tagged break or
 *  the resolved line isn't empty. */
export function breakElementPosition(
    source: Source,
    breakEl: HTMLElement,
): number | undefined {
    const nodeID = parseInt(breakEl.dataset.nodeId ?? '');
    const newline = parseInt(breakEl.dataset.newline ?? '');
    if (Number.isNaN(nodeID) || Number.isNaN(newline) || newline < 1)
        return undefined;
    const node = source.getNodeByID(nodeID);
    if (node === undefined) return undefined;
    // The break belongs to the node's leading space, which is the space of its
    // first leaf token (Spaces.getSpace resolves a node to its first leaf).
    const leaf = node instanceof Token ? node : node.getFirstLeaf();
    if (leaf === undefined) return undefined;
    const spaceStart = source.getTokenSpacePosition(leaf);
    if (spaceStart === undefined) return undefined;
    const space = source.spaces.getSpace(leaf);
    // Find the offset just after the `newline`-th '\n' in the space.
    let count = 0;
    for (let index = 0; index < space.length; index++) {
        if (space.charAt(index) === '\n') {
            count++;
            if (count === newline) {
                const lineStart = spaceStart + index + 1;
                return source.isEmptyLine(lineStart) ? lineStart : undefined;
            }
        }
    }
    return undefined;
}

export function getBreakPosition(
    source: Source,
    point: ViewportPoint,
): number | undefined {
    const element = document.elementFromPoint(point.clientX, point.clientY);
    const breakView = element?.closest('.break[data-node-id]');
    return breakView instanceof HTMLElement
        ? breakElementPosition(source, breakView)
        : undefined;
}

function getEndOfLinePosition(
    event: ViewportPoint,
    source: Source,
    getTokenViews: () => Iterable<HTMLElement>,
    caret: Caret,
    /** True if the editor's writing direction is right-to-left */
    rtl: boolean,
): number | undefined {
    // Otherwise, the pointer is over the editor. We only place the caret
    // in text mode, where there is a predictable grid layout.
    // We first find the closest line, then find the end of that line.
    const closestToken = Array.from(getTokenViews())
        .map((tokenView) => {
            const textRect = tokenView.getBoundingClientRect();
            return {
                view: tokenView,
                textDistance:
                    textRect === undefined
                        ? Number.POSITIVE_INFINITY
                        : Math.abs(
                              event.clientY -
                                  (textRect.top + textRect.height / 2),
                          ),
                textLeft:
                    textRect === undefined
                        ? Number.POSITIVE_INFINITY
                        : textRect.left,
                textRight:
                    textRect === undefined
                        ? Number.POSITIVE_INFINITY
                        : textRect.right,
                textTop:
                    textRect === undefined
                        ? Number.POSITIVE_INFINITY
                        : textRect.top,
                textBottom:
                    textRect === undefined
                        ? Number.POSITIVE_INFINITY
                        : textRect.bottom,
                leftDistance:
                    textRect === undefined
                        ? Number.POSITIVE_INFINITY
                        : Math.abs(event.clientX - textRect.left),
                rightDistance:
                    textRect === undefined
                        ? Number.POSITIVE_INFINITY
                        : Math.abs(event.clientX - textRect.right),
                hidden: tokenView.closest('.hide') !== null,
            };
        })
        // Filter by tokens within the vertical boundaries of the token.
        .filter(
            (text) =>
                !text.hidden &&
                text.textDistance !== Number.POSITIVE_INFINITY &&
                event.clientY >= text.textTop &&
                event.clientY <= text.textBottom,
        )
        // Sort by increasing horizontal distance from the pointer
        .sort(
            (a, b) =>
                Math.min(a.leftDistance, a.rightDistance) -
                Math.min(b.leftDistance, b.rightDistance),
        )[0]; // Choose the closest.

    // If we found one, choose either the beginnng or end of the line.
    if (closestToken) {
        const [token] = getTokenFromElement(caret, closestToken.view) ?? [];
        if (token === undefined) return undefined;

        // Whether the pointer is in the empty space *after* the line's content
        // depends on writing direction: to the right of the content in LTR, to
        // the left of it in RTL.
        const afterLine = rtl
            ? event.clientX < closestToken.textLeft
            : closestToken.textRight < event.clientX;
        return afterLine
            ? source.getEndOfTokenLine(token)
            : source.getTokenSpacePosition(token) ??
              source.getStartOfTokenLine(token);
    }

    // No token is directly under the pointer (cursor is over empty space).
    // Find the nearest visible token below the cursor and use its Y position
    // and source line number—together with the line height derived from token
    // rects—to compute which empty line the cursor is on.
    //
    // We avoid <br> element rects entirely: browsers frequently report their
    // height as 0, so any Y-containment check against them is unreliable and
    // causes getCaretPositionAt to always fall through to the end-of-source
    // fallback, producing the selection flicker described above.
    let nearestBelowTop = Number.POSITIVE_INFINITY;
    let nearestBelowToken: Token | undefined;
    let lineHeight = 0;

    for (const tokenView of getTokenViews()) {
        if (tokenView.closest('.hide') !== null) continue;
        const rect = tokenView.getBoundingClientRect();
        if (rect.height > lineHeight) lineHeight = rect.height;
        if (rect.top > event.clientY && rect.top < nearestBelowTop) {
            const result = getTokenFromElement(caret, tokenView);
            if (result !== undefined) {
                nearestBelowTop = rect.top;
                nearestBelowToken = result[0];
            }
        }
    }

    // No token below the cursor: cursor is past the last line of content.
    // Return undefined so the caller falls back to source.getCode().getLength().
    if (nearestBelowToken === undefined || lineHeight === 0) return undefined;

    const lineBelow = source.getLine(nearestBelowToken);
    if (lineBelow === undefined) return undefined;

    // Compute which source line the cursor is on by measuring its Y distance
    // above the nearest-below token and dividing by the line height.
    const linesAbove = Math.round(
        (nearestBelowTop - event.clientY) / lineHeight,
    );
    const targetLine = lineBelow - linesAbove;

    return source.getEndOfLine(targetLine);
}

function getTokenFromElement(
    caret: Caret,
    textOrSpace: Element,
): [Token, Element] | undefined {
    const tokenView = textOrSpace.closest(`.Token`);
    const token =
        tokenView === null
            ? undefined
            : getTokenByView(caret.getProgram(), tokenView);
    return tokenView === null || token === undefined
        ? undefined
        : [token, tokenView];
}


function getTokenByView(program: Program, tokenView: Element) {
    if (
        tokenView instanceof HTMLElement &&
        tokenView.dataset.id !== undefined
    ) {
        const node = program.getNodeByID(parseInt(tokenView.dataset.id));
        return node instanceof Token ? node : undefined;
    }
    return undefined;
}

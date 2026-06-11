import Caret from '@edit/caret/Caret';
import {
    AssignmentPoint,
    getInsertionPoint,
    InsertionPoint,
    kindAcceptsDrop,
} from '@edit/drag/Drag';
import Block from '@nodes/Block';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import { ListOf } from '@nodes/Node';
import type Program from '@nodes/Program';
import type Source from '@nodes/Source';
import Token from '@nodes/Token';

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
) {
    const el = document.elementFromPoint(event.clientX, event.clientY);
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
        const endOfLinePosition = getEndOfLinePosition(
            point,
            source,
            getTokenViews,
            caret,
            rtl,
        );
        if (endOfLinePosition !== undefined) return endOfLinePosition;
    }

    // Otherwise, choose the last position if nothing else matches.
    return source.getCode().getLength();
}

/** The on-screen caret bar's rect. We measure .bar (not .caret, which also wraps
 *  the menu trigger and would inflate the box). Undefined when no bar is laid out
 *  — including for range/node selections, where CaretView renders no bar. Remote
 *  collaborators' carets use the distinct .remote-caret class. */
function caretBarRect(editor: HTMLElement): DOMRect | undefined {
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

/** Resolve the source index one visual row above (-1) or below (1) `fromRect` at
 *  horizontal `clientX`. */
function visualVerticalIndexAt(
    direction: -1 | 1,
    editor: HTMLElement,
    caret: Caret,
    getTokenViews: () => HTMLElement[],
    rtl: boolean,
    fromRect: DOMRect,
    clientX: number,
): number | undefined {
    const clientY =
        direction < 0
            ? fromRect.top - fromRect.height / 2
            : fromRect.bottom + fromRect.height / 2;
    return geometricCaretIndexAt(
        editor,
        caret,
        getTokenViews,
        rtl,
        clientX,
        clientY,
    );
}

/** Move the text caret one visual row up (-1) or down (1), keeping its
 *  horizontal pixel position. Resolves the target purely from rendered glyph
 *  geometry, so it respects proportional fonts, tabs, wide characters, and
 *  soft-wrapped rows — the row above/below is the one you actually see. Returns
 *  undefined only at a document edge (no row in that direction). */
export function moveCaretVisualVertical(
    direction: -1 | 1,
    editor: HTMLElement,
    caret: Caret,
    getTokenViews: () => HTMLElement[],
    rtl: boolean,
): Caret | undefined {
    const rect = caretBarRect(editor);
    if (rect === undefined) return undefined;

    // Use the remembered goal column from a prior vertical move if there is one,
    // so moving through a short line and back to a longer one returns to the
    // original column; otherwise anchor to the caret's current x.
    const clientX = caret.visualColumn ?? (rtl ? rect.right : rect.left);
    const index = visualVerticalIndexAt(
        direction,
        editor,
        caret,
        getTokenViews,
        rtl,
        rect,
        clientX,
    );
    // Carry the goal column forward so the next consecutive vertical move reuses
    // it. Any non-vertical caret operation omits it via withPosition and resets.
    return index === undefined
        ? undefined
        : caret.withPosition(index, undefined, clientX);
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
    const clientX =
        caret.visualColumn ??
        (bar ? (rtl ? bar.right : bar.left) : rtl ? fromRect.right : fromRect.left);

    const index = visualVerticalIndexAt(
        direction,
        editor,
        caret,
        getTokenViews,
        rtl,
        fromRect,
        clientX,
    );
    if (index === undefined) return undefined;
    // Collapse to a plain caret if the active end lands back on the anchor; a
    // zero-width range would render neither a bar nor a highlight.
    return anchor === index
        ? caret.withPosition(index, undefined, clientX)
        : caret.withPosition([anchor, index], undefined, clientX);
}

function getTokenPosition(
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

    // Map the proportion to a text buffer position.
    return (
        spaceStartPosition +
        offsetToLine +
        Math.round(proportion * lineSpace.length)
    );
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

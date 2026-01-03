import Caret from '@edit/caret/Caret';
import {
    AssignmentPoint,
    getInsertionPoint,
    InsertionPoint,
} from '@edit/drag/Drag';
import type { WritingDirection } from '@locale/Scripts';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import type Node from '@nodes/Node';
import { ListOf } from '@nodes/Node';
import type Program from '@nodes/Program';
import type Source from '@nodes/Source';
import Token from '@nodes/Token';
import { TAB_WIDTH } from '@parser/Spaces';

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
            emptyView,
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
            context,
        );
        return point;
    } else {
        console.log('No list under pointer.', el);
    }
}

function getEmptyInsertionPoint(
    emptyView: HTMLElement,
    nodeUnderPointer: Node,
    fieldName: string,
    candidate: Node,
    context: Context,
): InsertionPoint | AssignmentPoint | undefined {
    const fieldValue = nodeUnderPointer.getField(fieldName);
    const fieldInfo = nodeUnderPointer.getFieldNamed(fieldName);
    const kind = fieldInfo?.kind;

    // If it's a list and it allows the node kind being inserted, return an insertion point.
    if (
        fieldInfo !== undefined &&
        kind !== undefined &&
        Array.isArray(fieldValue) &&
        kind instanceof ListOf &&
        kind.allowsItem(candidate) &&
        // No type expected, or candidate isn't an expression, or candidate is accepted by the field type.
        (fieldInfo.getType === undefined ||
            !(candidate instanceof Expression) ||
            fieldInfo
                .getType(context, 0)
                .accepts(candidate.getType(context), context))
    ) {
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
    context: Context,
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

    if (
        kind.allowsItem(candidate) &&
        // No type expected, or candidate isn't an expression, or candidate is accepted by the field type.
        (field.getType === undefined ||
            !(candidate instanceof Expression) ||
            field
                .getType(context, index)
                .accepts(candidate.getType(context), context))
    ) {
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
    editor: HTMLElement,
    event: PointerEvent,
    getNodeView: (node: Node) => HTMLElement | undefined,
    getTokenViews: () => HTMLElement[],
    direction: WritingDirection,
): InsertionPoint[] {
    const source = caret.source;

    // Is the caret position between tokens?
    // If so, are any of the token's parents inside a list in which we could insert something?
    const position = getCaretPositionAt(
        caret,
        editor,
        event,
        getNodeView,
        getTokenViews,
        direction,
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

/** Determine an appropriate place for the text caret given a pointer event. */
export function getCaretPositionAt(
    caret: Caret,
    editor: HTMLElement,
    event: PointerEvent,
    getNodeView: (node: Node) => HTMLElement | undefined,
    getTokenViews: () => HTMLElement[],
    direction: WritingDirection,
): number | undefined {
    const source = caret.source;

    // What element is under the mouse?
    const elementAtCursor = document.elementFromPoint(
        event.clientX,
        event.clientY,
    );

    // If there's no element (which should be impossible), return nothing.
    if (elementAtCursor === null) return undefined;

    // If we've selected a token view, figure out what position in the text to place the caret.
    if (elementAtCursor.classList.contains('token-view')) {
        // Find the token this corresponds to.
        const [token, tokenView] =
            getTokenFromElement(caret, elementAtCursor) ?? [];
        // If we found a token, find the position in it corresponding to the mouse position.
        if (
            token instanceof Token &&
            tokenView instanceof Element &&
            event.target instanceof Element
        ) {
            const startIndex = caret.source.getTokenTextPosition(token);
            const lastIndex = caret.source.getTokenLastPosition(token);
            if (startIndex !== undefined && lastIndex !== undefined) {
                // The mouse event's offset is relative to what was clicked on, not the element handling the click, so we have to compute the real offset.
                const targetRect = event.target.getBoundingClientRect();
                const tokenRect = elementAtCursor.getBoundingClientRect();
                const offset =
                    event.offsetX + (targetRect.left - tokenRect.left);
                const newPosition = Math.max(
                    startIndex,
                    Math.min(
                        lastIndex,
                        startIndex +
                            (tokenRect.width === 0
                                ? 0
                                : Math.round(
                                      token.getTextLength() *
                                          (offset / tokenRect.width),
                                  )),
                    ),
                );
                return newPosition;
            }
        }
    }

    // If the element at the cursor is inside space, choose the space.
    // This depends tightly on the spaces rendered in Space.svelte and
    // NodeView.svelte, when in blocks mode.
    const spaceView = elementAtCursor.closest('.space');
    if (spaceView instanceof HTMLElement) {
        const tokenID = spaceView.dataset.id
            ? parseInt(spaceView.dataset.id)
            : null;
        const token =
            tokenID !== null && !isNaN(tokenID)
                ? source.getNodeByID(tokenID)
                : null;
        if (token instanceof Token) {
            const space = source.spaces.getSpace(token);
            // We only choose this position if doesn't contain newlines (we handle those below).
            if (!space.includes('\n')) {
                const tokenView = getNodeView(token);
                const spacePosition = source.getTokenSpacePosition(token);
                if (tokenView && spacePosition !== undefined) {
                    const spaceRect = spaceView.getBoundingClientRect();
                    const percent =
                        (spaceRect.width -
                            (tokenView.getBoundingClientRect().left -
                                event.clientX)) /
                        spaceRect.width;

                    return Math.round(
                        spacePosition +
                            percent *
                                space.replace('\t', ' '.repeat(TAB_WIDTH))
                                    .length,
                    );
                }
            }
        }
    }

    // Otherwise, the pointer is over the editor.
    // Find the closest token and choose either it's right or left side.
    // Map the token text to a list of vertical and horizontal distances
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

        return closestToken.textRight < event.clientX
            ? source.getEndOfTokenLine(token)
            : source.getStartOfTokenLine(token);
    }

    // Otherwise, if the pointer wasn't within the vertical bounds of the nearest token text, choose the nearest empty line.
    type BreakInfo = {
        token: Token;
        offset: number;
        index: number;
        view: HTMLElement;
    };

    // Find all tokens with empty lines and choose the nearest.
    const closestLine =
        // Find all of the token line breaks, which are wrapped in spans to enable consistent measurement.
        // This is because line breaks and getBoundingClientRect() are jumpy depending on what's around them.
        Array.from(editor.querySelectorAll('.space .break'))
            // Map each one to 1) the token, 2) token view, 3) line break top, 4) index within each token's space
            .map((br) => {
                const [token, tokenView] =
                    getTokenFromLineBreak(caret, br) ?? [];
                // Check the br container, which gives us a more accurate bounding client rect.
                const rect = br.getBoundingClientRect();
                if (tokenView === undefined || token === undefined)
                    return undefined;
                // Skip the line if it doesn't include the pointer's y.
                if (event.clientY < rect.top || event.clientY > rect.bottom)
                    return undefined;
                return {
                    token,
                    offset: Math.abs(
                        rect.top + rect.height / 2 - event.clientY,
                    ),
                    // Find the index of the break in the space view.
                    index: Array.from(
                        tokenView.querySelectorAll('.break'),
                    ).indexOf(br),
                    view: br as HTMLElement,
                };
            })
            // Filter out any empty breaks that we couldn't find
            .filter<BreakInfo>(
                (br: BreakInfo | undefined): br is BreakInfo =>
                    br !== undefined,
            )
            // Sort by increasing offset from mouse y
            .sort((a, b) => a.offset - b.offset)[0]; // Chose the closest

    // If we have a closest line, find the line number
    if (closestLine) {
        // Find the space view of the closest line.

        // Compute the horizontal position at which to place the caret.
        // Find the width of a single space by finding the longest line,
        // which determines its width.
        const spaceView = closestLine.view.closest('.space');
        const spaceBounds = spaceView?.getBoundingClientRect();
        const tokenSpace = source.spaces.getSpace(closestLine.token);
        let spaceWidth =
            (spaceBounds?.width ?? 0) /
            Math.max.apply(
                null,
                tokenSpace
                    .replaceAll('\t', ' '.repeat(TAB_WIDTH))
                    .split('\n')
                    .map((s) => s.length),
            );
        if (isNaN(spaceWidth) || spaceWidth === Infinity) spaceWidth = 0;

        // Offset the caret position by the number of spaces from the edge that was clicked.
        let positionOffset = spaceBounds
            ? Math.round(
                  Math.abs(
                      event.clientX -
                          (direction === 'ltr'
                              ? spaceBounds.left
                              : spaceBounds.right),
                  ) / spaceWidth,
              )
            : 0;
        if (isNaN(positionOffset) || positionOffset === Infinity)
            positionOffset = 0;

        const index = caret.source.getTokenSpacePosition(closestLine.token);

        // Figure out where on the line to place the insertion point based on the line index
        return index !== undefined
            ? index +
                  tokenSpace.split('\n', closestLine.index).length +
                  positionOffset
            : undefined;
    }

    // Otherwise, choose the last position if nothing else matches.
    return source.getCode().getLength();
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

function getTokenFromLineBreak(
    caret: Caret,
    textOrSpace: Element,
): [Token, Element] | undefined {
    const spaceView = textOrSpace.closest('.space') as HTMLElement;
    const tokenID =
        spaceView instanceof HTMLElement && spaceView.dataset.id
            ? parseInt(spaceView.dataset.id)
            : undefined;
    const node = tokenID ? caret.source.getNodeByID(tokenID) : undefined;
    return node instanceof Token ? [node, spaceView] : undefined;
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

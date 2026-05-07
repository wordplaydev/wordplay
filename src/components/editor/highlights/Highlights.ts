import type Caret from '@edit/caret/Caret';
import {
    AssignmentPoint,
    InsertionPoint,
    isValidDropTarget,
} from '@edit/drag/Drag';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import DefinitionExpression from '@nodes/DefinitionExpression';
import type Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Literal from '@nodes/Literal';
import Name from '@nodes/Name';
import NameType from '@nodes/NameType';
import Node from '@nodes/Node';
import Program from '@nodes/Program';
import Reference from '@nodes/Reference';
import type Source from '@nodes/Source';
import StructureDefinition from '@nodes/StructureDefinition';
import Token from '@nodes/Token';
import TypePlaceholder from '@nodes/TypePlaceholder';
import type Project from '@db/projects/Project';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import {
    getOutlineOfRows,
    getRowsOf,
    getSpaceRects,
    getTokenRects,
    rectsToRows,
    underlineFromRows,
    type Outline,
    type Rect,
    type SpaceLineClip,
} from '@components/editor/highlights/outline';

/** Highlight types and whether they are rendered above or below the code. True for above. */
export const HighlightTypes = {
    // A node selected by the caret
    selected: false,
    // A node being evaluated
    evaluating: false,
    // A node with an evaluation exeception
    exception: true,
    // A node the pointer is hovered over
    hovered: false,
    // A node that is being dragged
    dragged: false,
    // A node being dragged
    dragging: false,
    // A possible drop target for a dragged node
    target: true,
    // Drag and drop target hovered over
    match: true,
    // Major conflict
    major: true,
    // Minor conflict
    minor: true,
    // A node that is animated
    animating: false,
    // Output that is active on stage
    output: true,
    // Output that is active on stage in blocks mode
    blockoutput: true,
    // Highlight of a block-level node when blocks are enabled
    blockselected: true,
    // Block conflicted
    blockmajor: true,
    blockminor: true,
    // Highlight of a matching delimiter
    delimiter: false,
    // Highlight of an empty list to be dragged upon
    empty: true,
    // Highlight definitions and uses
    related: false,
};

export class Highlights {
    private map: Map<Node, HighlightType[]> = new Map();
    private empty: Map<Node, string[]> = new Map();

    add(source: Source, node: Node, type: HighlightType) {
        if (source.has(node)) {
            if (!this.map.has(node)) this.map.set(node, []);
            this.map.get(node)?.push(type);
        }
    }

    /** Add without checking source membership; used internally for merging slices. */
    private addUnchecked(node: Node, type: HighlightType) {
        if (!this.map.has(node)) this.map.set(node, []);
        this.map.get(node)?.push(type);
    }

    addEmpty(node: Node, field: string) {
        if (!this.empty.has(node)) this.empty.set(node, []);
        this.empty.get(node)?.push(field);
    }

    entries() {
        return this.map.entries();
    }

    get(node: Node): HighlightType[] | undefined {
        return this.map.get(node);
    }

    getEmpty(node: Node): string[] | undefined {
        return this.empty.get(node);
    }

    /** Structural equality check. Lets the publisher skip highlights.set()
     * when a caret move produces a Highlights with the same entries — which
     * avoids re-running every NodeView's highlight derived (one per node in
     * the editor, hundreds on a 100-line file) and re-measuring outlines.
     * O(highlighted) per call vs the O(NodeViews) fan-out it prevents. */
    equals(other: Highlights): boolean {
        if (this.map.size !== other.map.size) return false;
        if (this.empty.size !== other.empty.size) return false;
        for (const [node, types] of this.map) {
            const otherTypes = other.map.get(node);
            if (otherTypes === undefined || otherTypes.length !== types.length)
                return false;
            for (let i = 0; i < types.length; i++)
                if (types[i] !== otherTypes[i]) return false;
        }
        for (const [node, fields] of this.empty) {
            const otherFields = other.empty.get(node);
            if (otherFields === undefined || otherFields.length !== fields.length)
                return false;
            for (let i = 0; i < fields.length; i++)
                if (fields[i] !== otherFields[i]) return false;
        }
        return true;
    }

    /** Merge several Highlights instances into one, preserving order of types per node. */
    static merge(...slices: Highlights[]): Highlights {
        const merged = new Highlights();
        for (const slice of slices) {
            for (const [node, types] of slice.map)
                for (const type of types) merged.addUnchecked(node, type);
            for (const [node, fields] of slice.empty)
                for (const field of fields) merged.addEmpty(node, field);
        }
        return merged;
    }
}

/** Per-source cache of Reference/NameType nodes. The "highlight related uses"
 * branch in getCaretHighlights needs this list every time the caret is on a
 * Name; without the cache it falls through to source.nodes() filtered to
 * Reference/NameType, which is an O(N) tree walk per caret move. With the
 * cache it's O(1) lookup; the WeakMap auto-evicts when the source is replaced. */
const referenceIndexCache = new WeakMap<Source, (Reference | NameType)[]>();
function getReferenceIndex(source: Source): (Reference | NameType)[] {
    let index = referenceIndexCache.get(source);
    if (index === undefined) {
        index = source.nodes(
            (n): n is Reference | NameType =>
                n instanceof Reference || n instanceof NameType,
        );
        referenceIndexCache.set(source, index);
    }
    return index;
}

export type HighlightType = keyof typeof HighlightTypes;
export type HighlightSpec = {
    types: HighlightType[];
    outline: Outline;
    underline: Outline;
};

/** Highlights that depend only on project/evaluator state — independent of caret position. */
export function getProjectHighlights(
    source: Source,
    project: Project,
    /** The currently-evaluating step's node, if any. Undefined when not stepping. */
    stepNode: Node | undefined,
    /** The node responsible for the latest source-level exception, if any. */
    exceptionNode: Node | undefined,
    animatingNodes: Set<Node> | undefined,
    selectedOutput: Evaluate[] | undefined,
    blocks: boolean,
): Highlights {
    const highlights = new Highlights();

    if (stepNode) highlights.add(source, stepNode, 'evaluating');
    if (exceptionNode) highlights.add(source, exceptionNode, 'exception');

    for (const [node, conflicts] of project.getConflictedNodes())
        highlights.add(
            source,
            node,
            conflicts.every((c) => !c.isMinor())
                ? blocks
                    ? 'blockmajor'
                    : 'major'
                : blocks
                  ? 'blockminor'
                  : 'minor',
        );

    if (animatingNodes)
        for (const animating of animatingNodes)
            if (source.has(animating))
                highlights.add(source, animating, 'animating');

    if (selectedOutput)
        for (const node of selectedOutput)
            highlights.add(source, node, blocks ? 'blockoutput' : 'output');

    return highlights;
}

/** Highlights that depend on caret position. */
export function getCaretHighlights(
    source: Source,
    project: Project,
    caret: Caret,
    blocks: boolean,
    animatingNodes: Set<Node> | undefined,
): Highlights {
    const highlights = new Highlights();

    const context = project.getContext(source);

    if (caret.position instanceof Node)
        highlights.add(
            source,
            caret.position,
            !blocks ? 'selected' : 'blockselected',
        );

    if (caret.position instanceof Token) {
        const match = source.getMatchedDelimiter(caret.position);
        if (match) highlights.add(source, match, 'delimiter');
    }

    let caretParent: Node | undefined;
    if (caret.position instanceof Node)
        caretParent = source.root.getParent(caret.position);
    else if (caret.isPosition() && caret.insideToken()) {
        const token = source.getTokenAt(caret.position);
        if (token) caretParent = source.root.getParent(token);
    }

    if (
        !blocks &&
        caretParent &&
        !caret.isNode() &&
        (animatingNodes === undefined ||
            !Array.from(animatingNodes).some((node) =>
                node.contains(caretParent as Node),
            )) &&
        !(caretParent instanceof Program) &&
        !(caretParent instanceof Block && caretParent.isRoot())
    )
        highlights.add(source, caretParent, 'hovered');

    const reference =
        caret.position instanceof Reference ||
        caret.position instanceof NameType
            ? caret.position
            : caretParent instanceof Reference ||
                caretParent instanceof NameType
              ? caretParent
              : undefined;

    const name =
        caret.position instanceof Name
            ? caret.position
            : caretParent instanceof Name
              ? caretParent
              : undefined;
    const definition = reference
        ? reference.resolve(context)
        : name
          ? source.root
                .getAncestors(name)
                .find(
                    (def): def is DefinitionExpression | Bind =>
                        def instanceof DefinitionExpression ||
                        def instanceof Bind,
                )
          : undefined;
    if (definition) {
        if (reference) {
            highlights.add(
                source,
                definition instanceof FunctionDefinition ||
                    definition instanceof StructureDefinition ||
                    definition instanceof Bind
                    ? definition.names
                    : definition,
                'related',
            );
        } else {
            if ('names' in definition)
                highlights.add(source, definition.names, 'related');
            // Use the cached Reference/NameType index instead of walking the tree.
            for (const ref of getReferenceIndex(source))
                if (ref.resolve(context) === definition)
                    highlights.add(source, ref, 'related');
        }
    }

    return highlights;
}

/** Highlights that depend on drag/hover state. */
export function getDragHighlights(
    source: Source,
    project: Project,
    dragged: Node | undefined,
    hovered: Node | undefined,
    insertion: InsertionPoint | AssignmentPoint | undefined,
    blocks: boolean,
    selecting: boolean,
): Highlights {
    const highlights = new Highlights();

    if (dragged !== undefined) {
        // Highlight the dragged node.
        highlights.add(source, dragged, 'dragged');

        // If there's something hovered or an insertion point, show targets and matches.
        // If we're hovered over a valid drop target, highlight the hovered node.
        if (
            hovered &&
            isValidDropTarget(project, dragged, hovered, insertion, true)
        ) {
            // Highlight the matching drop target being hovered.
            highlights.add(source, hovered, 'match');
            highlights.add(source, hovered, 'hovered');
        }
        // No valid hover target? Highlight the insertion point if there is one.
        else if (
            insertion instanceof InsertionPoint &&
            isValidDropTarget(project, dragged, insertion.node, insertion, true)
        ) {
            if (insertion.list.length === 0) {
                highlights.add(source, insertion.node, 'match');
                highlights.add(source, insertion.node, 'hovered');
                highlights.addEmpty(insertion.node, insertion.field);
            }
        }
        // No valid hover target? Highlight the assignment point if there is one.
        else if (insertion instanceof AssignmentPoint) {
            if (insertion.parent instanceof Program) {
                highlights.add(source, insertion.parent.expression, 'match');
                highlights.add(source, insertion.parent.expression, 'hovered');
            } else {
                highlights.add(source, insertion.parent, 'hovered');
                highlights.addEmpty(insertion.parent, insertion.field);
            }
        }
        // No insert? Highlight valid drop targets.
        else if (insertion === undefined) {
            // Search the source file for targets to highlight.
            for (const target of source.expression.nodes()) {
                // Is this target a valid drop target?
                // Is it a literal or placeholder?
                // Highlight it!
                // We don't highlight expressions that have more structure, because it's confusing, but we do permit valid drops.
                if (
                    isValidDropTarget(project, dragged, target, insertion, true)
                ) {
                    if (
                        target instanceof Literal ||
                        target instanceof ExpressionPlaceholder ||
                        target instanceof TypePlaceholder
                    )
                        highlights.add(source, target, 'target');
                }
                // Does this target have an empty field we can insert into?
                const elgibleFields = target.getGrammar().filter((field) => {
                    if (!field.kind.allows(dragged)) return false;
                    const value = target.getField(field.name);
                    const empty =
                        value === undefined ||
                        (Array.isArray(value) && value.length === 0);
                    return empty;
                });
                if (elgibleFields.length > 0) {
                    highlights.add(source, target, 'empty');
                    for (const field of elgibleFields) {
                        highlights.addEmpty(target, field.name);
                    }
                }
            }
        }
    }
    // Otherwise, is a node hovered over? Highlight it.
    else if (selecting && !blocks && hovered instanceof Node) {
        highlights.add(source, hovered, 'hovered');
    }

    return highlights;
}

/**
 * Back-compat wrapper combining all three slices. Prefer calling the slice
 * functions directly so callers can cache the project/drag slices and only
 * recompute the caret slice on caret movement.
 */
export function getHighlights(
    source: Source,
    project: Project,
    evaluator: Evaluator,
    caret: Caret,
    dragged: Node | undefined,
    hovered: Node | undefined,
    insertion: InsertionPoint | AssignmentPoint | undefined,
    animatingNodes: Set<Node> | undefined,
    selectedOutput: Evaluate[] | undefined,
    blocks: boolean,
    selecting: boolean,
): Highlights {
    const latestValue = evaluator.getLatestSourceValue(source);
    const exceptionNode =
        latestValue instanceof ExceptionValue &&
        latestValue.step !== undefined &&
        latestValue.step.node instanceof Node
            ? latestValue.step.node
            : undefined;
    return Highlights.merge(
        getProjectHighlights(
            source,
            project,
            evaluator.getStepNode(),
            exceptionNode,
            animatingNodes,
            selectedOutput,
            blocks,
        ),
        getCaretHighlights(source, project, caret, blocks, animatingNodes),
        getDragHighlights(
            source,
            project,
            dragged,
            hovered,
            insertion,
            blocks,
            selecting,
        ),
    );
}

/** Populate the given Set with nodes to highlight. */
export function updateOutlines(
    highlights: Highlights,
    horizontal: boolean,
    rtl: boolean,
    blocks: boolean,
    getNodeView: (node: Node) => HTMLElement | undefined,
    /** Optional cross-call cache of node-view → measured rows. Caller is
     * responsible for invalidating on layout-affecting changes (source/blocks/
     * zoom toggles, window resize). When provided, lets caret moves that
     * change which highlight is active reuse measurements for the highlights
     * that didn't change (e.g. existing conflict outlines). */
    rowsCache?: WeakMap<HTMLElement, Rect[]>,
): HighlightSpec[] {
    const outlines: HighlightSpec[] = [];
    const nodeViews = new Map<HighlightSpec, HTMLElement>();
    // Cache of rows per view for THIS call, so getRowsOf is invoked once per
    // node-view even though we derive both an outline and an underline from it.
    const callRows = new Map<HTMLElement, Rect[]>();
    function getRowsForView(view: HTMLElement, skipCrossCall: boolean): Rect[] {
        let rows = callRows.get(view);
        if (rows !== undefined) return rows;
        // Animating highlights bypass the cross-call cache: the cache may
        // have been populated from a transient layout (e.g. before the
        // editor's surrounding tile finished laying out) and the highlight
        // would otherwise stick at that stale position until something
        // resizes the editor or toggles blocks. Always remeasure here so
        // the position tracks the current node-view location.
        if (!skipCrossCall) rows = rowsCache?.get(view);
        if (rows === undefined) {
            rows = getRowsOf(view, horizontal, rtl, blocks);
            if (!skipCrossCall) rowsCache?.set(view, rows);
        }
        callRows.set(view, rows);
        return rows;
    }

    // Convert all of the highlighted views into outlines of the nodes.
    for (const [node, types] of highlights.entries()) {
        const nodeView = getNodeView(node);
        if (nodeView) {
            const skipCache = types.includes('animating');
            // If this node has empty fields to highlight, add outlines for those too.
            const emptyFields = highlights.getEmpty(node);
            if (emptyFields && emptyFields.length > 0) {
                for (const fieldName of emptyFields) {
                    const fieldView = nodeView.querySelector(
                        `[data-field="${fieldName}"]`,
                    );
                    if (fieldView instanceof HTMLElement) {
                        const rows = getRowsForView(fieldView, skipCache);
                        const emptyOutline = {
                            types: types,
                            outline: getOutlineOfRows(rows),
                            underline: underlineFromRows(
                                rows,
                                fieldView,
                                horizontal,
                            ),
                        };
                        outlines.push(emptyOutline);
                        nodeViews.set(emptyOutline, fieldView);
                    }
                }
            }
            // No empty highlight? Just highlight the node.
            else {
                const rows = getRowsForView(nodeView, skipCache);
                const outline = {
                    types: types,
                    outline: getOutlineOfRows(rows),
                    underline: underlineFromRows(rows, nodeView, horizontal),
                };
                outlines.push(outline);
                nodeViews.set(outline, nodeView);
            }
        }
    }

    // Look for underline collisions.
    // 1) Sort by width, so we put widest underlines first.
    outlines.sort(
        (a, b) =>
            b.underline.maxx -
            b.underline.minx -
            (a.underline.maxx - a.underline.minx),
    );

    const UnderlineHeight = 4;
    const MaxOffset = 12;

    // 2) Iterate through outlines, searching for any previous outlines in the list and offseting the y position accordingly.
    for (let index = 0; index < outlines.length; index++) {
        const outline = outlines[index];
        let offset = 0;
        if (
            outline.types.includes('major') ||
            outline.types.includes('minor')
        ) {
            for (let check = 0; check < index; check++) {
                const other = outlines[check];
                // Do they intersect vertically and horizontally?
                if (
                    (other.types.includes('major') ||
                        other.types.includes('minor')) &&
                    Math.round(outline.underline.miny + offset) ===
                        Math.round(other.underline.miny) &&
                    Math.max(
                        0,
                        Math.min(outline.underline.maxx, other.underline.maxx) -
                            Math.max(
                                outline.underline.minx,
                                other.underline.minx,
                            ),
                    ) > 0
                ) {
                    // Limit to 3 levels deep.
                    offset = Math.min(offset + UnderlineHeight, MaxOffset);
                }
            }
        }

        // If the offset is more than zero, update the underline positioning.
        if (offset !== 0) {
            const view = nodeViews.get(outline);
            if (view) {
                // Reuse the cached rows; just re-derive the path with offset
                // applied. No DOM measurements.
                outline.underline = underlineFromRows(
                    // The view was already measured this call, so callRows
                    // resolves the lookup before the cross-call cache
                    // setting matters.
                    getRowsForView(view, false),
                    view,
                    horizontal,
                    offset,
                );
            }
        }
    }

    return outlines;
}

/** Given a source and a range in its text, determine a path around the selected text */
export function getRangeOutline(
    source: Source,
    start: number,
    end: number,
    getNodeView: (node: Node) => HTMLElement | undefined,
    horzontal: boolean,
    rtl: boolean,
    blocks: boolean,
): Outline | undefined {
    if (start > end) {
        const temp = start;
        start = end;
        end = temp;
    }

    // Find all tokens whose TEXT overlaps [start, end].
    type TextToken = { token: Token; start: number; end: number };
    const textTokens: TextToken[] = source.tokens
        .map((token) => {
            const tokenStart = source.getTokenTextPosition(token);
            if (tokenStart === undefined) return undefined;
            const tokenEnd = tokenStart + token.getTextLength();
            if (start <= tokenEnd && end >= tokenStart)
                return { token, start: tokenStart, end: tokenEnd };
            return undefined;
        })
        .filter((t): t is TextToken => t !== undefined);

    // Find views of the text tokens.
    const nodeViews = textTokens
        .map((t) => getNodeView(t.token))
        .filter((v): v is HTMLElement => v !== undefined);

    // Derive a fallback line-height for zero-height space spans (empty lines).
    // Prefer the rendered height of the first text-token view; fall back to 20 px.
    const fallbackHeight =
        nodeViews[0]?.getBoundingClientRect().height || 20;

    // Build all rects in document order: for every source token whose space
    // OR text overlaps [start, end], emit space rects first then the token rect.
    // This covers three cases that were previously broken:
    //   • spaces between tokens on the same line
    //   • selections that start or end inside whitespace / empty lines
    //   • selections that contain ONLY whitespace with no token text
    const allRects: Rect[] = [];
    let textIdx = 0;

    for (const token of source.tokens) {
        const textStart = source.getTokenTextPosition(token);
        if (textStart === undefined) continue;

        // Compute the text-position range of this token's preceding space.
        const spaceStr = source.spaces.getSpace(token);
        const spaceStart = textStart - spaceStr.length;

        // A token's space overlaps [start, end] when spaceStart < end and
        // textStart > start (the space ends after the selection begins, and
        // the token text starts after the selection begins).
        if (spaceStart < end && textStart > start) {
            const tokenView = getNodeView(token);
            if (tokenView !== undefined) {
                // For each line of the space string, compute the source-char
                // range that falls within [start, end] and store it as a clip.
                // Each line k occupies [lineStart, nextLineStart) where
                // nextLineStart = lineStart + lineLen + 1 (for the '\n'
                // separator), except for the last line which has no '\n'.
                const lines = spaceStr.split('\n');
                const lineClips = new Map<number, SpaceLineClip>();
                let lineStart = spaceStart;
                for (let k = 0; k < lines.length; k++) {
                    const isLastLine = k === lines.length - 1;
                    const nextLineStart =
                        lineStart + lines[k].length + (isLastLine ? 0 : 1);
                    if (lineStart < end && nextLineStart > start) {
                        const overlapStart = Math.max(start, lineStart);
                        const overlapEnd = Math.min(
                            end,
                            lineStart + lines[k].length,
                        );
                        lineClips.set(k, {
                            charStart: overlapStart - lineStart,
                            charEnd: overlapEnd - lineStart,
                            lineContent: lines[k],
                        });
                    }
                    lineStart = nextLineStart;
                }
                allRects.push(
                    ...getSpaceRects(
                        tokenView,
                        fallbackHeight,
                        blocks,
                        lineClips,
                    ),
                );
            }
        }

        // If this token's text is also in the selection, clip and add its rect.
        if (
            textIdx < textTokens.length &&
            textTokens[textIdx].token === token
        ) {
            const view = nodeViews[textIdx];
            if (view !== undefined) {
                const isFirst = textIdx === 0;
                const isLast = textIdx === textTokens.length - 1;
                // For a single-element getTokenRects call the "both-clip" path
                // always runs. Set start=offset-within-first-token (or 0) and
                // end=offset-within-last-token (or full length) so that:
                //   first token  → left clip only  (end = full token length)
                //   last token   → right clip only (start = 0)
                //   middle token → no clip         (start=0, end=full length)
                //   single token → both clips
                const clip = {
                    start: isFirst ? start - textTokens[0].start : 0,
                    end: isLast
                        ? end - textTokens[textIdx].start
                        : textTokens[textIdx].end - textTokens[textIdx].start,
                };
                allRects.push(...getTokenRects([view], blocks, clip));
            }
            textIdx++;
        }
    }

    if (allRects.length === 0) return undefined;
    return getOutlineOfRows(rectsToRows(allRects, horzontal, rtl));
}

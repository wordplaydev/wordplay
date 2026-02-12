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
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import getOutlineOf, {
    getOutlineOfRows,
    getTokenRects,
    getUnderlineOf,
    rectsToRows,
    type Outline,
} from './outline';

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
    // Major conflict, primary
    primaryMajor: true,
    // Major conflict, secondary
    secondaryMajor: true,
    // Minor conflict, primary
    primaryMinor: true,
    // Minor conflict, secondary
    secondaryMinor: true,
    // A node that is animated
    animating: false,
    // Output that is active on stage
    output: true,
    // Output that is active on stage in blocks mode
    blockoutput: true,
    // Highlight of a block-level node when blocks are enabled
    blockselected: true,
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
}

export type HighlightType = keyof typeof HighlightTypes;
export type HighlightSpec = {
    types: HighlightType[];
    outline: Outline;
    underline: Outline;
};

export function getHighlights(
    /** What source we are highlighting */
    source: Source,
    /** The evaluation of the project */
    evaluator: Evaluator,
    /** Where the caret is */
    caret: Caret,
    /** What is being dragged */
    dragged: Node | undefined,
    /** What the pointer is over */
    hovered: Node | undefined,
    /** Where an insertion is happening */
    insertion: InsertionPoint | AssignmentPoint | undefined,
    /** Nodes that are currently being animated */
    animatingNodes: Set<Node> | undefined,
    /** Output that is selected */
    selectedOutput: Evaluate[] | undefined,
    /** True if in blocks mode */
    blocks: boolean,
    /** True if selecting nodes (e.g., shift key) */
    selecting: boolean,
): Highlights {
    let highlights = new Highlights();

    const project = evaluator.project;
    const context = project.getContext(source);

    const latestValue = evaluator.getLatestSourceValue(source);

    // Is there a step we're actively evaluating? Highlight it!
    const stepNode = evaluator.getStepNode();
    if (stepNode) {
        highlights.add(source, stepNode, 'evaluating');
    }

    // Is there an exception on the last step? Highlight the node that created it!
    if (
        latestValue instanceof ExceptionValue &&
        latestValue.step !== undefined &&
        latestValue.step.node instanceof Node
    )
        highlights.add(source, latestValue.step.node, 'exception');

    // Is the caret selecting a non-placeholder node? Highlight it.
    if (caret.position instanceof Node) {
        highlights.add(
            source,
            caret.position,
            !blocks ? 'selected' : 'blockselected',
        );
    }

    // Does the selected node have a matching delimiter?
    if (caret.position instanceof Token) {
        const match = source.getMatchedDelimiter(caret.position);
        if (match) {
            highlights.add(source, match, 'delimiter');
        }
    }

    // Is a node being dragged?
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

    // Tag all nodes with primary conflicts as primary
    for (const [primary, conflicts] of project.getPrimaryConflicts())
        highlights.add(
            source,
            primary,
            conflicts.every((c) => !c.isMinor())
                ? 'primaryMajor'
                : 'primaryMinor',
        );

    // Tag all nodes with secondary conflicts as primary
    for (const [secondary, conflicts] of project.getSecondaryConflicts())
        highlights.add(
            source,
            secondary,
            conflicts.every((c) => !c.isMinor())
                ? 'secondaryMajor'
                : 'secondaryMinor',
        );

    // Are there any poses in this file being animated?
    if (animatingNodes)
        for (const animating of animatingNodes) {
            if (source.has(animating))
                highlights.add(source, animating, 'animating');
        }

    // Is any output selected?
    if (selectedOutput) {
        for (const node of selectedOutput)
            highlights.add(source, node, blocks ? 'blockoutput' : 'output');
    }

    // Get the caret's parent (if it's inside a token) and give it a hover highlight
    let caretParent: Node | undefined;
    if (caret.position instanceof Node)
        caretParent = source.root.getParent(caret.position);
    else if (caret.isPosition() && caret.insideToken()) {
        const token = source.getTokenAt(caret.position);
        if (token) caretParent = source.root.getParent(token);
    }

    // Should we highlight a node that the caret is hovering over?
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

    // Highlight definitions and uses
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
            if (definition !== undefined)
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
            for (const ref of source
                .nodes()
                .filter(
                    (def): def is Reference | NameType =>
                        (def instanceof Reference || def instanceof NameType) &&
                        def.resolve(context) === definition,
                ))
                highlights.add(source, ref, 'related');
        }
    }

    // Update the store, broadcasting the highlights to all node views for rendering.
    return highlights;
}

/** Populate the given Set with nodes to highlight. */
export function updateOutlines(
    highlights: Highlights,
    horizontal: boolean,
    rtl: boolean,
    blocks: boolean,
    getNodeView: (node: Node) => HTMLElement | undefined,
): HighlightSpec[] {
    const outlines: HighlightSpec[] = [];
    const nodeViews = new Map<HighlightSpec, HTMLElement>();
    // Convert all of the highlighted views into outlines of the nodes.
    for (const [node, types] of highlights.entries()) {
        const nodeView = getNodeView(node);
        if (nodeView) {
            // If this node has empty fields to highlight, add outlines for those too.
            const emptyFields = highlights.getEmpty(node);
            if (emptyFields && emptyFields.length > 0) {
                for (const fieldName of emptyFields) {
                    const fieldView = nodeView.querySelector(
                        `[data-field="${fieldName}"]`,
                    );
                    if (fieldView) {
                        const emptyOutline = {
                            types: types,
                            outline: getOutlineOf(
                                fieldView as HTMLElement,
                                horizontal,
                                rtl,
                                blocks,
                            ),
                            underline: getUnderlineOf(
                                fieldView as HTMLElement,
                                horizontal,
                                rtl,
                                blocks,
                            ),
                        };
                        outlines.push(emptyOutline);
                        nodeViews.set(emptyOutline, fieldView as HTMLElement);
                    }
                }
            }
            // No empty highlight? Just highlight the node.
            else {
                const outline = {
                    types: types,
                    outline: getOutlineOf(nodeView, horizontal, rtl, blocks),
                    underline: getUnderlineOf(
                        nodeView,
                        horizontal,
                        rtl,
                        blocks,
                    ),
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
            outline.types.includes('primaryMajor') ||
            outline.types.includes('secondaryMajor') ||
            outline.types.includes('primaryMinor') ||
            outline.types.includes('secondaryMinor')
        ) {
            for (let check = 0; check < index; check++) {
                const other = outlines[check];
                // Do they intersect vertically and horizontally?
                if (
                    (other.types.includes('primaryMajor') ||
                        other.types.includes('secondaryMajor') ||
                        other.types.includes('primaryMinor') ||
                        other.types.includes('secondaryMinor')) &&
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
            const index = outlines.indexOf(outline);
            const view = nodeViews.get(outline);
            if (index >= 0 && view)
                outlines[index].underline = getUnderlineOf(
                    view,
                    horizontal,
                    rtl,
                    blocks,
                    offset,
                );
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
    // Find all tokens in the range, and remember details about it.
    const tokens = source.tokens
        .map((token) => {
            const tokenStart = source.getTokenTextPosition(token);
            if (tokenStart === undefined) return undefined;
            const tokenEnd = tokenStart + token.getTextLength();
            if (start <= tokenEnd && end >= tokenStart) {
                return {
                    token,
                    start: tokenStart,
                    end: tokenEnd,
                };
            } else return undefined;
        })
        .filter((t) => t !== undefined);

    // Find views of all the tokens
    const nodeViews = tokens
        .map((t) => getNodeView(t.token))
        .filter((v) => v !== undefined);

    if (nodeViews.length === 0) return undefined;

    // Convert the tokens into rectangles
    const tokenRects = getTokenRects(nodeViews, blocks, {
        start: start - tokens[0].start,
        end: end - tokens[tokens.length - 1].start,
    });

    // Convert the rects into an outline of rows
    return getOutlineOfRows(rectsToRows(tokenRects, horzontal, rtl));
}

import Node from '@nodes/Node';
import type Source from '@nodes/Source';
import type Evaluator from '@runtime/Evaluator';
import type Evaluate from '@nodes/Evaluate';
import Expression, { ExpressionKind } from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Token from '@nodes/Token';
import Type from '@nodes/Type';
import TypePlaceholder from '@nodes/TypePlaceholder';
import ExceptionValue from '@values/ExceptionValue';
import { isValidDropTarget, type InsertionPoint } from '../../../edit/Drag';
import type Caret from '../../../edit/Caret';
import { getUnderlineOf, type Outline } from './outline';
import getOutlineOf from './outline';
import Reference from '../../../nodes/Reference';
import Program from '../../../nodes/Program';
import Block from '../../../nodes/Block';

/** Highlight types and whether they are rendered above or below the code. True for above. */
export const HighlightTypes = {
    selected: true,
    evaluating: false,
    exception: true,
    hovered: false,
    dragged: false,
    dragging: false,
    target: true,
    match: true,
    primary: true,
    secondary: true,
    minor: true,
    animating: false,
    output: true,
    blockselected: true,
    delimiter: false,
};
export type HighlightType = keyof typeof HighlightTypes;
export type Highlights = Map<Node, Set<HighlightType>>;
export type HighlightSpec = {
    types: HighlightType[];
    outline: Outline;
    underline: Outline;
};

function addHighlight(
    source: Source,
    map: Highlights,
    node: Node,
    type: HighlightType
) {
    if (source.has(node)) {
        if (!map.has(node)) map.set(node, new Set<HighlightType>());
        map.get(node)?.add(type);
    }
}

export function getHighlights(
    source: Source,
    evaluator: Evaluator,
    caret: Caret,
    dragged: Node | undefined,
    hovered: Node | undefined,
    insertion: InsertionPoint | undefined,
    animatingNodes: Set<Node> | undefined,
    selectedOutput: Evaluate[] | undefined,
    blocks: boolean
): Highlights {
    const project = evaluator.project;

    const latestValue = evaluator.getLatestSourceValue(source);

    // Build a set of highlights to render.
    const newHighlights = new Map<Node, Set<HighlightType>>();

    // Is there a step we're actively evaluating? Highlight it!
    const stepNode = evaluator.getStepNode();
    if (stepNode) addHighlight(source, newHighlights, stepNode, 'evaluating');

    // Is there an exception on the last step? Highlight the node that created it!
    if (
        latestValue instanceof ExceptionValue &&
        latestValue.step !== undefined &&
        latestValue.step.node instanceof Node
    )
        addHighlight(source, newHighlights, latestValue.step.node, 'exception');

    // Is the caret selecting a node? Highlight it.
    if (caret.position instanceof Node && !caret.isPlaceholderNode()) {
        const tokensSelected =
            !blocks ||
            !(caret.position instanceof Expression) ||
            caret.position.getKind() === ExpressionKind.Simple;
        addHighlight(
            source,
            newHighlights,
            caret.position,
            tokensSelected ? 'selected' : 'blockselected'
        );
        if (tokensSelected)
            addHighlight(source, newHighlights, caret.position, 'hovered');
    }

    // Is a node being dragged?
    if (dragged !== undefined) {
        // Highlight the node.
        addHighlight(source, newHighlights, dragged, 'dragged');

        // If there's something hovered or an insertion point, show targets and matches.
        // If we're hovered over a valid drop target, highlight the hovered node.
        if (
            hovered &&
            isValidDropTarget(project, dragged, hovered, insertion)
        ) {
            addHighlight(source, newHighlights, hovered, 'match');
            const parent = project.getRoot(hovered)?.getParent(hovered);
            if (parent) addHighlight(source, newHighlights, parent, 'hovered');
        }
        // Otherwise, highlight targets.
        else {
            // Find all of the expression placeholders and highlight them as drop targets,
            // unless they are dragged or contained in the dragged node
            if (dragged instanceof Expression)
                for (const placeholder of source.expression.nodes(
                    (n): n is ExpressionPlaceholder =>
                        n instanceof ExpressionPlaceholder
                ))
                    if (
                        !dragged.contains(placeholder) &&
                        isValidDropTarget(
                            project,
                            dragged,
                            placeholder,
                            insertion
                        )
                    )
                        addHighlight(
                            source,
                            newHighlights,
                            placeholder,
                            'target'
                        );

            // Find all of the type placeholders and highlight them sa drop target
            if (dragged instanceof Type)
                for (const placeholder of source.expression.nodes<TypePlaceholder>(
                    (n): n is TypePlaceholder => n instanceof TypePlaceholder
                ))
                    if (
                        !dragged.contains(placeholder) &&
                        isValidDropTarget(
                            project,
                            dragged,
                            placeholder,
                            insertion
                        )
                    )
                        addHighlight(
                            source,
                            newHighlights,
                            placeholder,
                            'target'
                        );
        }
    }
    // Otherwise, is a node hovered over? Highlight it.
    else if (
        hovered instanceof Node &&
        !(
            hovered instanceof Expression &&
            hovered.getKind() !== ExpressionKind.Simple
        )
    )
        addHighlight(source, newHighlights, hovered, 'hovered');

    // Inserting? Highlight the parent we're inserting into.
    if (insertion) {
        const parent = project
            .getRoot(insertion.node)
            ?.getParent(insertion.node);
        if (parent) addHighlight(source, newHighlights, parent, 'hovered');
    }

    // Tag all nodes with primary conflicts as primary
    for (const [primary, conflicts] of project.getPrimaryConflicts())
        addHighlight(
            source,
            newHighlights,
            primary,
            conflicts.every((c) => !c.isMinor()) ? 'primary' : 'minor'
        );

    // Tag all nodes with secondary conflicts as primary
    for (const secondary of project.getSecondaryConflicts().keys())
        addHighlight(source, newHighlights, secondary, 'secondary');

    // Are there any poses in this file being animated?
    if (animatingNodes)
        for (const animating of animatingNodes) {
            if (source.has(animating))
                addHighlight(source, newHighlights, animating, 'animating');
        }

    // Is any output selected?
    if (selectedOutput) {
        for (const node of selectedOutput)
            addHighlight(source, newHighlights, node, 'output');
    }

    // Does the selected node have a matching delimiter?
    if (caret.position instanceof Token) {
        const match = source.getMatchedDelimiter(caret.position);
        if (match) {
            addHighlight(source, newHighlights, match, 'delimiter');
        }
    }

    // Get the caret's parent and give it a hover highlight
    let caretParent: Node | undefined;
    if (caret.position instanceof Node)
        caretParent = source.root.getParent(caret.position);
    else {
        const token = source.getTokenAt(caret.position);
        if (token) caretParent = source.root.getParent(token);
    }

    if (
        !blocks &&
        caretParent &&
        !caret.isNode() &&
        (animatingNodes === undefined ||
            !Array.from(animatingNodes).some((node) =>
                node.contains(caretParent as Node)
            )) &&
        !(caretParent instanceof Program) &&
        !(caretParent instanceof Block && caretParent.isRoot())
    )
        addHighlight(source, newHighlights, caretParent, 'hovered');

    const reference =
        caret.position instanceof Reference
            ? caret.position
            : caretParent instanceof Reference
            ? caretParent
            : undefined;
    if (reference) {
        const definition = reference.resolve(project.getContext(source));
        if (definition !== undefined)
            addHighlight(source, newHighlights, definition, 'hovered');
    }

    // Update the store, broadcasting the highlights to all node views for rendering.
    return newHighlights;
}

/** Populate the given Set with nodes to highlight. */
export function updateOutlines(
    highlights: Highlights,
    horizontal: boolean,
    rtl: boolean,
    getNodeView: (node: Node) => HTMLElement | undefined
) {
    const outlines = [];
    const nodeViews = new Map<HighlightSpec, HTMLElement>();
    // Convert all of the highlighted views into outlines of the nodes.
    for (const [node, types] of highlights.entries()) {
        const nodeView = getNodeView(node);
        if (nodeView) {
            const outline = {
                types: Array.from(types),
                outline: getOutlineOf(nodeView, horizontal, rtl),
                underline: getUnderlineOf(nodeView, horizontal, rtl),
            };
            outlines.push(outline);
            nodeViews.set(outline, nodeView);
        }
    }

    // Look for underline collisions.
    // 1) Sort by width, so we put widest underlines first.
    outlines.sort(
        (a, b) =>
            b.underline.maxx -
            b.underline.minx -
            (a.underline.maxx - a.underline.minx)
    );

    const UnderlineHeight = 4;
    const MaxOffset = 12;

    // 2) Iterate through outlines, searching for any previous outlines in the list and offseting the y position accordingly.
    for (let index = 0; index < outlines.length; index++) {
        const outline = outlines[index];
        let offset = 0;
        if (
            outline.types.includes('primary') ||
            outline.types.includes('secondary')
        ) {
            for (let check = 0; check < index; check++) {
                const other = outlines[check];
                // Do they intersect vertically and horizontally?
                if (
                    (other.types.includes('primary') ||
                        other.types.includes('secondary')) &&
                    Math.round(outline.underline.miny + offset) ===
                        Math.round(other.underline.miny) &&
                    Math.max(
                        0,
                        Math.min(outline.underline.maxx, other.underline.maxx) -
                            Math.max(
                                outline.underline.minx,
                                other.underline.minx
                            )
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
                    offset
                );
        }
    }

    return outlines;
}

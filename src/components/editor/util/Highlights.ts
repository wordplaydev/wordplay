import Node from '@nodes/Node';
import type Source from '@nodes/Source';
import type Evaluator from '@runtime/Evaluator';
import type Evaluate from '@nodes/Evaluate';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Token from '@nodes/Token';
import Type from '@nodes/Type';
import TypePlaceholder from '@nodes/TypePlaceholder';
import Exception from '@runtime/Exception';
import { isValidDropTarget, type InsertionPoint } from '../Drag';
import type Caret from './Caret';
import type { Outline } from './outline';

/** Highlight types and whether they are rendered above or below the code. True for above. */
export const HighlightTypes = {
    selected: false,
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
    selectedOutput: Evaluate[] | undefined
) {
    const project = evaluator.project;

    const latestValue = evaluator.getLatestSourceValue(source);

    // Build a set of highlights to render.
    const newHighlights = new Map<Node, Set<HighlightType>>();

    // Is there a step we're actively evaluating? Highlight it!
    const stepNode = evaluator.getStepNode();
    if (stepNode) addHighlight(source, newHighlights, stepNode, 'evaluating');

    // Is there an exception on the last step? Highlight the node that created it!
    if (
        latestValue instanceof Exception &&
        latestValue.step !== undefined &&
        latestValue.step.node instanceof Node
    )
        addHighlight(source, newHighlights, latestValue.step.node, 'exception');

    // Is the caret selecting a node? Highlight it.
    if (caret.position instanceof Node && !caret.position.isPlaceholder())
        addHighlight(source, newHighlights, caret.position, 'selected');

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
                    (n) => n instanceof ExpressionPlaceholder
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
                for (const placeholder of source.expression.nodes(
                    (n) => n instanceof TypePlaceholder
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
    else if (hovered instanceof Node)
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
            addHighlight(source, newHighlights, match, 'hovered');
        }
    }

    // Update the store, broadcasting the highlights to all node views for rendering.
    return newHighlights;
}

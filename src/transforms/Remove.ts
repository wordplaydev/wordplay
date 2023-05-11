import type { Edit } from '../components/editor/util/Commands';
import Transform from './Transform';
import Node from '@nodes/Node';
import Caret from '../components/editor/util/Caret';
import type Context from '@nodes/Context';
import type Locale from '@locale/Locale';

/**
 * Remove a node from sequence of nodes in a parent.
 */
export default class Remove extends Transform {
    readonly parent: Node;
    readonly node: Node;
    readonly nodes: Node[];

    constructor(context: Context, parent: Node, node: Node, ...nodes: Node[]) {
        super(context);

        this.parent = parent;
        this.node = node;
        this.nodes = nodes;
    }

    getEdit(): Edit | undefined {
        // Generalize the nodes given to a list.
        const nodes = this.getNodes();
        if (nodes.length === 0) return;

        // Get the position of the first node we're removing.
        const position = this.context.source.getNodeFirstPosition(nodes[0]);
        if (position === undefined) return;

        // Get the new parent without the nodes.
        const newParent = this.getNewNode();

        // Replace the child in the parent, pretty printing it, then clone the program with the new parent, and create a new source from it.
        const newSource = this.context.source.withProgram(
            this.context.source.expression.replace(this.parent, newParent),
            // Preserve the space before the removed node.
            this.context.source.spaces.withReplacement(this.node, undefined)
        );

        // Return the new source and place the caret after the replacement.
        return [newSource, new Caret(newSource, position, undefined)];
    }

    getNodes() {
        return [this.node, ...this.nodes];
    }

    getEditedNode(): [Node, Node] {
        return [this.node, this.getNewNode()];
    }

    getNewNode() {
        // Create the parent node without the nodes we're removing.
        const nodes = this.getNodes();

        let parent = this.parent;

        // Convert the nodes to their child index.
        // We get them in reverse since some children are recreated during cloning of their sibling exists.
        // (For example, a colon before a value in a Bind). Reversing ensures that the contingent value is removed first.
        // It also ensures that the child indices do not change as we remove them.
        let indicies = nodes
            .map((node) => parent.getChildren().indexOf(node))
            .reverse();

        // Verify that this is a valid replacement.
        if (!indicies.every((index) => index >= 0))
            throw Error(
                "Uh oh, someone passed children that aren't in the given parent."
            );

        // Remove each child.
        while (indicies.length > 0) {
            // Get the correponding child.
            const node = parent.getChildren()[indicies[0]];
            // Remove the child
            parent = parent.replace(node, undefined);
            // Drop the index we just removed.
            indicies.shift();
        }

        // Return the new parent.
        return parent;
    }

    getDescription(translation: Locale) {
        return translation.transform.remove(
            this.getNewNode().getLabel(translation)
        );
    }

    equals(transform: Transform) {
        return (
            transform instanceof Remove &&
            this.node instanceof Node &&
            transform.node instanceof Node &&
            this.node.isEqualTo(transform.node)
        );
    }
}

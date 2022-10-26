import type { Edit } from "../editor/Commands";
import Transform from "./Transform";
import Node from "../nodes/Node";
import type Source from "../models/Source";
import Caret from "../models/Caret";
import type LanguageCode from "../nodes/LanguageCode";
import { TRANSLATE } from "../nodes/Translations";

/**
 * Remove a sequence of nodes in a parent.
 */
export default class Remove extends Transform {

    readonly parent: Node;
    readonly node: Node;
    readonly nodes: Node[];
    
    constructor(source: Source, parent: Node, node: Node, ...nodes: Node[]) {
        super(source);

        this.parent = parent;
        this.node = node;
        this.nodes = nodes;

    }

    getEdit(): Edit {

        // Generalize the nodes given to a list.
        const nodes = this.getNodes();
        if(nodes.length === 0) return;

        // Get the position of the first node we're removing.
        const position = this.source.getNodeFirstIndex(nodes[0]);
        if(position === undefined) return;

        // Get the new parent without the nodes.
        const newParent = this.getNewNode();

        // Replace the child in the parent, pretty printing it, then clone the program with the new parent, and create a new source from it.
        const newSource = this.source.withProgram(this.source.program.clone(false, this.parent, newParent));

        // Return the new source and place the caret after the replacement.
        return [ newSource, new Caret(newSource, position) ];

    }

    getNodes() { return [ this.node, ...this.nodes ]; }

    getNewNode() { 

        // Create the parent node without the nodes we're removing.
        const nodes = this.getNodes();

        let parent = this.parent;

        // Get the space prior to the first node.
        const space = this.source.getFirstToken(nodes[0])?.space ?? "";

        // Convert the nodes to their child index.
        // We get them in reverse since some children are recreated during cloning of their sibling exists.
        // (For example, a colon before a value in a Bind). Reversing ensures that the contingent value is removed first.
        // It also ensures that the child indices do not change as we remove them.
        let indicies = nodes.map(node => parent.getChildren().indexOf(node)).reverse();

        // Verify that this is a valid replacement.
        if(!indicies.every(index => index >= 0))
            throw Error("Uh oh, someone passed children that aren't in the given parent.");

        // Find the last child, so we can add the preceding space to the child after it.
        const lastChildIndex = Math.max.apply(null, indicies);
        const childCount = indicies.length;

        // Remove each child.
        while(indicies.length > 0) {
            // Get the correponding child.
            const node = parent.getChildren()[indicies[0]];
            // Remove the child
            parent = parent.clone(false, node, undefined);
            // Drop the index we just removed.
            indicies.shift(); 
        }

        // Add the space to the child after the last one we removed.
        const childAfterLastRemoved = parent.getChildren()[lastChildIndex + 1 - childCount];
        if(childAfterLastRemoved !== undefined)
            parent = parent.clone(false, childAfterLastRemoved, childAfterLastRemoved.withPrecedingSpace(space, true));

        // Return the new parent.
        return parent;

    }

    getDescription(languages: LanguageCode[]): string {

        const translations = this.getPrettyNewNode(languages).getDescriptions(this.source.getContext());
        const descriptions = {
            eng: `Remove ${translations.eng}`,
            "😀": TRANSLATE
        };

        return descriptions[languages.find(lang => lang in descriptions) ?? "eng"];;

    }

    equals(transform: Transform) {
        return transform instanceof Remove && (
            (this.node instanceof Node && transform.node instanceof Node && this.node === transform.node) ||
            (Array.isArray(this.node) && Array.isArray(transform.node) && this.node.every((node, index) => Array.isArray(transform.node) && transform.node[index] === node))
        );

    }

}
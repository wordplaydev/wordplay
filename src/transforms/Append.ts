import Node from "../nodes/Node";
import Transform from "./Transform";
import type Source from "../models/Source";
import type LanguageCode from "../nodes/LanguageCode";
import type { Edit } from "../editor/Commands";
import type Reference from "./Reference";
import Caret from "../models/Caret";
import Token from "../nodes/Token";

export default class Append<NodeType extends Node> extends Transform {

    readonly parent: Node;
    readonly position: number;
    /** Undefined means after the last child. Otherwise, the node should be whatever child we're inserting before, even if it's not part of the list. */
    readonly before: Node | undefined;
    readonly list: Node[];
    readonly insertion: NodeType | Reference<NodeType>

    constructor(source: Source, position: number, parent: Node, list: Node[], before: Node | undefined, insertion: NodeType | Reference<NodeType>) {

        super(source);

        this.parent = parent;
        this.position = position;
        this.list = list;
        this.before = before;
        this.insertion = insertion;

    }

    getEdit(lang: LanguageCode): Edit {

        // Get the node to insert, prettied.
        let newChild = this.getPrettyNewNode(lang).clone(true);

        // Find the space before the insertion by finding the token that contains the index.
        // Insert the space we find before it.
        const spaceNode = this.source.getTokenAt(this.position);
        const spaceNodeIndex = spaceNode === undefined ? undefined : this.source.program.nodes(n => n instanceof Token).indexOf(spaceNode);
        let afterSpace = undefined;
        if(spaceNode !== undefined) {
            const space = spaceNode.space;
            const spaceIndex = this.source.getTokenSpaceIndex(spaceNode);
            const splitIndex = spaceIndex === undefined ? undefined : this.position - spaceIndex;
            if(space !== undefined && splitIndex !== undefined) {
                const beforeSpace = space?.substring(0, splitIndex);
                // Save this for later.
                afterSpace = space?.substring(splitIndex);
                // Create a new child with the whitespace before
                newChild = newChild.withPrecedingSpace(beforeSpace, true);
            }
        }

        // Clone the list.
        let newList = this.list.map(item => item.clone(false));

        // Insert the new child in the list. 
        // If its unspecified or it is but it's not in the list, then it's at the end of the list.
        // If a child before was given and it's in the list, then 
        const insertionIndex = this.before === undefined || this.list.indexOf(this.before) < 0 ? newList.length : this.list.indexOf(this.before); 
        newList.splice(insertionIndex, 0, newChild);

        // Remember the child index in the parent, so we can find the new child we insert after it.
        const childIndex = this.before === undefined ? this.parent.getChildren().length : this.parent.getChildren().indexOf(this.before);
        
        // Get a path to the parent so we can find it later.
        const parentPath = this.parent.getPath();

        // Clone the parent with the new list, pretty printing.
        const newParent = this.parent.clone(true, this.list, newList);
        
        // Make a new program with the new parent
        let newProgram = this.source.program.clone(false, this.parent, newParent);

        // Finally, if there's after space, find the first token after the last token in the new list and update it's space.
        if(afterSpace !== undefined && spaceNodeIndex !== undefined) {
            // Find the corresponding token in the revised program by summing it's original token index with the number
            // of tokens in the new child.
            const newSpaceNodeIndex = spaceNodeIndex + newChild.nodes(n => n instanceof Token).length;
            const newProgramTokens = newProgram.nodes(n => n instanceof Token) as Token[];
            const newSpaceNode = newProgramTokens[newSpaceNodeIndex];
            if(newSpaceNode !== undefined)
                newProgram = newProgram.clone(false, newSpaceNode, newSpaceNode.withSpace(afterSpace));
        }

        // Clone the source with the new parent.
        const newSource = this.source.withProgram(newProgram);

        // Resolve the parent path so we can find the location of the insertion.
        const finalParent = newProgram.resolvePath(parentPath);

        // Bail if we couldn't find the parent
        if(finalParent === undefined) return;

        // Find the new child we inserted. It's at the same index that we inserted before.
        const finalNewNode = finalParent.getChildren()[childIndex];
        if(finalNewNode === undefined) return;

        // Find it's last token index.
        let newCaretPosition: Node | number | undefined = newSource.getNodeLastIndex(finalNewNode);
        if(newCaretPosition === undefined) return;

        // Does the insertion have a placeholder token? If so, place the caret at it's first placeholder instead of the end.
        const firstPlaceholder = newChild.getFirstPlaceholder();
        if(firstPlaceholder) newCaretPosition = firstPlaceholder;

        // Return the new source and put the caret immediately after the inserted new child.
        return [ newSource, new Caret(newSource, newCaretPosition) ];

    }

    getDescription(lang: LanguageCode): string {
        const replacement = this.getPrettyNewNode(lang);
        return {
            eng: "Insert " + replacement.getDescriptions().eng
        }[lang];
    }

    getNewNode(lang: LanguageCode): Node {
        if(this.insertion instanceof Node)
            return this.insertion;
        const [ creator, def ] = this.insertion;
            return creator(def.getNameInLanguage(lang) ?? "unnamed");
    }

    equals(transform: Transform): boolean {
        return transform instanceof Append && this.before === transform.before && this.list === transform.list && (
            (this.insertion instanceof Node && transform.insertion instanceof Node && this.insertion.toWordplay() === transform.insertion.toWordplay()) ||
            (Array.isArray(this.insertion) && Array.isArray(transform.insertion) && this.insertion[1] === transform.insertion[1])
        )
    }

}
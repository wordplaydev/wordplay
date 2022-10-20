import Node from "../nodes/Node";
import Transform from "./Transform";
import type Source from "../models/Source";
import type LanguageCode from "../nodes/LanguageCode";
import type { Edit } from "../editor/Commands";
import type Reference from "./Reference";
import Caret from "../models/Caret";
import Token from "../nodes/Token";
import withPrecedingSpace from "./withPrecedingSpace";

export default class Append<NodeType extends Node> extends Transform {

    readonly parent: Node;
    readonly position: number;
    /** Undefined means "at the end" */
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

        // Get the node to insert.
        let newChild = this.getSubjectNode(lang);

        // Find the space before the insertion by finding the token that contains the index.
        // Insert the space we find before it.
        const programTokens = this.source.program.nodes(n => n instanceof Token) as Token[];
        const spaceNodeIndex = programTokens.findIndex(n => n.whitespaceContainsPosition(this.position));
        const spaceNode = spaceNodeIndex < 0 ? undefined : programTokens[spaceNodeIndex];
        let afterSpace = undefined;
        if(spaceNode !== undefined) {
            const space = spaceNode.whitespace;
            const spaceIndex = spaceNode.getWhitespaceIndex();
            const splitIndex = spaceIndex === undefined ? undefined : this.position - spaceIndex;
            if(space !== undefined && splitIndex !== undefined) {
                const beforeSpace = space?.substring(0, splitIndex);
                // Save this for later.
                afterSpace = space?.substring(splitIndex);
                // Create a new child with the whitespace before
                newChild = withPrecedingSpace(newChild, beforeSpace);
            }
        }

        // Clone the list.
        let newList = this.list.map(item => item.clone());

        // Insert at the end.
        if(this.before === undefined) {
            newList.push(newChild);
        }
        // Insert in the middle, before the given child.
        else {
            const index = this.list.indexOf(this.before);
            if(index < 0) return;
            newList.splice(index, 0, newChild);
        }
        
        // Clone the parent with the new list.
        const newParent = this.parent.clone(this.list, newList);
        
        // Make a new program with the new parent
        let newProgram = this.source.program.clone(this.parent, newParent);

        // Finally, if there's after space, find the first token after the last token in the new list and update it's space.
        if(afterSpace !== undefined) {
            // Find the corresponding token in the revised program by summing it's original token index with the number
            // of tokens in the new child.
            const newSpaceNodeIndex = spaceNodeIndex + newChild.nodes(n => n instanceof Token).length;
            const newProgramTokens = newProgram.nodes(n => n instanceof Token) as Token[];
            const newSpaceNode = newProgramTokens[newSpaceNodeIndex];
            if(newSpaceNode !== undefined)
                newProgram = newProgram.clone(newSpaceNode, newSpaceNode.withSpace(afterSpace));
        }

        // Clone the source with the new parent.
        const newSource = this.source.withCode(newProgram.toWordplay());

        // Return the new source and put the caret after the inserted new child in the list. 
        return [ newSource, new Caret(newSource, this.position + newChild.toWordplay().trim().length) ];

    }

    getDescription(lang: LanguageCode): string {
        const replacement = this.getSubjectNode(lang);
        return {
            eng: "Insert " + replacement.getDescriptions().eng
        }[lang];
    }

    getSubjectNode(lang: LanguageCode): Node {
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
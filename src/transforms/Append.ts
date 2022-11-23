import Node from "../nodes/Node";
import Transform from "./Transform";
import type Source from "../models/Source";
import type LanguageCode from "../nodes/LanguageCode";
import type { Edit } from "../editor/util/Commands";
import type Refer from "./Refer";
import Caret from "../models/Caret";
import Token from "../nodes/Token";
import { TRANSLATE } from "../nodes/Translations";

export default class Append<NodeType extends Node> extends Transform {

    readonly parent: Node;
    readonly position: number;
    /** Undefined means after the last child. Otherwise, the node should be whatever child we're inserting before, even if it's not part of the list. */
    readonly before: Node | undefined;
    readonly list: Node[];
    readonly insertion: NodeType | Refer<NodeType>

    constructor(source: Source, position: number, parent: Node, list: Node[], before: Node | undefined, insertion: NodeType | Refer<NodeType>) {

        super(source);

        this.parent = parent;
        this.position = position;
        this.list = list;
        this.before = before;
        this.insertion = insertion;

    }

    getEdit(lang: LanguageCode[]): Edit {

        // Get the node to insert, prettied.
        let newChild = this.getPrettyNewNode(lang).replace(true);

        // Find the space before the insertion by finding the token that contains the index.
        // Insert the space we find before it.
        const spaceNode = this.source.getTokenAt(this.position);
        const spaceNodeIndex = spaceNode === undefined ? undefined : this.source.program.nodes(n => n instanceof Token).indexOf(spaceNode);
        let afterSpace = undefined;
        if(spaceNode !== undefined) {
            const space = spaceNode.space;
            const spaceIndex = this.source.getTokenSpacePosition(spaceNode);
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
        let newList = this.list.map(item => item.replace(false));

        // Insert the new child in the list. 
        // If its unspecified or it is but it's not in the list, then it's at the end of the list.
        // If a child before was given and it's in the list, then 
        const insertionIndex = this.before === undefined || this.list.indexOf(this.before) < 0 ? newList.length : this.list.indexOf(this.before); 
        newList.splice(insertionIndex, 0, newChild);

        // Remember the child index in the parent, so we can find the new child we insert after it.
        const childIndex = this.before === undefined ? this.parent.getChildren().length : this.parent.getChildren().indexOf(this.before);

        // Clone the parent with the new list, pretty printing.
        const newParent = this.parent.replace(true, this.list, newList);
        
        // Make a new program with the new parent
        let newProgram = this.source.program.replace(false, this.parent, newParent);

        // Finally, if there's after space, find the first token after the last token in the new list and update it's space.
        if(afterSpace !== undefined && spaceNodeIndex !== undefined) {
            // Find the corresponding token in the revised program by summing it's original token index with the number
            // of tokens in the new child.
            const newSpaceNodeIndex = spaceNodeIndex + newChild.nodes(n => n instanceof Token).length;
            const newProgramTokens = newProgram.nodes(n => n instanceof Token) as Token[];
            const newSpaceNode = newProgramTokens[newSpaceNodeIndex];
            if(newSpaceNode !== undefined)
                newProgram = newProgram.replace(false, newSpaceNode, newSpaceNode.withSpace(afterSpace));
        }

        // Clone the source with the new parent.
        const newSource = this.source.withProgram(newProgram);

        // Find the new child we inserted. It's at the same index that we inserted before.
        const finalNewNode = newParent.getChildren()[childIndex];
        if(finalNewNode === undefined) return;

        // Find it's last token index.
        let newCaretPosition: Node | number | undefined = newSource.getNodeLastPosition(finalNewNode);
        if(newCaretPosition === undefined) return;

        // Does the insertion have a placeholder token? If so, place the caret at it's first placeholder instead of the end.
        const firstPlaceholder = finalNewNode.getFirstPlaceholder();
        if(firstPlaceholder) 
            newCaretPosition = firstPlaceholder;

        // Return the new source and put the caret immediately after the inserted new child.
        return [ newSource, new Caret(newSource, newCaretPosition) ];

    }

    getDescription(languages: LanguageCode[]): string {

        let translations = undefined;
        if(Array.isArray(this.insertion))
            translations = this.insertion[1].getDescriptions();

        if(translations === undefined) {
            const replacement = this.getPrettyNewNode(languages);
            translations = replacement.getDescriptions(this.source.getContext());
        }

        const descriptions = {
            eng: `Insert ${translations.eng}`,
            "😀": TRANSLATE
        };
        
        return descriptions[languages.find(lang => lang in descriptions) ?? "eng"];;
    }

    getNewNode(languages: LanguageCode[]): Node {
        if(this.insertion instanceof Node)
            return this.insertion;
        const [ creator, def ] = this.insertion;
            return creator(def.getTranslation(languages));
    }

    equals(transform: Transform): boolean {
        return transform instanceof Append && this.before === transform.before && this.list === transform.list && (
            (this.insertion instanceof Node && transform.insertion instanceof Node && this.insertion.toWordplay() === transform.insertion.toWordplay()) ||
            (Array.isArray(this.insertion) && Array.isArray(transform.insertion) && this.insertion[1] === transform.insertion[1])
        )
    }

}
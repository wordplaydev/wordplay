import Node from "../nodes/Node";
import Transform from "./Transform";
import type LanguageCode from "../nodes/LanguageCode";
import type { Edit } from "../editor/util/Commands";
import type Refer from "./Refer";
import Caret from "../models/Caret";
import { TRANSLATE } from "../nodes/Translations";
import type Context from "../nodes/Context";

export default class Append<NodeType extends Node> extends Transform {

    readonly parent: Node;
    readonly position: number;
    /** Undefined means after the last child. Otherwise, the node should be whatever child we're inserting before, even if it's not part of the list. */
    readonly before: Node | undefined;
    readonly list: Node[];
    readonly insertion: NodeType | Refer<NodeType>

    constructor(context: Context, position: number, parent: Node, list: Node[], before: Node | undefined, insertion: NodeType | Refer<NodeType>) {

        super(context);

        this.parent = parent;
        this.position = position;
        this.list = list;
        this.before = before;
        this.insertion = insertion;

    }

    getEdit(lang: LanguageCode[]): Edit | undefined {

        // Get the node to insert.
        let newChild = this.getNewNode(lang);

        // Find the space before the insertion by finding the token that contains the index.
        // Insert the space we find before it.
        const spaceNode = this.context.source.getTokenAt(this.position);
        let beforeSpace = undefined;
        let afterSpace = undefined;
        if(spaceNode !== undefined) {
            const space = this.context.source.spaces.getSpace(spaceNode);
            const spaceIndex = this.context.source.getTokenSpacePosition(spaceNode);
            const splitIndex = spaceIndex === undefined ? undefined : this.position - spaceIndex;
            if(space !== undefined && splitIndex !== undefined) {
                beforeSpace = space?.substring(0, splitIndex);
                // Save this for later.
                afterSpace = space?.substring(splitIndex);
            }
        }

        // Clone the list.
        let newList = this.list.map(item => item.replace());

        // Insert the new child in the list. 
        // If its unspecified or it is but it's not in the list, then it's at the end of the list.
        // If a child before was given and it's in the list, then 
        const insertionIndex = this.before === undefined || this.list.indexOf(this.before) < 0 ? newList.length : this.list.indexOf(this.before); 
        newList.splice(insertionIndex, 0, newChild);

        // Remember the child index in the parent, so we can find the new child we insert after it.
        const childIndex = this.before === undefined ? this.parent.getChildren().length : this.parent.getChildren().indexOf(this.before);

        // Clone the parent with the new list, pretty printing.
        const newParent = this.parent.replace(this.list, newList);
        
        // Make a new program with the new parent
        let newProgram = this.context.source.expression.replace(this.parent, newParent);

        let newSpace = this.context.source.spaces;
        if(spaceNode !== undefined && afterSpace !== undefined) newSpace = newSpace.withSpace(spaceNode, afterSpace);
        if(beforeSpace !== undefined) newSpace.withSpace(newChild, beforeSpace);

        // Clone the source with the new parent.
        const newSource = this.context.source.withProgram(
            newProgram,
            newSpace
        );

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
            const replacement = this.getNewNode(languages);
            translations = replacement.getDescriptions(this.context);
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
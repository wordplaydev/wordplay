import type { Edit } from "../editor/util/Commands";
import Transform from "./Transform";
import Node from "../nodes/Node";
import type LanguageCode from "../nodes/LanguageCode";
import type Refer from "./Refer";
import Caret from "../models/Caret";
import { TRANSLATE } from "../nodes/Translations";
import type Context from "../nodes/Context";

export default class Add<NodeType extends Node> extends Transform {

    readonly parent: Node;
    readonly position: number;
    readonly child: NodeType | Refer<NodeType>;
    readonly field: string;

    constructor(context: Context, position: number, parent: Node, field: string, child: NodeType | Refer<NodeType>) {
        super(context);

        this.parent = parent;
        this.position = position;
        this.field = field;
        this.child = child;

    }

    getNewNode(languages: LanguageCode[]): Node {
        return this.child instanceof Node ? this.child : this.child[0](this.child[1].getTranslation(languages));
    }

    getEdit(languages: LanguageCode[]): Edit {
        
        // Make the new node
        const newNode = this.getPrettyNewNode(languages);

        // Create a new program with the parent's field set to the new node.
        const newSource = this.context.source.withProgram(this.context.source.program.replace(false, this.parent, this.parent.replace(true, this.field, newNode)));

        // Place the caret at first placeholder or the end of the node in the source.
        let newCaretPosition = newNode.getFirstPlaceholder() || newSource.getNodeLastPosition(newNode);

        // If we didn't find a caret position, bail. Otherwise, return the edit.
        return newCaretPosition === undefined ? undefined : [ newSource, new Caret(newSource, newCaretPosition)];

    }

    getDescription(languages: LanguageCode[]): string {

        let translations = undefined;
        if(Array.isArray(this.child))
            translations = this.child[1].getDescriptions();

        if(translations === undefined) {
            const replacement = this.getPrettyNewNode(languages);
            translations = replacement.getDescriptions(this.context);
        }

        const descriptions = {
            eng: `Add ${translations.eng}`,
            "😀": TRANSLATE
        };
        
        return descriptions[languages.find(lang => lang in descriptions) ?? "eng"];
    }

    equals(transform: Transform) {
        return transform instanceof Add && this.parent === transform.parent && (
            (this.child instanceof Node && transform.child instanceof Node && this.child === transform.child) || 
            (Array.isArray(this.child) && Array.isArray(transform.child) && this.child[1] === transform.child[1])
        );
    }

}
import type { Edit } from "../editor/util/Commands";
import Transform from "./Transform";
import Node from "../nodes/Node";
import type LanguageCode from "../nodes/LanguageCode";
import Refer from "./Refer";
import Caret from "../models/Caret";
import { TRANSLATE } from "../nodes/Translations";
import type Context from "../nodes/Context";

export default class Add<NodeType extends Node> extends Transform {

    readonly parent: Node;
    readonly position: number;
    readonly child: NodeType | Refer;
    readonly field: string;

    constructor(context: Context, position: number, parent: Node, field: string, child: NodeType | Refer) {
        super(context);

        this.parent = parent;
        this.position = position;
        this.field = field;
        this.child = child;

    }

    getNewNode(languages: LanguageCode[]): Node {
        return this.child instanceof Node ? this.child : this.child.getNode(languages);
    }

    getEditedNode(lang: LanguageCode[]): [ Node, Node ] {
        const newNode = this.getNewNode(lang);
        return [ newNode, this.parent.replace(this.field, newNode) ];
    }

    getEdit(languages: LanguageCode[]): Edit | undefined  {
        
        const [ newNode, newParent ] = this.getEditedNode(languages);

        // Split the space using the position, defaulting to the original space.
        let newSpaces = Transform.splitSpace(this.context.source, this.position, newNode);

        const newProgram = this.context.source.expression.replace(this.parent, newParent);
        const newSource = this.context.source.withProgram(newProgram, newSpaces);

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
            const replacement = this.getNewNode(languages);
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
            (this.child instanceof Node && transform.child instanceof Node && this.child.equals(transform.child)) || 
            (this.child instanceof Refer && transform.child instanceof Refer && this.child.equals(transform.child))
        );
    }

}
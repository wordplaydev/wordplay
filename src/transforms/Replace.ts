import type { Edit } from "../editor/util/Commands";
import Transform from "./Transform";
import Node from "../nodes/Node";
import Caret from "../models/Caret";
import type LanguageCode from "../nodes/LanguageCode";
import type Refer from "./Refer";
import { TRANSLATE } from "../nodes/Translations";
import type Context from "../nodes/Context";

export default class Replace<NodeType extends Node> extends Transform {

    readonly node: Node;
    readonly replacement: NodeType | Refer<NodeType>;

    constructor(context: Context, node: Node, replacement: NodeType | Refer<NodeType>) {
        super(context);

        this.node = node;
        this.replacement = replacement;

    }

    getEdit(lang: LanguageCode[]): Edit {
        
        const parent = this.context.get(this.node)?.getParent();
        if(parent === undefined || parent === null) return;

        // Get the space prior to the current node.
        const space = this.context.source.getFirstToken(this.node)?.space;
        if(space === undefined) return;

        // Get the position of the node we're replacing.
        const position = this.context.source.getNodeFirstPosition(this.node);
        if(position === undefined) return;

        // Get or create the replacement with the original node's space.
        const replacement = this.getPrettyNewNode(lang).withPrecedingSpace(space, true);

        // Replace the child in the parent, pretty printing it, then clone the program with the new parent, and create a new source from it.
        const newParent = parent.replace(true, this.node, replacement);
        const newSource = this.context.source.withProgram(this.context.source.expression.replace(false, parent, newParent));

        let newCaretPosition = replacement.getFirstPlaceholder() ?? newSource.getNodeLastPosition(replacement);
        if(newCaretPosition === undefined) return;

        // Return the new source and place the caret after the replacement.
        return [ newSource, new Caret(newSource, newCaretPosition ?? position) ];

    }

    getNewNode(languages: LanguageCode[]) { 
        
        if(!Array.isArray(this.replacement)) 
            return this.replacement;

        const [ creator, def ] = this.replacement;
        return creator(def.getTranslation(languages));
        
    }

    getDescription(languages: LanguageCode[]): string {

        let translations = undefined;
        if(Array.isArray(this.replacement))
            translations = this.replacement[1].getDescriptions();

        if(translations === undefined) {
            const replacement = this.getPrettyNewNode(languages);
            translations = replacement.getDescriptions(this.context);
        }

        const descriptions = {
            eng: `Replace with ${translations.eng}`,
            "😀": `${TRANSLATE} → ${translations["😀"]}`
        };
        return descriptions[languages.find(lang => lang in descriptions) ?? "eng"];

    }

    equals(transform: Transform) {
        return transform instanceof Replace && this.node === transform.node && (
            (this.replacement instanceof Node && transform.replacement instanceof Node && this.replacement.toWordplay() === transform.replacement.toWordplay()) || 
            (Array.isArray(this.replacement) && Array.isArray(transform.replacement) && this.replacement[1] === transform.replacement[1])
        );
    }

}
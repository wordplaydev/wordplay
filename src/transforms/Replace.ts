import type { Edit } from "../editor/Commands";
import Transform from "./Transform";
import Node from "../nodes/Node";
import type Source from "../models/Source";
import Caret from "../models/Caret";
import type LanguageCode from "../nodes/LanguageCode";
import type Reference from "./Reference";
import withPrecedingSpace from "./withPrecedingSpace";

export default class Replace<NodeType extends Node> extends Transform {

    readonly node: Node;
    readonly replacement: NodeType | Reference<NodeType>;

    constructor(source: Source, node: Node, replacement: NodeType | Reference<NodeType> ) {
        super(source);

        this.node = node;
        this.replacement = replacement;

    }    

    getEdit(lang: LanguageCode): Edit {
        
        const parent = this.node.getParent();
        if(parent === undefined || parent === null) return;

        // Get the space prior to the current node.
        const space = this.source.getFirstToken(this.node)?.space;
        if(space === undefined) return;

        // Get or create the replacement with the original node's space.
        const replacement = withPrecedingSpace(this.getPrettyNewNode(lang).clone(true), space, true);

        // Get a path to the node we're replacing, so we can find it's replacement and position the cursor.
        const path = this.node.getPath();

        // Replace the child in the parent, pretty printing it, then clone the program with the new parent, and create a new source from it.
        const newParent = parent.clone(true, this.node, replacement);
        const newSource = this.source.withProgram(this.source.program.clone(false, parent, newParent));

        // Find the replacement child and it's last index.
        const newChild = newSource.program.resolvePath(path);
        const newIndex = newChild === undefined ? undefined : newSource.getNodeLastIndex(newChild);

        // Return the new source and place the caret after the replacement.
        return newIndex === undefined ? undefined : [ newSource, new Caret(newSource, newIndex) ];

    }

    getNewNode(lang: LanguageCode) { 
        
        if(this.replacement instanceof Node)
            return this.replacement;

        const [ creator, def ] = this.replacement;
        return creator(def.getNameInLanguage(lang) ?? "unnamed");
        
    }

    getDescription(lang: LanguageCode): string {

        const replacement = this.getPrettyNewNode(lang);
        return {
            eng: "Replace with " + replacement.getDescriptions().eng
        }[lang];

    }

    equals(transform: Transform) {
        return transform instanceof Replace && this.node === transform.node && (
            (this.replacement instanceof Node && transform.replacement instanceof Node && this.replacement.toWordplay() === transform.replacement.toWordplay()) || 
            (Array.isArray(this.replacement) && Array.isArray(transform.replacement) && this.replacement[1] === transform.replacement[1])
        );
    }

}
import type { Edit } from "../editor/Commands";
import Transform from "./Transform";
import Node from "../nodes/Node";
import type Source from "../models/Source";
import type LanguageCode from "../nodes/LanguageCode";
import type Reference from "./Reference";
import Caret from "../models/Caret";

export default class Add<NodeType extends Node> extends Transform {

    readonly parent: Node;
    readonly position: number;
    readonly child: NodeType | Reference<NodeType>;
    readonly field: string;

    constructor(source: Source, position: number, parent: Node, field: string, child: NodeType | Reference<NodeType>) {
        super(source);

        this.parent = parent;
        this.position = position;
        this.field = field;
        this.child = child;

    }

    getNewNode(lang: LanguageCode): Node {
        return this.child instanceof Node ? this.child : this.child[0](this.child[1].getNameInLanguage(lang) ?? "unnamed");
    }

    getEdit(lang: LanguageCode): Edit {
        
        // Make the new node
        const newNode = this.getPrettyNewNode(lang);

        // Clone the parent
        const newParent = this.parent.clone(true, this.field, newNode);

        // Clone the source with the new parent.
        const newSource = this.source.withProgram(this.source.program.clone(false, this.parent, newParent));
        
        return [ newSource, new Caret(newSource, this.position + newNode.toWordplay().length)];

    }

    getDescription(lang: LanguageCode): string {
        const node = this.getPrettyNewNode(lang);
        return {
            eng: "Add " + node.getDescriptions().eng
        }[lang];
    }

    equals(transform: Transform) {
        return transform instanceof Add && this.parent === transform.parent && (
            (this.child instanceof Node && transform.child instanceof Node && this.child === transform.child) || 
            (Array.isArray(this.child) && Array.isArray(transform.child) && this.child[1] === transform.child[1])
        );
    }

}
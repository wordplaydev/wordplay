import Node from "../nodes/Node";
import Transform from "./Transform";
import type Source from "../models/Source";
import type LanguageCode from "../nodes/LanguageCode";
import type { Edit } from "../editor/Commands";
import type Reference from "./Reference";
import Caret from "../models/Caret";

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
        const newChild = this.getSubjectNode(lang);

        // Clone the list.
        const newList = this.list.map(item => item.clone());
        if(this.before === undefined)
            newList.push(newChild);
        else {
            const index = this.list.indexOf(this.before);
            if(index < 0) return;
            newList.splice(index, 0, newChild);
        }

        // Clone with the parent with the new list.
        const newParent = this.parent.clone(this.list, newList);
        
        // Clone the source with the new parent.
        const newSource = this.source.withCode(
            this.source.program.clone(this.parent, newParent)
            .toWordplay()
        );

        // Return the new source and put the caret after the inserted new child in the list. 
        return [ newSource, new Caret(newSource, this.position + newChild.toWordplay().length) ];

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
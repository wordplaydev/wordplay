import type Node from "./Node";
import { SyntacticConflict } from "./Parser";
import { SemanticConflict } from "./SemanticConflict";
import Unparsable from "./Unparsable";

export default class Conflict {

    readonly node: Node;
    readonly conflict: Unparsable | SemanticConflict;

    constructor(node: Node, conflict: Unparsable | SemanticConflict) {

        this.node = node;
        this.conflict = conflict;

    }
    
    toString() { return this.conflict instanceof Unparsable ? SyntacticConflict[this.conflict.reason] : SemanticConflict[this.conflict]; }

}
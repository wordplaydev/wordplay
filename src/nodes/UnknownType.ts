import type Conflict from "../conflicts/Conflict";
import type { ConflictContext } from "./Node";
import type Node from "./Node";
import Type from "./Type";

export default class UnknownType extends Type {

    readonly node: Node;

    constructor(node: Node) {
        super();

        this.node = node;

    }

    getChildren(): Node[] { return []; }
    getConflicts(context: ConflictContext): Conflict[] { return []; }
    isCompatible(context: ConflictContext, type: Type) { return false; }
    getConversion(context: ConflictContext, type: Type) { return undefined; }

    toWordplay() { return "•_"; }

}
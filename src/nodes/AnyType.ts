import type { ConflictContext } from "./Node";
import type Node from "./Node";
import Type from "./Type";

export default class AnyType extends Type {

    readonly node: Node;

    constructor(node: Node) {
        super();

        this.node = node;

    }

    computeChildren(): Node[] { return []; }
    isCompatible(context: ConflictContext, type: Type) { return true; }
    getNativeTypeName(): string { return "any"; }

    toWordplay() { return "*"; }

}
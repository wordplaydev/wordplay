import type { ConflictContext } from "./Node";
import type Node from "./Node";
import Type from "./Type";

export default class UnknownType extends Type {

    readonly node: Node;

    constructor(node: Node) {
        super();

        this.node = node;

    }

    computeChildren(): Node[] { return []; }
    isCompatible(context: ConflictContext, type: Type) { return false; }
    getNativeTypeName(): string { return "unknown"; }

    toWordplay() { return "□"; }

    clone(original?: Node, replacement?: Node) { return new UnknownType(this.node) as this; }

}
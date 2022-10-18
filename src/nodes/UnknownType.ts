import type Node from "./Node";
import Type from "./Type";

export default class UnknownType extends Type {

    readonly node: Node;

    constructor(node: Node) {
        super();

        this.node = node;

    }

    computeChildren(): Node[] { return []; }
    computeConflicts() {}
    accepts() { return false; }
    getNativeTypeName(): string { return "unknown"; }

    toWordplay() { return "□"; }

    clone() { return new UnknownType(this.node) as this; }
    
    getDescriptions() {
        return {
            eng: "An unknown type"
        }
    }

    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}
import { ANY_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Node from "./Node";
import Type from "./Type";

export default class AnyType extends Type {

    readonly node: Node;

    constructor(node: Node) {
        super();

        this.node = node;

    }

    computeChildren(): Node[] { return []; }
    isCompatible() { return true; }
    getNativeTypeName(): string { return ANY_NATIVE_TYPE_NAME; }

    toWordplay() { return "*"; }

    clone() { return new AnyType(this.node) as this; }

}
import { ANY_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Node from "./Node";
import Type from "./Type";

export default class AnyType extends Type {

    constructor() {
        super();

    }

    computeChildren(): Node[] { return []; }
    accepts() { return true; }
    getNativeTypeName(): string { return ANY_NATIVE_TYPE_NAME; }
    computeConflicts() {}

    toWordplay() { return "*"; }

    clone() { return new AnyType() as this; }

    getDescriptions() {
        return {
            eng: "A wildcard type"
        }
    }

    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}
import { NEVER_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Node from "./Node";
import Type from "./Type";

export default class NeverType extends Type {

    constructor() {
        super();

    }

    computeChildren(): Node[] { return []; }
    accepts() { return false; }
    getNativeTypeName(): string { return NEVER_NATIVE_TYPE_NAME; }
    computeConflicts() {}

    toWordplay() { return "-"; }

    clone() { return new NeverType() as this; }

    getDescriptions() {
        return {
            eng: "An impossible type"
        }
    }

}
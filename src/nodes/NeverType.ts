import { NEVER_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Node from "./Node";
import Type from "./Type";

export default class NeverType extends Type {

    constructor() {
        super();

    }

    computeChildren(): Node[] { return []; }
    isCompatible() { return true; }
    getNativeTypeName(): string { return NEVER_NATIVE_TYPE_NAME; }
    computeConflicts() {}

    toWordplay() { return "-"; }

    clone() { return new NeverType() as this; }

}
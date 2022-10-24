import { ANY_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Node from "./Node";
import type Translations from "./Translations";
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

    getDescriptions(): Translations {
        return {
            "😀": "TODO",
            eng: "A wildcard type"
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

}
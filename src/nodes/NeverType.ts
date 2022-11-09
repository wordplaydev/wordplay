import { NEVER_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";

export default class NeverType extends Type {

    constructor() {
        super();

    }

    getChildNames() { return []; }

    accepts() { return false; }
    getNativeTypeName(): string { return NEVER_NATIVE_TYPE_NAME; }
    computeConflicts() {}

    toWordplay() { return "-"; }

    clone() { return new NeverType() as this; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "An impossible type"
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

}
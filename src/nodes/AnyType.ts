import { ANY_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";

export default class AnyType extends Type {

    constructor() {
        super();
    }

    getGrammar() { return []; }

    accepts() { return true; }
    getNativeTypeName(): string { return ANY_NATIVE_TYPE_NAME; }
    computeConflicts() {}

    toWordplay() { return "*"; }

    clone() { return new AnyType().label(this._label) as this; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A wildcard type"
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

}
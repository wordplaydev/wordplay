import type { NativeTypeName } from "../native/NativeConstants";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";

export default class AnyType extends Type {

    constructor() {
        super();
    }

    getGrammar() { return []; }

    acceptsAll() { return true; }
    getNativeTypeName(): NativeTypeName { return "any"; }
    computeConflicts() {}

    toWordplay() { return "*"; }

    replace() { return this; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "any type"
        }
    }

    
    
    

}
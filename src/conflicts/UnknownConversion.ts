import type Convert from "../nodes/Convert";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Conflict from "./Conflict";

export class UnknownConversion extends Conflict {
    readonly convert: Convert;
    readonly expectedType: Type;
    
    constructor(expr: Convert, expectedType: Type) {
        super(false);
        this.convert = expr;
        this.expectedType = expectedType;
    }

    getConflictingNodes() {
        return { primary: this.convert.type, secondary: [] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `There's no conversion from this to this type.`
        }
    }

}

import type Convert from "../nodes/Convert";
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
        return { primary: [ this.convert.type ] };
    }

    getExplanations() { 
        return {
            eng: `There's no conversion from this to this type.`
        }
    }

}

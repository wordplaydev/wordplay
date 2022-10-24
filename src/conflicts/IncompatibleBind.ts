import type Expression from "../nodes/Expression";
import type Translations from "../nodes/Translations";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class IncompatibleBind extends Conflict {

    readonly expectedType: Type;
    readonly value: Expression;
    readonly valueType: Type;

    constructor(type: Type, value: Expression, valueType: Type) {
        super(false);

        this.expectedType = type;
        this.value = value;
        this.valueType = valueType;
    }

    getConflictingNodes() {
        return { primary: [ this.value ], secondary: [ this.expectedType ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `Expected ${this.expectedType.toWordplay()}, got ${this.valueType.toWordplay()}`
        }
    }

}

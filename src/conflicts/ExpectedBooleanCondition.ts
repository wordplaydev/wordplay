import type Conditional from "../nodes/Conditional";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";

export class ExpectedBooleanCondition extends Conflict {
    
    readonly conditional: Conditional;
    readonly type: Type;

    constructor(conditional: Conditional, type: Type) {

        super(false);

        this.conditional = conditional;
        this.type = type;

    }

    getConflictingNodes() {
        return { primary: [ this.conditional.condition ] };
    }

    getExplanations() { 
        return {
            eng: `Expected Boolean; this is type ${this.type.toWordplay()}`
        }
    }

}
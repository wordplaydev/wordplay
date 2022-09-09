import type Conditional from "../nodes/Conditional";
import Conflict from "./Conflict";

export class ExpectedBooleanCondition extends Conflict {
    readonly conditional: Conditional;

    constructor(conditional: Conditional) {
        super(false);
        this.conditional = conditional;
    }

    getConflictingNodes() {
        return [ this.conditional.condition ];
    }
}
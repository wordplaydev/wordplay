import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";

export class UnexpectedInput extends Conflict {
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    readonly expected: Bind;
    readonly given: Bind;
    
    constructor(func: FunctionType | StructureType, evaluate: Evaluate, expected: Bind, given: Bind) {
        super(false);

        this.func = func;
        this.evaluate = evaluate;
        this.expected = expected;
        this.given = given;

    }

    getConflictingNodes() {
        return this.given.names;
    }

    getExplanations() { 
        return {
            eng: `We expected ${this.expected.getNames().join(",")} here.`
        }
    }

}

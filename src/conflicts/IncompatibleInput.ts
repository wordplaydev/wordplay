import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import type { Input } from "../nodes/FunctionType";
import Conflict from "./Conflict";
import type Expression from "../nodes/Expression";
import type Bind from "../nodes/Bind";

export class IncompatibleInput extends Conflict {
    
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    readonly given: Expression | Bind;
    readonly expected: Input;
    
    constructor(func: FunctionType | StructureType, evaluate: Evaluate, givenInput: Expression | Bind, expectedInput: Input) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.given = givenInput;
        this.expected = expectedInput;
    }

    getConflictingNodes() {
        return [ this.given ];
    }

}
import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import type { Input } from "../nodes/FunctionType";
import Conflict, { type ConflictExplanations } from "./Conflict";
import type Expression from "../nodes/Expression";
import type Bind from "../nodes/Bind";
import type Type from "../nodes/Type";

export class IncompatibleInput extends Conflict {
    
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    readonly givenNode: Expression | Bind;
    readonly givenType: Type;
    readonly expected: Input;
    
    constructor(func: FunctionType | StructureType, evaluate: Evaluate, givenInput: Expression | Bind, givenType: Type, expectedInput: Input) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.givenNode = givenInput;
        this.givenType = givenType;
        this.expected = expectedInput;
    }

    getConflictingNodes() {
        return [ this.givenNode ];
    }

    getExplanations(): ConflictExplanations {
        return {
            "eng": `Expected ${this.expected.type.toWordplay()}, received ${this.givenType.toWordplay()}`
        }
    }

}
import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import Conflict from "./Conflict";
import type Unparsable from "../nodes/Unparsable";
import type Expression from "../nodes/Expression";
import type Bind from "../nodes/Bind";


export class UnexpectedInputs extends Conflict {

    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    readonly inputs: (Expression|Bind|Unparsable)[];

    constructor(func: FunctionType | StructureType, evaluate: Evaluate, inputs: (Expression|Bind|Unparsable)[]) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.inputs = inputs;
    }

    getConflictingNodes() {
        return this.inputs;
    }

    getExplanations() { 
        return {
            eng: `This evaluation of ${this.evaluate.func.toWordplay()} has too many inputs.`
        }
    }

}
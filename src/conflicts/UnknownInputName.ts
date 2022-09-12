import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import type { Input } from "../nodes/FunctionType";
import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";


export class UnknownInputName extends Conflict {
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    readonly input: Input;
    readonly bind: Bind;
    
    constructor(func: FunctionType | StructureType, evaluate: Evaluate, input: Input, bind: Bind) {
        super(false);

        this.func = func;
        this.evaluate = evaluate;
        this.input = input;
        this.bind = bind;

    }

    getConflictingNodes() {
        return this.bind.names;
    }

    getExplanations() { 
        return {
            eng: `These names don't match any of the names in this function's inputs.`
        }
    }

}

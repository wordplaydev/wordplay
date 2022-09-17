import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";


export class RedundantNamedInput extends Conflict {

    readonly func: FunctionType | StructureType;
    readonly bind: Bind;
    readonly evaluate: Evaluate;
    readonly input: Bind;

    constructor(func: FunctionType | StructureType, bind: Bind, evaluate: Evaluate, input: Bind) {
        super(false);
        this.func = func;
        this.bind = bind;
        this.evaluate = evaluate;
        this.input = input;
    }

    getConflictingNodes() {
        return this.bind.names;
    }

    getExplanations() { 
        return {
            eng: `This name was already given.`
        }
    }

}
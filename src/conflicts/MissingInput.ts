import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";


export class MissingInput extends Conflict {
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    readonly input: Bind;

    constructor(func: FunctionType | StructureType, evaluate: Evaluate, input: Bind) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.input = input;
    }

    getConflictingNodes() {
        return [ ...this.input.names, this.evaluate ];
    }

    getExplanations() { 
        return {
            eng: `Expected an input ${this.input.names.map(a => a.getName()).join(", ")}, but it wasn't provided.`
        }
    }

}

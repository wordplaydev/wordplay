import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import type { Input } from "../nodes/FunctionType";
import Conflict from "./Conflict";


export class MissingInput extends Conflict {
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    readonly input: Input;

    constructor(func: FunctionType | StructureType, evaluate: Evaluate, input: Input) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.input = input;
    }

    getConflictingNodes() {
        return [ ...this.input.aliases, this.evaluate ];
    }

    getExplanations() { 
        return {
            eng: `Expected an input ${this.input.aliases.map(a => a.getName()).join(", ")}, but it wasn't provided.`
        }
    }

}

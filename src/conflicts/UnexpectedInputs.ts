import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import Conflict from "./Conflict";


export class UnexpectedInputs extends Conflict {
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    constructor(func: FunctionType | StructureType, evaluate: Evaluate) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
    }
}

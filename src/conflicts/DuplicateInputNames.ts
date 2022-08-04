import type StructureDefinition from "../nodes/StructureDefinition";
import type { default as Func } from "../nodes/FunctionDefinition";
import Conflict from "./Conflict";


export class DuplicateInputNames extends Conflict {
    readonly func: StructureDefinition | Func;
    constructor(func: StructureDefinition | Func) {
        super(false);
        this.func = func;
    }
}

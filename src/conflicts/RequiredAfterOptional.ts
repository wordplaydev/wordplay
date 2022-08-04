import type StructureDefinition from "../nodes/StructureDefinition";
import type { default as Func } from "../nodes/FunctionDefinition";
import Conflict from "./Conflict";


export class RequiredAfterOptional extends Conflict {
    readonly func: Func | StructureDefinition;
    constructor(func: Func | StructureDefinition) {
        super(false);
        this.func = func;
    }
}

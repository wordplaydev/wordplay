import type StructureDefinition from "../nodes/StructureDefinition";
import type { default as Func } from "../nodes/FunctionDefinition";
import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";


export class VariableLengthArgumentMustBeLast extends Conflict {

    readonly func: Func | StructureDefinition;
    readonly bind: Bind;

    constructor(func: Func | StructureDefinition, rest: Bind) {
        super(false);

        this.func = func;
        this.bind = rest;
    }

    getConflictingNodes() {
        return [ this.bind ];
    }

    getExplanations() { 
        return {
            eng: `Variable length inputs must be last.`
        }
    }

}

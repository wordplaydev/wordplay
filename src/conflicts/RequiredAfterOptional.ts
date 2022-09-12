import type StructureDefinition from "../nodes/StructureDefinition";
import type { default as Func } from "../nodes/FunctionDefinition";
import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";


export class RequiredAfterOptional extends Conflict {
    readonly func: Func | StructureDefinition;
    readonly bind: Bind;

    constructor(func: Func | StructureDefinition, bind: Bind) {
        super(false);
        
        this.func = func;
        this.bind = bind;
    }

    getConflictingNodes() {
        return [ this.bind ]
    }

    getExplanations() { 
        return {
            eng: `Required inputs can't come after optional ones.`
        }
    }

}

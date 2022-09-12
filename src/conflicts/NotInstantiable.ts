import type Evaluate from "../nodes/Evaluate";
import type StructureDefinition from "../nodes/StructureDefinition";
import Conflict from "./Conflict";


export class NotInstantiable extends Conflict {
    readonly evaluate: Evaluate;
    readonly definition: StructureDefinition;
    
    constructor(evaluate: Evaluate, definition: StructureDefinition) {
        super(false);

        this.evaluate = evaluate;
        this.definition = definition;
    }

    getConflictingNodes() {
        return [ this.evaluate.func ];
    }

    getExplanations() { 
        return {
            eng: `Can't make a structure that has undefined functions.`
        }
    }

}

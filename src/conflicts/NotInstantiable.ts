import type Evaluate from "../nodes/Evaluate";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type StructureDefinition from "../nodes/StructureDefinition";
import Conflict from "./Conflict";


export class NotInstantiable extends Conflict {
    readonly evaluate: Evaluate;
    readonly definition: StructureDefinition;
    readonly abstractFunctions: FunctionDefinition[];
    
    constructor(evaluate: Evaluate, definition: StructureDefinition, abstractFunctions: FunctionDefinition[]) {
        super(false);

        this.evaluate = evaluate;
        this.definition = definition;
        this.abstractFunctions = abstractFunctions;
    }

    getConflictingNodes() {
        return [ this.evaluate.func, ... this.abstractFunctions.map(f => f.expression) ];
    }

    getExplanations() { 
        return {
            eng: `Can't make a structure that has undefined functions.`
        }
    }

}

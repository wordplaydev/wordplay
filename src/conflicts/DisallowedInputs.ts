import type StructureDefinition from "../nodes/StructureDefinition";
import Conflict from "./Conflict";


export class DisallowedInputs extends Conflict {
    readonly structure: StructureDefinition;
    
    constructor(structure: StructureDefinition) {
        super(false);
        this.structure = structure;
    }

    getConflictingNodes() {
        return { primary: this.structure.aliases, secondary: this.structure.inputs };
    }

    getExplanations() { 
        return {
            eng: `Structures that don't implement some functions can't have inputs.`
        }
    }

}
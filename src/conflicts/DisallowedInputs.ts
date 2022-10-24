import type StructureDefinition from "../nodes/StructureDefinition";
import type Translations from "../nodes/Translations";
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

    getExplanations(): Translations { 
        return {
            eng: `Interfaces can't have inputs.`,
            "😀": "TODO: … → 🚫 ()"
        }
    }

}
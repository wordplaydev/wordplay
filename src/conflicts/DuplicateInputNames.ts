import type StructureDefinition from "../nodes/StructureDefinition";
import type { default as Func } from "../nodes/FunctionDefinition";
import Conflict, { type ConflictExplanations } from "./Conflict";
import type Alias from "../nodes/Alias";

export class DuplicateInputNames extends Conflict {
    
    readonly func: StructureDefinition | Func;
    readonly duplicates: Map<string, Alias[]>;
    
    constructor(func: StructureDefinition | Func, duplicates: Map<string, Alias[]>) {
    
        super(false);
    
        this.func = func;
        this.duplicates = duplicates;
    
    }

    getConflictingNodes() {
        return Array.from(this.duplicates.values()).flat();
    }

    getExplanations(): ConflictExplanations { 
        return {
            eng: `Duplicate input names ${[... new Set(Array.from(this.duplicates.values()).flat().map(lang => lang.getName()))]}.`
        }
    }

}
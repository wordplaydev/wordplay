import Conflict, { type ConflictExplanations } from "./Conflict";
import type Alias from "../nodes/Alias";

export default class DuplicateAliases extends Conflict {

    readonly duplicates: Map<string, Alias[]>;

    constructor(duplicates: Map<string, Alias[]>) {

        super(true);

        this.duplicates = duplicates;

    }

    getConflictingNodes() {
        return Array.from(this.duplicates.values()).flat();
    }

    getExplanations(): ConflictExplanations { 
        return {
            eng: `Duplicate aliases ${[... new Set(Array.from(this.duplicates.values()).flat().map(lang => lang.getName()))]}.`
        }
    }

}
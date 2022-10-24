import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";
import type Alias from "../nodes/Alias";

export default class DuplicateAliases extends Conflict {

    readonly duplicates: Map<string, Alias[]>;

    constructor(duplicates: Map<string, Alias[]>) {

        super(true);

        this.duplicates = duplicates;

    }

    getConflictingNodes() {
        return { primary: Array.from(this.duplicates.values()).flat() };
    }

    getExplanations(): Translations { 
        const duplicates = [... new Set(Array.from(this.duplicates.values()).flat().map(lang => lang.getName()))];
        return {
            eng: `Duplicate aliases ${duplicates.join(", ")}.`,
            "😀": `TODO: ${duplicates.join(", ")}`
        }
    }

}
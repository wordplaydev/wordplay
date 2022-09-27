import type Documentation from "../nodes/Documentation";
import type Language from "../nodes/Language";
import Conflict from "./Conflict";
import type Explanations from "../nodes/Explanations";

export default class DuplicateLanguages extends Conflict {

    readonly docs: Documentation[];
    readonly duplicates: Map<string, Language[]>;

    constructor(docs: Documentation[], duplicates: Map<string, Language[]>) {

        super(false);

        this.docs = docs;
        this.duplicates = duplicates;

    }

    getConflictingNodes() {
        return { primary: Array.from(this.duplicates.values()).flat() };
    }

    getExplanations(): Explanations { 
        return {
            eng: `Duplicate languages ${Array.from(this.duplicates.values()).flat().map(lang => lang.getLanguage())}.`
        }
    }

}
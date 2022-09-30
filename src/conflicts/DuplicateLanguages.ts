import type Documentation from "../nodes/Documentation";
import type Language from "../nodes/Language";
import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";

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

    getExplanations(): Translations { 
        return {
            eng: `Duplicate languages ${Array.from(this.duplicates.values()).flat().map(lang => lang.getLanguage())}.`
        }
    }

}
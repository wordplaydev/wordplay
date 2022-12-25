import type Language from "../nodes/Language";
import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations";
import type Docs from "../nodes/Docs";
import type Names from "../nodes/Names";

export default class DuplicateLanguages extends Conflict {

    readonly tagged: Docs | Names;
    readonly duplicates: Language[];

    constructor(tagged: Docs | Names, duplicates: Language[]) {

        super(false);

        this.tagged = tagged;
        this.duplicates = duplicates;

    }

    getConflictingNodes() {
        return { primary: this.duplicates[0], secondary: this.duplicates.slice(1) };
    }

    getPrimaryExplanation(): Translations { 
        const dupes = this.duplicates.map(dupe => dupe ?? this.tagged).join(", ");
        return {
            eng: `Duplicate languages ${dupes}.`,
            "😀": `${TRANSLATE} ${dupes}`
        }
    }

}
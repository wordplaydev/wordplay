import Conflict from "./Conflict";
import type TypeVariable from "../nodes/TypeVariable";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"


export default class DuplicateTypeVariables extends Conflict {

    readonly duplicates: TypeVariable[];

    constructor(duplicates: TypeVariable[]) {

        super(false);

        this.duplicates = duplicates;

    }

    getConflictingNodes() {
        return { primary: this.duplicates };
    }

    getExplanations(): Translations { 
        return {
            eng: `Duplicate type variables ${this.duplicates.map(dupe => dupe.toWordplay())}.`,
            "😀": TRANSLATE
        }
    }
}

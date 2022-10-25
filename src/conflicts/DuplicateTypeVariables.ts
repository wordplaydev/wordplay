import Conflict from "./Conflict";
import type TypeVariable from "../nodes/TypeVariable";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"


export default class DuplicateTypeVariables extends Conflict {

    readonly duplicates: Map<string, TypeVariable[]>;

    constructor(duplicates: Map<string, TypeVariable[]>) {

        super(false);

        this.duplicates = duplicates;

    }

    getConflictingNodes() {
        return { primary: Array.from(this.duplicates.values()).flat() };
    }

    getExplanations(): Translations { 
        return {
            eng: `Duplicate type variables ${Array.from(this.duplicates.values()).flat().map(lang => lang.toWordplay())}.`,
            "😀": TRANSLATE
        }
    }
}

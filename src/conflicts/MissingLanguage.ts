import type Language from "../nodes/Language";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export default class MissingLanguage extends Conflict {
    readonly language: Language;

    constructor(language: Language) {
        super(false);
        this.language = language;
    }

    getConflictingNodes() {
        return { primary: [ this.language.slash ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Languages require a language code.`
        }
    }

}

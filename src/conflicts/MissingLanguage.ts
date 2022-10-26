import type Language from "../nodes/Language";
import type Token from "../nodes/Token";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export default class MissingLanguage extends Conflict {
    readonly language: Language;
    readonly slash: Token;

    constructor(language: Language, slash: Token) {
        super(false);
        this.language = language;
        this.slash = slash;
    }

    getConflictingNodes() {
        return { primary: [ this.slash ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Languages require a language code.`
        }
    }

}

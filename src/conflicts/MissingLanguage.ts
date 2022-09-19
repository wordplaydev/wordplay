import type Language from "../nodes/Language";
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

    getExplanations() { 
        return {
            eng: `Languages require a language code.`
        }
    }

}

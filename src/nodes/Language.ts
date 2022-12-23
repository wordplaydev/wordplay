import MissingLanguage from "../conflicts/MissingLanguage";
import Node from "./Node";
import Token from "./Token";
import NameToken from "./NameToken";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import LanguageToken from "./LanguageToken";
import type LanguageCode from "./LanguageCode";
import type Conflict from "../conflicts/Conflict";
import { Languages } from "./LanguageCode";
import InvalidLanguage from "../conflicts/InvalidLanguage";

export default class Language extends Node {
    
    readonly slash: Token;
    readonly lang?: Token;

    constructor(slash: Token, lang?: Token) {
        super();

        this.slash = slash;
        this.lang = lang;

        this.computeChildren();

    }

    static make(lang: string) {
        return new Language(new LanguageToken(), new NameToken(lang));
    }

    getGrammar() { 
        return [
            { name: "slash", types:[ Token ] },
            { name: "lang", types:[ Token, undefined ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new Language(
            this.replaceChild("slash", this.slash, original, replacement),
            this.replaceChild("lang", this.lang, original, replacement)
        ) as this; 
    }

    computeConflicts(): Conflict[] {

        const conflicts: Conflict[] = [];

        if(this.lang === undefined) {
            if(this.slash !== undefined)
                conflicts.push(new MissingLanguage(this, this.slash));
        }
        else {
            if(!(this.lang.getText() in Languages))
                conflicts.push(new InvalidLanguage(this, this.lang));
        }
    
        return conflicts;
    }

    getLanguage() { return this.lang instanceof Token ? this.lang.text.toString() : ""; }
    getLanguageCode() { return this.getLanguage() as LanguageCode }

    equals(lang: Language) {
        return this.getLanguage() === lang.getLanguage();
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "a language"
        }
    }

}
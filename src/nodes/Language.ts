import MissingLanguage from "../conflicts/MissingLanguage";
import type Context from "./Context";
import Node from "./Node";
import Token from "./Token";
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import Add from "../transforms/Add";
import NameToken from "./NameToken";
import Remove from "../transforms/Remove";
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

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 

        const project = context.project;
        if(child === this.lang && project !== undefined)
            return getPossibleLanguages(project).map(l => new Replace(context, this.lang as Token, new NameToken(l)))

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context, position: number): Transform[] | undefined { 

        const project = context.project;
        if(this.lang === undefined && project !== undefined)
            return getPossibleLanguages(project).map(l => new Add(context, position, this, "lang", new NameToken(l)));

     }

     getChildRemoval(child: Node, context: Context): Transform | undefined {
         if(child === this.lang) return new Remove(context, this, child);
     }
}
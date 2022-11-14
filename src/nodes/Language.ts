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

export default class Language extends Node {
    
    readonly slash?: Token;
    readonly lang?: Token;

    constructor(lang?: Token | string, slash?: Token) {
        super();

        this.slash = lang instanceof Token ? slash : new LanguageToken();
        this.lang = typeof lang === "string" ? new NameToken(lang) : lang;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "slash", types:[ Token, undefined ] },
            { name: "lang", types:[ Token, undefined ] },
        ];
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Language(
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "lang", this.lang, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "slash", this.slash, original, replacement)
        ) as this; 
    }

    computeConflicts() {
        if(this.lang === undefined && this.slash !== undefined)
            return [ new MissingLanguage(this, this.slash) ];
        
        return [];
    }

    getLanguage() { return this.lang instanceof Token ? this.lang.text.toString() : undefined; }

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

        const project = context.source.getProject();
        if(child === this.lang && project !== undefined)
            return getPossibleLanguages(project).map(l => new Replace(context.source, this.lang as Token, new NameToken(l)))

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context, position: number) { 

        const project = context.source.getProject();
        if(this.lang === undefined && project !== undefined)
            return getPossibleLanguages(project).map(l => new Add(context.source, position, this, "lang", new NameToken(l)));

     }

     getChildRemoval(child: Node, context: Context): Transform | undefined {
         if(child === this.lang) return new Remove(context.source, this, child);
     }
}
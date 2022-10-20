import MissingLanguage from "../conflicts/MissingLanguage";
import type Context from "./Context";
import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import Add from "../transforms/Add";
import LanguageToken from "./LanguageToken";

export default class Language extends Node {
    
    readonly slash: Token;
    readonly lang?: Token;

    constructor(lang?: Token | string, slash?: Token) {
        super();

        this.slash = slash ?? new LanguageToken();
        this.lang = typeof lang === "string" ? new Token(lang, TokenType.NAME) : lang;
    }

    clone(original?: Node | string, replacement?: Node) { 
        return new Language(
            this.cloneOrReplaceChild([ Token, undefined ], "lang", this.lang, original, replacement), 
            this.cloneOrReplaceChild([ Token ], "slash", this.slash, original, replacement)
        ) as this; 
    }

    computeChildren() {  return this.lang === undefined ? [ this.slash ] : [ this.slash, this.lang ]; }

    computeConflicts() {
        if(this.lang === undefined)
            return [ new MissingLanguage(this) ];
        
        return [];
    }

    getLanguage() { return this.lang instanceof Token ? this.lang.text.toString() : undefined; }

    equals(lang: Language) {
        return this.getLanguage() === lang.getLanguage();
    }

    getDescriptions() {
        return {
            eng: "a language"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined { 

        const project = context.source.getProject();
        if(child === this.lang && project !== undefined)
            return getPossibleLanguages(project).map(l => new Replace(context.source, this.lang as Token, new Token(l, TokenType.NAME)))

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context, position: number) { 

        const project = context.source.getProject();
        if(this.lang === undefined && project !== undefined)
            return getPossibleLanguages(project).map(l => new Add(context.source, position, this, "lang", new Token(l, TokenType.NAME)));

     }
}
import MissingLanguage from "../conflicts/MissingLanguage";
import Node, { type ConflictContext } from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";

export default class Language extends Node {
    
    readonly slash: Token;
    readonly lang?: Token;

    constructor(lang?: Token | string, slash?: Token) {
        super();

        this.slash = slash ?? new Token("/", [ TokenType.LANGUAGE ]);
        this.lang = typeof lang === "string" ? new Token(lang, [ TokenType.NAME ]) : lang;
    }

    computeChildren() {  return this.lang === undefined ? [ this.slash ] : [ this.slash, this.lang ]; }

    computeConflicts(context: ConflictContext) {
        if(this.lang === undefined)
            return [ new MissingLanguage(this) ];
        
        return [];
    }

    getLanguage() { return this.lang instanceof Token ? this.lang.text.toString() : undefined; }

    isCompatible(lang: Language) {
        return this.getLanguage() === lang.getLanguage();
    }

    clone(original?: Node, replacement?: Node) { 
        return new Language(
            this.lang?.cloneOrReplace([ Token, undefined ], original, replacement), 
            this.slash.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }
}
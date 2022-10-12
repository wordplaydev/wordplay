import MissingLanguage from "../conflicts/MissingLanguage";
import { LANGUAGE_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import { getPossibleLanguages } from "./getPossibleLanguages";

export default class Language extends Node {
    
    readonly slash: Token;
    readonly lang?: Token;

    constructor(lang?: Token | string, slash?: Token) {
        super();

        this.slash = slash ?? new Token(LANGUAGE_SYMBOL, [ TokenType.LANGUAGE ]);
        this.lang = typeof lang === "string" ? new Token(lang, [ TokenType.NAME ]) : lang;
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

    clone(original?: Node, replacement?: Node) { 
        return new Language(
            this.lang?.cloneOrReplace([ Token, undefined ], original, replacement), 
            this.slash.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A language"
        }
    }

    getChildReplacements(child: Node, context: Context): Node[] {

        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(child === this.lang && project !== undefined)
            return getPossibleLanguages(project).map(l => new Token(l, [ TokenType.NAME ]))
        else return [];

    }

}
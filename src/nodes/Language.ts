import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Unparsable from "./Unparsable";

export default class Language extends Node {
    
    readonly slash: Token;
    readonly lang: Token | Unparsable;

    constructor(lang: Token | Unparsable | string, slash?: Token) {
        super();

        this.slash = slash ?? new Token("/", [ TokenType.LANGUAGE ]);
        this.lang = typeof lang === "string" ? new Token(lang, [ TokenType.NAME ]) : lang;
    }

    computeChildren() {  return [ this.slash, this.lang ]; }

    getLanguage() { return this.lang instanceof Token ? this.lang.text.toString() : undefined; }

    isCompatible(lang: Language) {
        return this.getLanguage() === lang.getLanguage();
    }
}
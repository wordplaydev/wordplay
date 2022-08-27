import type Conflict from "../conflicts/Conflict";
import Node, { type ConflictContext } from "./Node";
import Token, { TokenType } from "./Token";

export default class Language extends Node {
    
    readonly slash: Token;
    readonly lang: Token;

    constructor(lang: Token | string, slash?: Token) {
        super();

        this.slash = slash ?? new Token("/", [ TokenType.LANGUAGE ]);
        this.lang = typeof lang === "string" ? new Token(lang, [ TokenType.NAME ]) : lang;
    }

    getChildren() {  return [ this.slash, this.lang ]; }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    getLanguage() { return this.lang instanceof Token ? this.lang.text : this.lang; }

    isCompatible(lang: Language) {
        return this.getLanguage() === lang.getLanguage();
    }
}
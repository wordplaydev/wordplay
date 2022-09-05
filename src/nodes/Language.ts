import type Conflict from "../conflicts/Conflict";
import Node, { type ConflictContext } from "./Node";
import Token, { TokenType } from "./Token";
import type Unparsable from "./Unparsable";

export default class Language extends Node {
    
    readonly slash: Token;
    readonly lang: Token | Unparsable;

    constructor(lang: Token | Unparsable | string, slash?: Token) {
        super();

        this.slash = slash ?? new Token("/", [ TokenType.LANGUAGE ]);
        this.lang = typeof lang === "string" ? new Token(lang, [ TokenType.NAME ]) : lang;
    }

    getChildren() {  return [ this.slash, this.lang ]; }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    getLanguage() { return this.lang instanceof Token ? this.lang.text : undefined; }

    isCompatible(lang: Language) {
        return this.getLanguage() === lang.getLanguage();
    }
}
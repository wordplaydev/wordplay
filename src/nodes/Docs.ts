import type Conflict from "../conflicts/Conflict";
import type Language from "./Language";
import Node, { type ConflictContext } from "./Node";
import type Token from "./Token";

export default class Docs extends Node {
    
    readonly docs: Token;
    readonly lang?: Language;

    constructor(docs: Token, lang?: Language) {
        super();

        this.docs = docs;
        this.lang = lang;
    }

    getChildren() { return this.lang === undefined ? [ this.docs ] : [ this.docs, this.lang ]}

    getLanguage() { return this.lang === undefined ? undefined : this.lang.getLanguage(); }
    
    getConflicts(context: ConflictContext): Conflict[] { return []; }

}
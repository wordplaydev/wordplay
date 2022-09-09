import type Language from "./Language";
import Node from "./Node";
import type Token from "./Token";

export default class Docs extends Node {
    
    readonly docs: Token;
    readonly lang?: Language;

    constructor(docs: Token, lang?: Language) {
        super();

        this.docs = docs;
        this.lang = lang;
    }

    computeChildren() { return this.lang === undefined ? [ this.docs ] : [ this.docs, this.lang ]}

    getLanguage() { return this.lang === undefined ? undefined : this.lang.getLanguage(); }
    
}
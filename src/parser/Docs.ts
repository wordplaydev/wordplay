import Node from "./Node";
import type { Token } from "./Token";

export default class Docs extends Node {
    
    readonly docs: Token;
    readonly lang?: Token;

    constructor(docs: Token, lang?: Token) {
        super();

        this.docs = docs;
        this.lang = lang;
    }

    getChildren() { return this.lang === undefined ? [ this.docs ] : [ this.docs, this.lang ]}
 
}
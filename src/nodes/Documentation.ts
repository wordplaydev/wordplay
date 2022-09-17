import Language from "./Language";
import Node from "./Node";
import Token from "./Token";

export default class Documentation extends Node {
    
    readonly docs: Token;
    readonly lang?: Language;

    constructor(docs: Token, lang?: Language) {
        super();

        this.docs = docs;
        this.lang = lang;
    }

    computeChildren() { return this.lang === undefined ? [ this.docs ] : [ this.docs, this.lang ]}

    getLanguage() { return this.lang === undefined ? undefined : this.lang.getLanguage(); }
    
    computeConflicts() {}

    clone(original?: Node, replacement?: Node) { 
        return new Documentation(
            this.docs.cloneOrReplace([ Token ], original, replacement), 
            this.lang?.cloneOrReplace([ Language, undefined ], original, replacement)
        ) as this; 
    }

}
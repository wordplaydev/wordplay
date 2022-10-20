import { DOCS_SYMBOL } from "../parser/Tokenizer";
import Add from "../transforms/Add";
import Replace from "../transforms/Replace";
import type Context from "./Context";
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import Language from "./Language";
import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";

export default class Documentation extends Node {
    
    readonly docs: Token;
    readonly lang?: Language;

    constructor(docs?: Token, lang?: Language) {
        super();

        this.docs = docs ?? new Token(`${DOCS_SYMBOL}${DOCS_SYMBOL}\n`, TokenType.DOCS);
        this.lang = lang;
    }

    computeChildren() { return this.lang === undefined ? [ this.docs ] : [ this.docs, this.lang ]}

    getLanguage() { return this.lang === undefined ? undefined : this.lang.getLanguage(); }
    
    computeConflicts() {}

    clone(original?: Node | string, replacement?: Node) { 
        return new Documentation(
            this.cloneOrReplaceChild([ Token ], "docs", this.docs, original, replacement), 
            this.cloneOrReplaceChild([ Language, undefined ], "lang", this.lang, original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "Documentation"
        }
    }

    getReplacementChild(child: Node, context: Context) {

        const project = context.source.getProject();
        if(project !== undefined && child === this.lang)
            return getPossibleLanguages(project).map(l => new Replace(context.source, child, new Language(l)));
            
        return [];

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context, position: number) { 

        const project = context.source.getProject();
        if(project !== undefined && this.lang === undefined)
            return getPossibleLanguages(project).map(l => new Add(context.source, position, this, "lang", new Language(l)));

    }

}
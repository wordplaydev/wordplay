import { DOCS_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import { getPossibleLanguages } from "./getPossibleLanguages";
import Language from "./Language";
import Node, { Position } from "./Node";
import type Transform from "./Replacement"
import Token from "./Token";
import TokenType from "./TokenType";

export default class Documentation extends Node {
    
    readonly docs: Token;
    readonly lang?: Language;

    constructor(docs?: Token, lang?: Language) {
        super();

        this.docs = docs ?? new Token(`${DOCS_SYMBOL}${DOCS_SYMBOL}\n`, [ TokenType.DOCS ]);
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

    getDescriptions() {
        return {
            eng: "Documentation"
        }
    }

    getChildReplacements(child: Node, context: Context, position: Position): Transform[] {

        const project = context.source.getProject();
        if(project !== undefined && ((child === this.lang && position === Position.ON) || (this.lang === undefined && position === Position.END)))
            return getPossibleLanguages(project).map(l => new Language(l));
        
        return [];

    }

}
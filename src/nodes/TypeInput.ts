import { TYPE_SYMBOL } from "../parser/Tokenizer";
import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";

export default class TypeInput extends Node {

    readonly dot: Token;
    readonly type: Type | Unparsable;

    constructor(type: Type | Unparsable, dot?: Token) {
        super();

        this.dot = dot ?? new Token(TYPE_SYMBOL, [ TokenType.TYPE ]);
        this.type = type;
    }

    clone(original?: Node | string, replacement?: Node) { 
        return new TypeInput(
            this.cloneOrReplaceChild([ Type, Unparsable ], "type", this.type, original, replacement),
            this.cloneOrReplaceChild([ Token ], "dot", this.dot, original, replacement)
        ) as this; 
    }

    computeChildren() {
        return [ this.dot, this.type ];
    }

    computeConflicts() {}

    getDescriptions() {
        return {
            eng: "A type input"
        }
    }
    
    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}
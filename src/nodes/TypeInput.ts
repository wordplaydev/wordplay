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

    computeChildren() {
        return [ this.dot, this.type ];
    }

    clone(original?: Node, replacement?: Node) { 
        return new TypeInput(
            this.type.cloneOrReplace([ Type, Unparsable ], original, replacement),
            this.dot.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    getDescriptions() {
        return {
            eng: "A type input"
        }
    }
    
}
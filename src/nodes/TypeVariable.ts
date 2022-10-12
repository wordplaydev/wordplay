import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import { TYPE_VAR_SYMBOL } from "../parser/Tokenizer";

export default class TypeVariable extends Node {

    readonly type: Token;
    readonly name: Token;

    constructor(name: Token | string, type?: Token) {
        super();

        this.type = type ?? new Token(TYPE_VAR_SYMBOL, [ TokenType.TYPE_VAR ]);
        this.name = name instanceof Token ? name : new Token(name, [ TokenType.NAME ]);
    }

    getName() { return this.name.getText(); }
    getNames() { return [ this.name.getText() ]; }
    hasName(name: string) { return this.getName() === name; }

    computeConflicts() {}

    computeChildren() {
        return [ this.type, this.name ];
    }

    clone(original?: Node, replacement?: Node) { 
        return new TypeVariable(
            this.name.cloneOrReplace([ Token ], original, replacement), 
            this.type.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A variable type"
        }
    }

}
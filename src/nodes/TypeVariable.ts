import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";

export default class TypeVariable extends Node {

    readonly type: Token;
    readonly name: Token;

    constructor(name: Token | string, type?: Token) {
        super();

        this.type = type ?? new Token("*", [ TokenType.TYPE_VAR ]);
        this.name = name instanceof Token ? name : new Token(name, [ TokenType.NAME ]);
    }

    computeChildren() {
        return [ this.type, this.name ];
    }

    clone(original?: Node, replacement?: Node) { 
        return new TypeVariable(
            this.name.cloneOrReplace([ Token ], original, replacement), 
            this.type.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

}
import type Conflict from "../conflicts/Conflict";
import Placeholder from "../conflicts/Placeholder";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";

export default class TypePlaceholder extends Type {

    readonly etc: Token;

    constructor(etc?: Token) {
        super();

        this.etc = etc ?? new Token(PLACEHOLDER_SYMBOL, [ TokenType.PLACEHOLDER ]);
    }

    computeChildren() {
        return [ this.etc ];
    }

    computeConflicts(): Conflict[] { return [ new Placeholder(this) ]; }

    accepts(): boolean { return false; }

    getNativeTypeName(): string { return "type_placeholder"; }

    clone(original?: Node, replacement?: Node) { 
        return new TypePlaceholder(
            this.etc.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A type placeholder"
        }
    }

}
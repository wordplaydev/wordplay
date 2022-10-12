import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import TokenType from "./TokenType";
import { BOOLEAN_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { BOOLEAN_TYPE_SYMBOL } from "../parser/Tokenizer";
import NativeType from "./NativeType";

export default class BooleanType extends NativeType {

    readonly type: Token;

    constructor(type?: Token) {
        super();

        this.type = type ?? new Token(BOOLEAN_TYPE_SYMBOL, [ TokenType.BOOLEAN_TYPE ]);
    }

    computeChildren() { return [ this.type ]; }
    computeConflicts() {}

    accepts(type: Type) { return type instanceof BooleanType; }

    getNativeTypeName(): string { return BOOLEAN_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { return new BooleanType(this.type.cloneOrReplace([ Token ], original, replacement)) as this; }

    getDescriptions() {
        return {
            eng: "A boolean type"
        }
    }

}
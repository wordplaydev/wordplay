import Token from "./Token";
import Type from "./Type";
import type Context from "./Context";
import type Node from "./Node";
import TokenType from "./TokenType";
import AnyType from "./AnyType";
import { BOOLEAN_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { BOOLEAN_TYPE_SYMBOL } from "../parser/Tokenizer";

export default class BooleanType extends Type {

    readonly type: Token;

    constructor(type?: Token) {
        super();

        this.type = type ?? new Token(BOOLEAN_TYPE_SYMBOL, [ TokenType.BOOLEAN_TYPE ]);
    }

    computeChildren() { return [ this.type ]; }
    computeConflicts() {}

    isCompatible(type: Type) { return type instanceof AnyType || type instanceof BooleanType; }

    getNativeTypeName(): string { return BOOLEAN_NATIVE_TYPE_NAME; }

    getDefinition(context: Context, node: Node, name: string) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(context, node, name); 
    }

    clone(original?: Node, replacement?: Node) { return new BooleanType(this.type.cloneOrReplace([ Token ], original, replacement)) as this; }

}
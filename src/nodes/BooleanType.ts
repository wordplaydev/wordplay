import Token from "./Token";
import Type from "./Type";
import type Context from "./Context";
import type Node from "./Node";
import TokenType from "./TokenType";
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

    accepts(type: Type) { return type instanceof BooleanType; }

    getNativeTypeName(): string { return BOOLEAN_NATIVE_TYPE_NAME; }

    getDefinition(name: string, context: Context, node: Node) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(name, context, node); 
    }

    clone(original?: Node, replacement?: Node) { return new BooleanType(this.type.cloneOrReplace([ Token ], original, replacement)) as this; }

    getDescriptions() {
        return {
            eng: "A boolean type"
        }
    }

}
import Token from "./Token";
import Type from "./Type";
import type { ConflictContext } from "./Node";
import type Node from "./Node";
import TokenType from "./TokenType";
import AnyType from "./AnyType";

export default class BooleanType extends Type {

    readonly type: Token;

    constructor(type?: Token) {
        super();

        this.type = type ?? new Token("?", [ TokenType.BOOLEAN_TYPE ]);
    }

    computeChildren() {
        return [ this.type ];
    }

    isCompatible(context: ConflictContext, type: Type) { return type instanceof AnyType || type instanceof BooleanType; }

    getNativeTypeName(): string { return "boolean"; }

    getDefinition(context: ConflictContext, node: Node, name: string) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(context, node, name); 
    }

    clone(original?: Node, replacement?: Node) { return new BooleanType(this.type.cloneOrReplace([ Token ], original, replacement)) as this; }

}
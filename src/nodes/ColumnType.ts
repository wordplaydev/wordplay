import Token from "./Token";
import TokenType from "./TokenType";
import Unparsable from "./Unparsable";
import Bind from "../nodes/Bind";
import type Node from "../nodes/Node";
import Type from "./Type";
import type { ConflictContext } from "./Node";
import AnyType from "./AnyType";

export default class ColumnType extends Type {

    readonly bar: Token;
    readonly bind: Bind | Unparsable;

    constructor(bind: Bind | Unparsable, bar?: Token) {
        super();

        this.bar = bar ?? new Token("|", [ TokenType.TABLE_OPEN ]);
        this.bind = bind;
    }

    computeChildren() {
        return [ this.bar, this.bind ];
    }

    isCompatible(context: ConflictContext, type: Type): boolean {
        if(type instanceof AnyType) return true;
        return type instanceof ColumnType && type.bind instanceof Bind && this.bind instanceof Bind && this.bind.getTypeUnlessCycle(context).isCompatible(context, type.bind.getTypeUnlessCycle(context));
    }

    getNativeTypeName(): string { return "column"; }

    clone(original?: Node, replacement?: Node) { 
        return new ColumnType(
            this.bind.cloneOrReplace([ Bind, Unparsable ], original, replacement),
            this.bar.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

}
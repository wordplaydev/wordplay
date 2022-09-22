import Token from "./Token";
import TokenType from "./TokenType";
import Unparsable from "./Unparsable";
import Bind from "../nodes/Bind";
import type Node from "../nodes/Node";
import Type from "./Type";
import type Context from "./Context";
import AnyType from "./AnyType";
import { COLUMN_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { TABLE_OPEN_SYMBOL } from "../parser/Tokenizer";

export default class ColumnType extends Type {

    readonly bar: Token;
    readonly bind: Bind | Unparsable;

    constructor(bind: Bind | Unparsable, bar?: Token) {
        super();

        this.bar = bar ?? new Token(TABLE_OPEN_SYMBOL, [ TokenType.TABLE_OPEN ]);
        this.bind = bind;
    }

    hasDefault() { return this.bind instanceof Bind && this.bind.hasDefault(); }
    computeChildren() { return [ this.bar, this.bind ]; }
    computeConflicts() {}

    isCompatible(type: Type, context: Context): boolean {
        if(type instanceof AnyType) return true;
        return type instanceof ColumnType && 
            type.bind instanceof Bind && 
            this.bind instanceof Bind && 
            this.bind.getTypeUnlessCycle(context).isCompatible(type.bind.getTypeUnlessCycle(context), context);
    }

    getValueType(context: Context) { return this.bind.getType(context); }

    getNativeTypeName(): string { return COLUMN_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { 
        return new ColumnType(
            this.bind.cloneOrReplace([ Bind, Unparsable ], original, replacement),
            this.bar.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

}
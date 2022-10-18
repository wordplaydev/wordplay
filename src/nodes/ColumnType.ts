import Token from "./Token";
import TokenType from "./TokenType";
import Unparsable from "./Unparsable";
import Bind from "../nodes/Bind";
import type Node from "../nodes/Node";
import Type from "./Type";
import type Context from "./Context";
import { COLUMN_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { TABLE_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Transform from "./Transform";

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

    accepts(type: Type, context: Context): boolean {
        return type instanceof ColumnType && 
            type.bind instanceof Bind && 
            this.bind instanceof Bind && 
            this.bind.getTypeUnlessCycle(context).accepts(type.bind.getTypeUnlessCycle(context), context);
    }

    getValueType(context: Context) { return this.bind.getType(context); }

    getNativeTypeName(): string { return COLUMN_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { 
        return new ColumnType(
            this.bind.cloneOrReplace([ Bind, Unparsable ], original, replacement),
            this.bar.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A table column type"
        }
    }

    getReplacementChild(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }

}
import Token from "./Token";
import TokenType from "./TokenType";
import Unparsable from "./Unparsable";
import Bind from "../nodes/Bind";
import type Node from "../nodes/Node";
import Type from "./Type";
import type Context from "./Context";
import { COLUMN_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { TABLE_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Transform from "../transforms/Transform";

export default class ColumnType extends Type {

    readonly bar: Token;
    readonly bind: Bind | Unparsable;

    constructor(bind: Bind | Unparsable, bar?: Token) {
        super();

        this.bar = bar ?? new Token(TABLE_OPEN_SYMBOL, TokenType.TABLE_OPEN);
        this.bind = bind;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new ColumnType(
            this.cloneOrReplaceChild(pretty, [ Bind, Unparsable ], "bind", this.bind, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "bar", this.bar, original, replacement)
        ) as this; 
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

    getDescriptions() {
        return {
            eng: "A table column type"
        }
    }

    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }
    getChildRemoval(): Transform | undefined { return undefined; }
    
}
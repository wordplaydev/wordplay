import type Conflict from "../conflicts/Conflict";
import Token from "./Token";
import TokenType from "./TokenType";
import type Unparsable from "./Unparsable";
import Bind from "../nodes/Bind";
import Type from "./Type";
import type { ConflictContext } from "./Node";

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
        return type instanceof ColumnType && type.bind instanceof Bind && this.bind instanceof Bind && this.bind.getTypeUnlessCycle(context).isCompatible(context, type.bind.getTypeUnlessCycle(context));
    }

    getNativeTypeName(): string { return "column"; }

}
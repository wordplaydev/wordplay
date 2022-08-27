import type Conflict from "../conflicts/Conflict";
import Token, { TokenType } from "./Token";
import type Unparsable from "./Unparsable";
import Bind from "../nodes/Bind";
import Type from "./Type";
import type { ConflictContext } from "./Node";

export default class ColumnType extends Type {

    readonly bar: Token;
    readonly bind: Bind | Unparsable;

    constructor(bind: Bind | Unparsable, bar?: Token) {
        super();

        this.bar = bar ?? new Token("|", [ TokenType.TABLE ]);
        this.bind = bind;
    }

    getChildren() {
        return [ this.bar, this.bind ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof ColumnType && type.bind instanceof Bind && this.bind instanceof Bind && this.bind.getTypeUnlessCycle(context).isCompatible(context, type.bind.getTypeUnlessCycle(context));
    }

    getNativeTypeName(): string { return "column"; }

}
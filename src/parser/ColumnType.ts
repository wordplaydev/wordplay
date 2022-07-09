import Node from "./Node";
import type Program from "./Program";
import type Conflict from "./Conflict";
import type { Token } from "./Token";
import type Type from "./Type";

export default class ColumnType extends Node {

    readonly bar: Token;
    readonly type: Type;

    constructor(bar: Token, type: Type) {
        super();

        this.bar = bar;
        this.type = type;
    }

    getChildren() {
        return [ this.bar, this.type ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}
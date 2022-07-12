import Node from "./Node";
import type Program from "./Program";
import type Conflict from "./Conflict";
import type { Token } from "./Token";
import type Unparsable from "./Unparsable";
import Bind from "./Bind";
import type Type from "./Type";

export default class ColumnType extends Node {

    readonly bar?: Token;
    readonly bind: Bind | Unparsable;

    constructor(bind: Bind | Unparsable, bar?: Token) {
        super();

        this.bar = bar;
        this.bind = bind;
    }

    getChildren() {
        return this.bar === undefined ? [ this.bind ] : [ this.bar, this.bind ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean {
        return type instanceof ColumnType && type.bind instanceof Bind && this.bind instanceof Bind && this.bind.getType(program).isCompatible(program, type.bind.getType(program));
    }

}
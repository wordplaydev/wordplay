import Node from "./Node";
import type Program from "./Program";
import type Conflict from "./Conflict";
import type { Token } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class ColumnType extends Node {

    readonly bar?: Token;
    readonly type: Type | Unparsable;

    constructor(type: Type | Unparsable, bar?: Token) {
        super();

        this.bar = bar;
        this.type = type;
    }

    getChildren() {
        return this.bar === undefined ? [ this.type ] : [ this.bar, this.type ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean {
        return type instanceof ColumnType && this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(program, type.type);
    }

}
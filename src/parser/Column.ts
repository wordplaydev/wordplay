import Node from "./Node";
import type Bind from "./Bind";
import type { Token } from "./Token";
import Unparsable from "./Unparsable";
import type Program from "./Program";
import type Conflict from "./Conflict";
import UnknownType from "./UnknownType";

export default class Column extends Node {

    readonly bar: Token;
    readonly bind: Bind | Unparsable;

    constructor(bar: Token, bind: Bind | Unparsable) {
        super();

        this.bar = bar;
        this.bind = bind;
    }

    getChildren() {
        return [ this.bar, this.bind ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program) { return this.bind instanceof Unparsable ? new UnknownType(this) : this.bind.getType(program); }

}
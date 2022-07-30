import Node, { type ConflictContext } from "./Node";
import type Bind from "../nodes/Bind";
import type Token from "./Token";
import Unparsable from "./Unparsable";
import type Program from "./Program";
import type Conflict from "../parser/Conflict";
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

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    getType(context: ConflictContext) { return this.bind instanceof Unparsable ? new UnknownType(this) : this.bind.getType(context); }

}
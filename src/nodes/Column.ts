import Node, { type ConflictContext } from "./Node";
import type Bind from "../nodes/Bind";
import type Token from "./Token";
import Unparsable from "./Unparsable";
import type Conflict from "../conflicts/Conflict";
import UnknownType from "./UnknownType";

export default class Column extends Node {

    readonly bar: Token;
    readonly bind: Bind | Unparsable;

    constructor(bar: Token, bind: Bind | Unparsable) {
        super();

        this.bar = bar;
        this.bind = bind;
    }

    computeChildren() {
        return [ this.bar, this.bind ];
    }

    getType(context: ConflictContext) { return this.bind instanceof Unparsable ? new UnknownType(this) : this.bind.getTypeUnlessCycle(context); }

}
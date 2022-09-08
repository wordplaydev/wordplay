import type Bind from "../nodes/Bind";
import type Conflict from "../conflicts/Conflict";
import type Expression from "./Expression";
import Node, { type ConflictContext } from "./Node";
import type Token from "./Token";
import type Unparsable from "./Unparsable";

export default class Cell extends Node {

    readonly bar: Token;
    readonly expression: Expression | Unparsable | Bind;

    constructor(bar: Token, expression: Expression | Unparsable | Bind) {
        super();

        this.bar = bar;
        this.expression = expression;
    }

    computeChildren() {
        return [ this.bar, this.expression ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

}
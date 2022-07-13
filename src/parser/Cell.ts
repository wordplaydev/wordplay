import type Bind from "./Bind";
import type Conflict from "./Conflict";
import type Expression from "./Expression";
import Node from "./Node";
import type Program from "./Program";
import type Token from "./Token";
import type Unparsable from "./Unparsable";

export default class Cell extends Node {

    readonly cell: Token;
    readonly expression: Expression | Unparsable | Bind;

    constructor(bar: Token, expression: Expression | Unparsable | Bind) {
        super();

        this.cell = bar;
        this.expression = expression;
    }

    getChildren() {
        return [ this.cell, this.expression ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}
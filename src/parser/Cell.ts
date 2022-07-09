import type Conflict from "./Conflict";
import type Expression from "./Expression";
import Node from "./Node";
import type Program from "./Program";
import type { Token } from "./Token";

export default class Cell extends Node {

    readonly cell: Token;
    readonly expression: Expression;

    constructor(bar: Token, expression: Expression) {
        super();

        this.cell = bar;
        this.expression = expression;
    }

    getChildren() {
        return [ this.cell, this.expression ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}
import Bind from "../nodes/Bind";
import Expression from "./Expression";
import Node, { type ConflictContext } from "./Node";
import Token from "./Token";
import Unparsable from "./Unparsable";

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

    clone(original?: Node, replacement?: Node) { 
        return new Cell(
            this.bar.cloneOrReplace([ Token ], original, replacement), 
            this.expression.cloneOrReplace([ Expression, Unparsable, Bind], original, replacement)
        ) as this; 
    }

}
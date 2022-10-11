import Bind from "../nodes/Bind";
import type Context from "./Context";
import Expression from "./Expression";
import Node from "./Node";
import Token from "./Token";
import Unparsable from "./Unparsable";

export default class Cell extends Node {

    readonly bar: Token;
    readonly value: Expression | Unparsable | Bind;

    constructor(bar: Token, expression: Expression | Unparsable | Bind) {
        super();

        this.bar = bar;
        this.value = expression;
    }

    computeChildren() {
        return [ this.bar, this.value ];
    }
    computeConflicts() {}

    clone(original?: Node, replacement?: Node) { 
        return new Cell(
            this.bar.cloneOrReplace([ Token ], original, replacement), 
            this.value.cloneOrReplace([ Expression, Unparsable, Bind], original, replacement)
        ) as this; 
    }

    getType(context: Context) {
        return this.value.getType(context);
    }

    getDescriptions() {
        return {
            eng: "A table cell"
        }
    }

}
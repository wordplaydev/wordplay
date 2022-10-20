import Bind from "../nodes/Bind";
import type Context from "./Context";
import Expression from "./Expression";
import Node from "./Node";
import Token from "./Token";
import type Transform from "../transforms/Transform";
import Unparsable from "./Unparsable";

export default class Cell extends Node {

    readonly bar: Token;
    readonly value: Expression | Unparsable | Bind;

    constructor(bar: Token, expression: Expression | Unparsable | Bind) {
        super();

        this.bar = bar;
        this.value = expression;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Cell(
            this.cloneOrReplaceChild(pretty, [ Token ], "bar", this.bar, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable, Bind ], "value", this.value, original, replacement)
        ) as this; 
    }

    computeChildren() {
        return [ this.bar, this.value ];
    }
    computeConflicts() {}

    getType(context: Context) {
        return this.value.getType(context);
    }

    getDescriptions() {
        return {
            eng: "A table cell"
        }
    }

    getReplacementChild(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }

}
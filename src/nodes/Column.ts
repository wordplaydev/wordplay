import Node, { type ConflictContext } from "./Node";
import Bind from "../nodes/Bind";
import Token from "./Token";
import Unparsable from "./Unparsable";
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

    computeType(context: ConflictContext) { return this.bind instanceof Unparsable ? new UnknownType(this) : this.bind.getTypeUnlessCycle(context); }

    clone(original?: Node, replacement?: Node) { 
        return new Column(
            this.bar.cloneOrReplace([ Token ], original, replacement), 
            this.bind.cloneOrReplace([ Bind, Unparsable ], original, replacement)
        ) as this; 
    }

}
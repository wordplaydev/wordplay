import Node from "./Node";
import type Context from "./Context";
import Bind from "../nodes/Bind";
import Token from "./Token";
import Unparsable from "./Unparsable";
import UnknownType from "./UnknownType";
import type Transform from "../transforms/Transform";

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
    computeConflicts() {}

    hasDefault() { return this.bind instanceof Bind && this.bind.hasDefault(); }
    getType(context: Context) { return this.bind instanceof Unparsable ? new UnknownType(this) : this.bind.getTypeUnlessCycle(context); }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Column(
            this.cloneOrReplaceChild(pretty, [ Token ], "bar", this.bar, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Bind, Unparsable ], "bind", this.bind, original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A table column"
        }
    }

    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }
    getChildRemoval(): Transform | undefined { return undefined; }
}
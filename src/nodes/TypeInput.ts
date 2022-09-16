import Node from "./Node";
import Token from "./Token";
import Type from "./Type";
import Unparsable from "./Unparsable";

export default class TypeInput extends Node {

    readonly dot: Token;
    readonly type: Type | Unparsable;

    constructor(dot: Token, type: Type | Unparsable) {
        super();

        this.dot = dot;
        this.type = type;
    }

    computeChildren() {
        return [ this.dot, this.type ];
    }

    clone(original?: Node, replacement?: Node) { 
        return new TypeInput(
            this.dot.cloneOrReplace([ Token ], original, replacement), 
            this.type.cloneOrReplace([ Type, Unparsable ], original, replacement)
        ) as this; 
    }

}
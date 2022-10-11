import Expression from "./Expression";
import Node from "./Node";
import Token from "./Token";
import Unparsable from "./Unparsable";

export default class KeyValue extends Node {

    readonly key: Expression | Unparsable;
    readonly bind: Token;
    readonly value: Expression | Unparsable;

    constructor(key: Expression | Unparsable, bind: Token, value: Expression | Unparsable) {
        super();

        this.key = key;
        this.bind = bind;
        this.value = value;
    }

    computeChildren() {
        return [ this.key, this.bind, this.value ];
    }

    computeConflicts() {}

    clone(original?: Node, replacement?: Node) { 
        return new KeyValue(
            this.key.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.bind.cloneOrReplace([ Token ], original, replacement), 
            this.value.cloneOrReplace([ Expression, Unparsable ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A map key/value pair."
        }
    }

}
import type Context from "./Context";
import Expression from "./Expression";
import { getExpressionReplacements } from "../transforms/getPossibleExpressions";
import Node from "./Node";
import type Transform from "../transforms/Transform"
import Token from "./Token";
import Unparsable from "./Unparsable";
import BindToken from "./BindToken";

export default class KeyValue extends Node {

    readonly key: Expression | Unparsable;
    readonly bind: Token;
    readonly value: Expression | Unparsable;

    constructor(key: Expression | Unparsable, value: Expression | Unparsable, bind?: Token) {
        super();

        this.key = key;
        this.bind = bind ?? new BindToken();
        this.value = value;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new KeyValue(
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "key", this.key, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "value", this.value, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "bind", this.bind, original, replacement)
        ) as this; 
    }

    computeChildren() {
        return [ this.key, this.bind, this.value ];
    }

    computeConflicts() {}

    getDescriptions() {
        return {
            eng: "A map key/value pair."
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined { 

        if(child === this.key)
            return getExpressionReplacements(context.source, this, this.key, context);
        if(child === this.value)
            return getExpressionReplacements(context.source, this, this.value, context);

    }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
}
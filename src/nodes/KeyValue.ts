import { BIND_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import Expression from "./Expression";
import getPossibleExpressions from "./getPossibleExpressions";
import Node from "./Node";
import type Transform from "./Transform"
import Token from "./Token";
import TokenType from "./TokenType";
import Unparsable from "./Unparsable";

export default class KeyValue extends Node {

    readonly key: Expression | Unparsable;
    readonly bind: Token;
    readonly value: Expression | Unparsable;

    constructor(key: Expression | Unparsable, value: Expression | Unparsable, bind?: Token) {
        super();

        this.key = key;
        this.bind = bind ?? new Token(BIND_SYMBOL, [ TokenType.BIND ]);
        this.value = value;
    }

    computeChildren() {
        return [ this.key, this.bind, this.value ];
    }

    computeConflicts() {}

    clone(original?: Node, replacement?: Node) { 
        return new KeyValue(
            this.key.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.value.cloneOrReplace([ Expression, Unparsable ], original, replacement),
            this.bind.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A map key/value pair."
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined { 

        if(child === this.key)
            return getPossibleExpressions(this, this.key, context);
        if(child === this.value)
            return getPossibleExpressions(this, this.value, context);

    }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
}
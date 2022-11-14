import type Context from "./Context";
import Expression from "./Expression";
import { getExpressionReplacements } from "../transforms/getPossibleExpressions";
import Node from "./Node";
import type Transform from "../transforms/Transform"
import Token from "./Token";
import Unparsable from "./Unparsable";
import BindToken from "./BindToken";
import Replace from "../transforms/Replace";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class KeyValue extends Node {

    readonly key: Expression | Unparsable;
    readonly bind: Token;
    readonly value: Expression | Unparsable;

    constructor(key: Expression | Unparsable, value: Expression | Unparsable, bind?: Token) {
        super();

        this.key = key;
        this.bind = bind ?? new BindToken();
        this.value = value;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "key", types:[ Expression, Unparsable ] },
            { name: "bind", types:[ Token ] },
            { name: "value", types:[ Expression, Unparsable ] },
        ];
    }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new KeyValue(
            this.cloneOrReplaceChild(pretty, "key", this.key, original, replacement), 
            this.cloneOrReplaceChild(pretty, "value", this.value, original, replacement),
            this.cloneOrReplaceChild(pretty, "bind", this.bind, original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A map key/value pair."
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 

        if(child === this.key)
            return getExpressionReplacements(context.source, this, this.key, context);
        if(child === this.value)
            return getExpressionReplacements(context.source, this, this.value, context);

    }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.key || child === this.value) return new Replace(context.source, child, new ExpressionPlaceholder());
    }
}
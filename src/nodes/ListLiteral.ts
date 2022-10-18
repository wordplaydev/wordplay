import Expression from "./Expression";
import ListType from "./ListType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import Unparsable from "./Unparsable";
import List from "../runtime/List";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import { getPossibleUnionType, TypeSet } from "./UnionType";
import type Bind from "./Bind";
import getPossibleExpressions from "./getPossibleExpressions";
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Transform from "./Transform"

export type ListItem = Expression | Unparsable;

export default class ListLiteral extends Expression {

    readonly open: Token;
    readonly values: ListItem[];
    readonly close: Token;

    constructor(values: ListItem[], open?: Token, close?: Token) {
        super();

        this.open = open ?? new Token(LIST_OPEN_SYMBOL, [ TokenType.LIST_OPEN ]);
        this.values = values.slice();
        this.close = close ?? new Token(LIST_CLOSE_SYMBOL, [ TokenType.LIST_CLOSE ]);;

    }

    computeChildren() {
        return [ this.open, ...this.values, this.close ];
    }

    computeType(context: Context): Type {
        const expressions = this.values.filter(e => e instanceof Expression) as Expression[];
        let itemType = getPossibleUnionType(context, expressions.map(v => v.getTypeUnlessCycle(context)));
        return new ListType(itemType);
    }

    computeConflicts() {}

    compile(context: Context):Step[] {
        return [ 
            new Start(this),
            ...this.values.reduce((steps: Step[], item) => [...steps, ...item.compile(context)], []),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value {

        // Pop all of the values.
        const values = [];
        for(let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue(undefined));

        // Construct the new list.
        return new List(values);
        
    }

    getStartExplanations() { 
        return {
            "eng": "First evaluate all of the values for this list."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now make the list!"
        }
    }

    clone(original?: Node, replacement?: Node) { 
        return new ListLiteral(
            this.values.map(v => v.cloneOrReplace([ Expression, Unparsable ], original, replacement)), 
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.close.cloneOrReplace([ Token ], original, replacement)
         ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.values.forEach(val => { if(val instanceof Expression) val.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

    getDescriptions() {
        return {
            eng: "A list of values"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined { 

        if(this.values.includes(child as ListItem))
            return getPossibleExpressions(this, child as ListItem, context);

    }
    getInsertionBefore(child: Node, context: Context): Transform[] | undefined { 

        const index = this.values.indexOf(child as ListItem);
        if(index >= 0)
            return getPossibleExpressions(this, undefined, context)

    
    }

    getInsertionAfter() { return undefined; }

}
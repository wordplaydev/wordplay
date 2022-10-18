import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Set from "../runtime/Set";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import { getPossibleUnionType, TypeSet } from "./UnionType";
import SetType from "./SetType";
import AnyType from "./AnyType";
import type Bind from "./Bind";
import getPossibleExpressions from "./getPossibleExpressions";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Transform from "./Transform"

export type SetItem = Expression | Unparsable;

export default class SetLiteral extends Expression {

    readonly open: Token;
    readonly values: SetItem[];
    readonly close: Token | Unparsable;

    constructor(values: SetItem[], open?: Token, close?: Token | Unparsable) {
        super();

        this.open = open ?? new Token(SET_OPEN_SYMBOL, [ TokenType.SET_OPEN ]);
        this.values = values.slice();
        this.close = close ?? new Token(SET_CLOSE_SYMBOL, [ TokenType.SET_CLOSE ]);
        
    }

    computeChildren() {
        return [ this.open, ...this.values, this.close ];
    }
    computeConflicts() {}

    computeType(context: Context): Type {
        let type = getPossibleUnionType(context, this.values.map(v => (v as Expression | Unparsable).getTypeUnlessCycle(context)));
        if(type === undefined) type = new AnyType();        
        return new SetType(type);
    }

    compile(context: Context):Step[] {
        return [
            new Start(this),
            // Evaluate all of the item or key/value expressions
            ...this.values.reduce(
                (steps: Step[], item) => [
                    ...steps, 
                    ...(item as Expression).compile(context)
                ], []),
            // Then build the set or map.
            new Finish(this)
        ];
    }

    getStartExplanations() { 
        return {
            "eng": "Start evaluating all the set items."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now that we have all the set items, make the set."
        }
    }

    evaluate(evaluator: Evaluator): Value {

        // Pop all of the values. Order doesn't matter.
        const values = [];
        for(let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue(undefined));
        return new Set(values);
            
    }

    clone(original?: Node, replacement?: Node) { 
        return new SetLiteral(
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
            eng: "A set of unique values"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined  {

        const index = this.values.indexOf(child as SetItem);
        return getPossibleExpressions(this, index >= 0 ? this.values[index] : undefined, context);

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}
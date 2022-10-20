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
import { getExpressionInsertions, getExpressionReplacements } from "../transforms/getPossibleExpressions";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Transform from "../transforms/Transform"
import { withPrecedingSpaceIfDesired } from "../transforms/withPrecedingSpace";
import { endsWithName, startsWithName } from "./util";

export type SetItem = Expression | Unparsable;

export default class SetLiteral extends Expression {

    readonly open: Token;
    readonly values: SetItem[];
    readonly close: Token | Unparsable;

    constructor(values: SetItem[], open?: Token, close?: Token | Unparsable) {
        super();

        this.open = open ?? new Token(SET_OPEN_SYMBOL, TokenType.SET_OPEN);
        this.values = values.map((value: SetItem, index) => withPrecedingSpaceIfDesired(
            index > 0 && endsWithName(values[index - 1]) && startsWithName(value),
            value, " ", false))
        this.close = close ?? new Token(SET_CLOSE_SYMBOL, TokenType.SET_CLOSE);
        
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new SetLiteral(
            this.cloneOrReplaceChild<SetItem[]>(pretty, [ Expression, Unparsable ], "values", this.values, original, replacement)
                .map((value: SetItem, index: number) => withPrecedingSpaceIfDesired(pretty && index > 0, value)),
            this.cloneOrReplaceChild(pretty, [ Token ], "open", this.open, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "close", this.close, original, replacement)
        ) as this; 
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
        if(index >= 0)
            return getExpressionReplacements(context.source, this, this.values[index], context);

    }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined { 

        const index = this.values.indexOf(child as SetItem);
        if(index >= 0 || child === this.close)
            return getExpressionInsertions(context.source, position, this, this.values, child, context);
    
    }

    getInsertionAfter() { return undefined; }

}
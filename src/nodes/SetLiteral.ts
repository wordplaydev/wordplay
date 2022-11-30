import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
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
import { getExpressionInsertions, getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Transform from "../transforms/Transform"
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import { withSpaces } from "./spacing";

export default class SetLiteral extends Expression {

    readonly open: Token;
    readonly values: Expression[];
    readonly close: Token;

    constructor(values: Expression[], open?: Token, close?: Token) {
        super();

        this.open = open ?? new Token(SET_OPEN_SYMBOL, TokenType.SET_OPEN);
        this.values = withSpaces(values);
        this.close = close ?? new Token(SET_CLOSE_SYMBOL, TokenType.SET_CLOSE);

        this.computeChildren();
        
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "values", types:[[ Expression ]] },
            { name: "close", types:[ Token ] },
        ];
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new SetLiteral(
            this.replaceChild<Expression[]>(pretty, "values", this.values, original, replacement),
            this.replaceChild(pretty, "open", this.open, original, replacement), 
            this.replaceChild(pretty, "close", this.close, original, replacement)
        ) as this; 
    }

    getPreferredPrecedingSpace(child: Node, space: string, depth: number): string {
        // If the block has more than one statement, and the space doesn't yet include a newline followed by the number of types tab, then prefix the child with them.
        return (this.values.includes(child as Expression)) && space.indexOf("\n") >= 0 ? `${"\t".repeat(depth + 1)}` : "";
    }

    computeConflicts() {}

    computeType(context: Context): Type {
        let type = getPossibleUnionType(context, this.values.map(v => (v as Expression).getTypeUnlessCycle(context)));
        if(type === undefined) type = new AnyType();        
        return new SetType(type);
    }

    getDependencies(): Expression[] {
        return [ ...this.values ];
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

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        // Pop all of the values. Order doesn't matter.
        const values = [];
        for(let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue(undefined));
        return new Set(this, values);
        
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.values.forEach(val => { if(val instanceof Expression) val.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined  {

        const index = this.values.indexOf(child as Expression);
        if(index >= 0)
            return getExpressionReplacements(this, this.values[index], context);

    }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined { 

        const index = this.values.indexOf(child as Expression);
        if(index >= 0 || child === this.close)
            return getExpressionInsertions(position, this, this.values, child, context);
    
    }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }
    
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.values.includes(child as Expression)) return new Remove(context, this, child);
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A set of unique values"
        }
    }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "Start evaluating all the set items."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Now that we have all the set items, make the set."
        }
    }

}
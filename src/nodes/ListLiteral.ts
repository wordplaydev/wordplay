import Expression from "./Expression";
import ListType from "./ListType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import List from "../runtime/List";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import { getPossibleUnionType, TypeSet } from "./UnionType";
import type Bind from "./Bind";
import { getExpressionInsertions, getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform"
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import UnclosedDelimiter from "../conflicts/UnclosedDelimiter";
import type Conflict from "../conflicts/Conflict";
import ListOpenToken from "./ListOpenToken";
import ListCloseToken from "./ListCloseToken";

export default class ListLiteral extends Expression {

    readonly open: Token;
    readonly values: Expression[];
    readonly close?: Token;

    constructor(open: Token, values: Expression[], close?: Token) {
        super();

        this.open = open;
        this.values = values;
        this.close = close;

        this.computeChildren();

    }

    static make(values: Expression[]) {
        return new ListLiteral(
            new ListOpenToken(),
            values,
            new ListCloseToken()
        );
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "values", types:[[ Expression ]] },
            { name: "close", types:[ Token, undefined ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new ListLiteral(
            this.replaceChild("open", this.open, original, replacement),
            this.replaceChild<Expression[]>("values", this.values, original, replacement),
            this.replaceChild("close", this.close, original, replacement)
         ) as this; 
    }

    getPreferredPrecedingSpace(child: Node, space: string, depth: number): string {
        // If the block has more than one statement, and the space doesn't yet include a newline followed by the number of types tab, then prefix the child with them.
        return (this.values.includes(child as Expression)) && space.indexOf("\n") >= 0 ? `${"\t".repeat(depth + 1)}` : "";
    }

    computeType(context: Context): Type {
        const expressions = this.values.filter(e => e instanceof Expression) as Expression[];
        let itemType = getPossibleUnionType(context, expressions.map(v => v.getTypeUnlessCycle(context)));
        return ListType.make(itemType);
    }

    computeConflicts(): Conflict[] {

        if(this.close === undefined)
            return [ new UnclosedDelimiter(this, this.open, new ListCloseToken()) ]

        return [];

    }

    getDependencies(): Expression[] {
        return [ ...this.values ];
    }

    compile(context: Context):Step[] {
        return [ 
            new Start(this),
            ...this.values.reduce((steps: Step[], item) => [...steps, ...item.compile(context)], []),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        // Pop all of the values.
        const values = [];
        for(let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue(undefined));

        // Construct the new list.
        return new List(this, values);
        
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.values.forEach(val => { if(val instanceof Expression) val.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 

        if(this.values.includes(child as Expression))
            return getExpressionReplacements(this, child as Expression, context);

    }
    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined { 

        const index = this.values.indexOf(child as Expression);
        if(index >= 0)
            return getExpressionInsertions(position, this, this.values, child, context);
        else if(child === this.close)
            return getExpressionInsertions(position, this, this.values, child, context);
    
    }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.values.includes(child as Expression)) return new Remove(context, this, child);
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A list of values"
        }
    }

    getStart() { return this.open; }
    getFinish() { return this.close ?? this.values[this.values.length - 1] ?? this.open; }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "First evaluate all of the values for this list."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Now make the list!"
        }
    }

}
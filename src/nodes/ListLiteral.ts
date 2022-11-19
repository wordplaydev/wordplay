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
import { getExpressionInsertions, getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Transform from "../transforms/Transform"
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import { withSpaces } from "./spacing";

export type ListItem = Expression | Unparsable;

export default class ListLiteral extends Expression {

    readonly open: Token;
    readonly values: ListItem[];
    readonly close: Token;

    constructor(values: ListItem[], open?: Token, close?: Token) {
        super();

        this.open = open ?? new Token(LIST_OPEN_SYMBOL, TokenType.LIST_OPEN);
        // There must be spaces between list items. There are too many things that won't parse correctly if there isn't. Apply it if there's no space present.
        this.values = withSpaces(values);
        this.close = close ?? new Token(LIST_CLOSE_SYMBOL, TokenType.LIST_CLOSE);

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "values", types:[[ Expression, Unparsable ]] },
            { name: "close", types:[ Token ] },
        ];
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new ListLiteral(
            this.replaceChild<ListItem[]>(pretty, "values", this.values, original, replacement),
            this.replaceChild(pretty, "open", this.open, original, replacement),
            this.replaceChild(pretty, "close", this.close, original, replacement)
         ) as this; 
    }

    getPreferredPrecedingSpace(child: Node, space: string, depth: number): string {
        // If the block has more than one statement, and the space doesn't yet include a newline followed by the number of types tab, then prefix the child with them.
        return (this.values.includes(child as ListItem)) && space.indexOf("\n") >= 0 ? `${"\t".repeat(depth + 1)}` : "";
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
        return new List(this, values);
        
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.values.forEach(val => { if(val instanceof Expression) val.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 

        if(this.values.includes(child as ListItem))
            return getExpressionReplacements(context.source, this, child as ListItem, context);

    }
    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined { 

        const index = this.values.indexOf(child as ListItem);
        if(index >= 0)
            return getExpressionInsertions(context.source, position, this, this.values, child, context);
        else if(child === this.close)
            return getExpressionInsertions(context.source, position, this, this.values, child, context);
    
    }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.values.includes(child as ListItem)) return new Remove(context.source, this, child);
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A list of values"
        }
    }

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
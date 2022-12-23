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
import UnionType from "./UnionType";
import type TypeSet from "./TypeSet";
import SetType from "./SetType";
import AnyType from "./AnyType";
import type Bind from "./Bind";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class SetLiteral extends Expression {

    readonly open: Token;
    readonly values: Expression[];
    readonly close: Token | undefined;

    constructor(open: Token, values: Expression[], close: Token | undefined) {
        super();

        this.open = open;
        this.values = values;
        this.close = close;

        this.computeChildren();
        
    }

    static make(values: Expression[]) {
        return new SetLiteral(
            new Token(SET_OPEN_SYMBOL, TokenType.SET_OPEN),
            values,
            new Token(SET_CLOSE_SYMBOL, TokenType.SET_CLOSE)
        );
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "values", types:[[ Expression ]] },
            { name: "close", types:[ Token ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new SetLiteral(
            this.replaceChild("open", this.open, original, replacement), 
            this.replaceChild<Expression[]>("values", this.values, original, replacement),
            this.replaceChild("close", this.close, original, replacement)
        ) as this; 
    }

    getPreferredPrecedingSpace(child: Node, space: string, depth: number): string {
        // If the block has more than one statement, and the space doesn't yet include a newline followed by the number of types tab, then prefix the child with them.
        return (this.values.includes(child as Expression)) && space.indexOf("\n") >= 0 ? `${"\t".repeat(depth + 1)}` : "";
    }

    computeConflicts() {}

    computeType(context: Context): Type {
        let type = this.values.length === 0 ? new AnyType() : UnionType.getPossibleUnion(context, this.values.map(v => (v as Expression).getType(context)));
        return SetType.make(type);
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

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A set of unique values"
        }
    }

    getStart() { return this.open; }
    getFinish() { return this.close ?? this.values[this.values.length - 1] ?? this.open; }

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
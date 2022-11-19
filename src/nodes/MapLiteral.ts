import Expression from "./Expression";
import KeyValue from "./KeyValue";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import type Conflict from "../conflicts/Conflict";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Map from "../runtime/Map";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import { getPossibleUnionType, TypeSet } from "./UnionType";
import { NotAMap } from "../conflicts/NotAMap";
import MapType from "./MapType";
import Halt from "../runtime/Halt";
import AnyType from "./AnyType";
import type Bind from "./Bind";
import SemanticException from "../runtime/SemanticException";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Transform from "../transforms/Transform";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import { withSpaces } from "./spacing";

export default class MapLiteral extends Expression {

    readonly open: Token;
    readonly values: KeyValue[];
    readonly close: Token;
    readonly bind?: Token;

    constructor(values: KeyValue[], open?: Token, bind?: Token, close?: Token) {
        super();

        this.open = open ?? new Token(SET_OPEN_SYMBOL, TokenType.SET_OPEN);
        this.values = withSpaces(values);
        this.bind = bind;
        this.close = close ?? new Token(SET_CLOSE_SYMBOL, TokenType.SET_CLOSE);

        this.computeChildren();
        
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "values", types:[[ KeyValue ]] },
            { name: "close", types:[ Token ] },
            { name: "bind", types:[ Token, undefined ] },
        ];
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new MapLiteral(
            this.replaceChild<KeyValue[]>(pretty, "values", this.values, original, replacement),
            this.replaceChild(pretty, "open", this.open, original, replacement), 
            this.replaceChild(pretty, "bind", this.bind, original, replacement),
            this.replaceChild(pretty, "close", this.close, original, replacement)
        ) as this; 
    }

    getPreferredPrecedingSpace(child: Node, space: string, depth: number): string {
        // If the block has more than one statement, and the space doesn't yet include a newline followed by the number of types tab, then prefix the child with them.
        return (this.values.includes(child as KeyValue)) && space.indexOf("\n") >= 0 ? `${"\t".repeat(depth + 1)}` : "";
    }

    notAMap() { return this.values.find(v => v instanceof Expression) !== undefined; }

    computeConflicts(): Conflict[] { 
    
        return this.notAMap() ? [ new NotAMap(this) ] : [];
    
    }

    computeType(context: Context): Type {
        let keyType = getPossibleUnionType(context, this.values.map(v => v.key.getTypeUnlessCycle(context)));
        let valueType = getPossibleUnionType(context, this.values.map(v => v.value.getTypeUnlessCycle(context)));
        if(keyType === undefined) keyType = new AnyType();
        else if(valueType === undefined) valueType = new AnyType();
        
        return new MapType(keyType, valueType);

    }

    compile(context: Context):Step[] {
        return this.notAMap() ? 
            [ new Halt(evaluator => new SemanticException(evaluator, this), this) ] :
            [
                new Start(this),
                // Evaluate all of the item or key/value expressions
                ...this.values.reduce(
                    (steps: Step[], item) => [
                        ...steps, 
                        ...[...(item as KeyValue).key.compile(context), ...(item as KeyValue).value.compile(context)]
                    ], []),
                // Then build the set or map.
                new Finish(this)
            ];
    }

    evaluate(evaluator: Evaluator): Value {

        // Pop all of the values. Order doesn't matter.
        const values: [Value, Value][] = [];
        for(let i = 0; i < this.values.length; i++) {
            const value = evaluator.popValue(undefined);
            const key = evaluator.popValue(undefined);
            values.unshift([ key, value ]);
        }
        return new Map(this, values);
            
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.values.forEach(val => { if(val instanceof Expression) val.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.values.includes(child as KeyValue)) return new Remove(context.source, this, child);
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A mapping from one set of values to another"
        }
    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Let's make a map!"
        }
    }

    getFinishExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "Now that we have all of the keys and values, create the map."
        }
    }

}
import Expression from "./Expression";
import KeyValue from "./KeyValue";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
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
import { endsWithName, startsWithName } from "./util";
import type Transform from "../transforms/Transform";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import Remove from "../transforms/Remove";

export type MapItem = Unparsable | KeyValue;

export default class MapLiteral extends Expression {

    readonly open: Token;
    readonly values: MapItem[];
    readonly close: Token | Unparsable;
    readonly bind?: Token;

    constructor(values: MapItem[], open?: Token, bind?: Token, close?: Token | Unparsable) {
        super();

        this.values = values.map((value: MapItem, index) => 
            value.withPrecedingSpaceIfDesired(index > 0 && endsWithName(values[index - 1]) && startsWithName(value), " ", false))
        this.open = open ?? new Token(SET_OPEN_SYMBOL, TokenType.SET_OPEN);
        this.close = close ?? new Token(SET_CLOSE_SYMBOL, TokenType.SET_CLOSE);
        this.bind = bind;
        
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new MapLiteral(
            this.cloneOrReplaceChild<MapItem[]>(pretty, [ Unparsable, KeyValue ], "values", this.values, original, replacement)
                .map((value: MapItem, index: number) => value.withPrecedingSpaceIfDesired(pretty && index > 0)),
            this.cloneOrReplaceChild(pretty, [ Token ], "open", this.open, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "bind", this.bind, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "close", this.close, original, replacement)
        ) as this; 
    }

    notAMap() { return this.values.find(v => v instanceof Expression) !== undefined; }

    computeChildren() {
        return [ this.open, ...this.values, this.close, ... (this.bind ? [ this.bind ] : []) ];
    }

    computeConflicts(): Conflict[] { 
    
        return this.notAMap() ? [ new NotAMap(this) ] : [];
    
    }

    computeType(context: Context): Type {
        let keyType = getPossibleUnionType(context, this.values.map(v => v instanceof KeyValue ? v.key.getTypeUnlessCycle(context) : new UnknownType(v)));
        let valueType = getPossibleUnionType(context, this.values.map(v => v instanceof KeyValue ? v.value.getTypeUnlessCycle(context) : v.getTypeUnlessCycle()));
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
                        ...( item instanceof Unparsable ? item.compile() : [...(item as KeyValue).key.compile(context), ...(item as KeyValue).value.compile(context)])
                    ], []),
                // Then build the set or map.
                new Finish(this)
            ];
    }

    getStartExplanations() {
        return {
            "eng": "Let's make a map!"
        }
    }

    getFinishExplanations() { 
        return {
            "eng": "Now that we have all of the keys and values, create the map."
        }
    }

    evaluate(evaluator: Evaluator): Value {

        // Pop all of the values. Order doesn't matter.
        const values: [Value, Value][] = [];
        for(let i = 0; i < this.values.length; i++) {
            const value = evaluator.popValue(undefined);
            const key = evaluator.popValue(undefined);
            values.unshift([ key, value ]);
        }
        return new Map(values);
            
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.values.forEach(val => { if(val instanceof Expression) val.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

    getDescriptions() {
        return {
            eng: "A mapping from one set of values to another"
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.values.includes(child as MapItem)) return new Remove(context.source, this, child);
    }
}
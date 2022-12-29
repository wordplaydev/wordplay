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
import UnionType from "./UnionType";
import type TypeSet from "./TypeSet";
import { NotAMap } from "../conflicts/NotAMap";
import MapType from "./MapType";
import Halt from "../runtime/Halt";
import AnyType from "./AnyType";
import type Bind from "./Bind";
import UnparsableException from "../runtime/UnparsableException";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import BindToken from "./BindToken";
import SetOpenToken from "./SetOpenToken";
import SetCloseToken from "./SetCloseToken";
import UnclosedDelimiter from "../conflicts/UnclosedDelimiter";

export default class MapLiteral extends Expression {

    readonly open: Token;
    readonly values: KeyValue[];
    readonly close?: Token;
    readonly bind?: Token;

    constructor(open: Token, values: KeyValue[], bind?: Token, close?: Token) {
        super();

        this.open = open;
        this.values = values;
        this.bind = bind;
        this.close = close;

        this.computeChildren();
        
    }

    static make(values: KeyValue[]) {
        return new MapLiteral(
            new SetOpenToken(),
            values,
            values.length === 0 ? new BindToken() : undefined,
            new SetCloseToken()
        )
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "values", types:[[ KeyValue ]], space: true, indent: true },
            { name: "close", types:[ Token ] },
            { name: "bind", types:[ Token, undefined ] },
        ];
    }

    clone(original?: Node, replacement?: Node) { 
        return new MapLiteral(
            this.replaceChild("open", this.open, original, replacement), 
            this.replaceChild<KeyValue[]>("values", this.values, original, replacement),
            this.replaceChild("bind", this.bind, original, replacement),
            this.replaceChild("close", this.close, original, replacement)
        ) as this; 
    }

    notAMap() { return this.values.find(v => v instanceof Expression) !== undefined; }

    computeConflicts(): Conflict[] { 
    
        const conflicts: Conflict[] = [];

        if(this.notAMap())
            conflicts.push(new NotAMap(this));

        if(this.close === undefined)
            return [ new UnclosedDelimiter(this, this.open, new SetCloseToken()) ]

        return conflicts;
    
    }

    computeType(context: Context): Type {

        let keyType = this.values.length === 0 ? new AnyType(): UnionType.getPossibleUnion(context, this.values.map(v => v.key.getType(context)));
        let valueType = this.values.length === 0 ? new AnyType(): UnionType.getPossibleUnion(context, this.values.map(v => v.value.getType(context)));
        
        return MapType.make(keyType, valueType);

    }

    getDependencies(): Expression[] {
        return this.values.map(kv => [ kv.key, kv.value ]).flat();
    }

    compile(context: Context):Step[] {
        return this.notAMap() ? 
            [ new Halt(evaluator => new UnparsableException(evaluator, this), this) ] :
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

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

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

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A mapping from one set of values to another"
        }
    }

    getStart() { return this.open; }
    getFinish() { return this.close ?? this.values[this.values.length - 1] ?? this.bind ?? this.open; }

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
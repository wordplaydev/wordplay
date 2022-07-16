import Expression from "./Expression";
import KeyValue from "./KeyValue";
import type Node from "./Node";
import type Program from "./Program";
import SetOrMapType from "./SetOrMapType";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import Conflict, { IncompatibleValues, NotASetOrMap } from "../parser/Conflict";

import Exception, { ExceptionType } from "../runtime/Exception";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import SetValue from "../runtime/SetValue";
import MapValue from "../runtime/MapValue";

enum SetKind { Set, Map, Neither };

export default class SetOrMapLiteral extends Expression {

    readonly open: Token;
    readonly values: (Unparsable|Expression|KeyValue)[];
    readonly close: Token;
    readonly kind: SetKind;

    constructor(open: Token, values: (Unparsable|Expression|KeyValue)[], close: Token) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
        
        // Must all be expressions or all key/values
        const allExpressions = this.values.every(v => v instanceof Expression);
        const allKeyValue = this.values.every(v => v instanceof KeyValue);

        this.kind = allExpressions ? SetKind.Set : allKeyValue ? SetKind.Map : SetKind.Neither;
        
    }

    getChildren() {
        return [ this.open, ...this.values, this.close ];
    }

    getConflicts(program: Program): Conflict[] { 
        
        // Must all be expressions or all key/values
        if(this.kind === SetKind.Neither)
            return [ new NotASetOrMap(this)]

        // If all expressions. they must all be of the same type.
        if(this.kind === SetKind.Set) {
            const types = (this.values.filter(v => v instanceof Expression) as Expression[]).map(e => e.getType(program));
            if(types.length > 1 && !types.every(t => t.isCompatible(program, types[0])))
                return [ new IncompatibleValues(this) ]
        }
        else if(this.kind === SetKind.Map) {
            const conflicts = [];
            const keyTypes = 
                ((this.values.filter(v => v instanceof KeyValue) as KeyValue[])
                .map(k => k.key)
                .filter(k => k instanceof Expression) as Expression[])
                .map(k => k.getType(program));
            if(keyTypes.length > 1 && !keyTypes.every(t => t.isCompatible(program, keyTypes[0])))
                conflicts.push(new IncompatibleValues(this));
            const valueTypes = 
                ((this.values.filter(v => v instanceof KeyValue) as KeyValue[])
                .map(v => v.value)
                .filter(v => v instanceof Expression) as Expression[])
                .map(v => v.getType(program));
            if(valueTypes.length > 1 && !valueTypes.every(t => t.isCompatible(program, valueTypes[0])))
                conflicts.push(new IncompatibleValues(this));
            return conflicts;
        }
        
        // Otherwise, no conflicts.
        return [];

    }

    getType(program: Program): Type {
        const values = this.values.filter(v => !(v instanceof Unparsable)) as (Expression|KeyValue)[];
        if(values.length === 0) return new UnknownType(this);

        const firstValue = this.values[0];
        if(firstValue instanceof KeyValue) 
            return firstValue.key instanceof Unparsable || firstValue.value instanceof Unparsable ? 
                new UnknownType(this) : 
                new SetOrMapType(firstValue.key.getType(program), firstValue.value.getType(program));
        else if(firstValue instanceof Expression) return new SetOrMapType(firstValue.getType(program));
        else return new UnknownType(this);
    }

    evaluate(evaluator: Evaluator): Node | Value {

        // Neither? Return an exception.
        if(this.kind === SetKind.Neither)
            return new Exception(ExceptionType.INCOMPATIBLE_TYPE);

        // Empty set? Just make it.
        // TODO Distinguish between empty sets and empty maps.
        if(this.values.length === 0)
            return new SetValue(new Set());

        // Which value are we on?
        const lastNode = evaluator.lastEvaluated();
        if(this.kind === SetKind.Set) {
            const index = lastNode === undefined ? -1 : this.values.indexOf(lastNode);
            // If we haven't started, return the first.
            if(index < 0)
                return this.values[0];
            // If it was the last value, return the list.
            else if(index === this.values.length - 1) {
                // Pop all of the values. Order doesn't matter.
                const set = new Set();
                for(let i = 0; i < this.values.length; i++)
                    set.add(evaluator.popValue());
                return new SetValue(set);
            }
            // If we're in the middle of the list, evaluate the next value.
            else return this.values[index + 1];
        }
        else {
            const lastKeyValue = lastNode === undefined ? undefined : (this.values as KeyValue[]).find(v => v.key === lastNode || v.value === lastNode);
            // If we haven't started, return the first.
            if(lastKeyValue === undefined)
                return (this.values[0] as KeyValue).key;
            // If it was the last value, return the list.
            else if((this.values[this.values.length - 1] as KeyValue).value === lastNode) {
                // Pop all of the values. Order doesn't matter.
                const map = new Map();
                for(let i = 0; i < this.values.length; i++) {
                    const value = evaluator.popValue();
                    const key = evaluator.popValue();
                    map.set(key, value);
                }
                return new MapValue(map);
            }
            // If we're in the middle of the list, evaluate the next key or value.
            else {
                return lastNode === lastKeyValue.key ? 
                    lastKeyValue.value :
                    (this.values[this.values.indexOf(lastKeyValue) + 1] as KeyValue).key;
            }

        }
            
    }

}
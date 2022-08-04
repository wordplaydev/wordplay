import Expression from "./Expression";
import KeyValue from "./KeyValue";
import SetOrMapType from "./SetOrMapType";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Conflict from "../conflicts/Conflict";
import { NotASetOrMap } from "../conflicts/NotASetOrMap";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import SetValue from "../runtime/SetValue";
import MapValue from "../runtime/MapValue";
import type Step from "../runtime/Step";
import Halt from "../runtime/Halt";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type { ConflictContext } from "./Node";
import { getPossibleUnionType } from "./UnionType";

enum SetKind { Set, Map, Neither };

export default class SetOrMapLiteral extends Expression {

    readonly open: Token;
    readonly values: (Unparsable|Expression|KeyValue)[];
    readonly close: Token;
    readonly bind?: Token;
    readonly kind: SetKind;

    constructor(open: Token, values: (Unparsable|Expression|KeyValue)[], close: Token, bind?: Token) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
        this.bind = bind;
        
        // Must all be expressions or all key/values
        const allExpressions = this.values.every(v => v instanceof Expression);
        const allKeyValue = this.values.every(v => v instanceof KeyValue);

        this.kind = bind ? SetKind.Map : allExpressions ? SetKind.Set : allKeyValue ? SetKind.Map : SetKind.Neither;
        
    }

    getChildren() {
        return [ this.open, ...this.values, this.close, ... (this.bind ? [ this.bind ] : []) ];
    }

    getConflicts(context: ConflictContext): Conflict[] { 
        
        // Must all be expressions or all key/values
        if(this.kind === SetKind.Neither)
            return [ new NotASetOrMap(this)]
        
        // Otherwise, no conflicts.
        return [];

    }

    getType(context: ConflictContext): Type {
        const values = this.values.filter(v => !(v instanceof Unparsable)) as (Expression|KeyValue)[];
        if(values.length === 0) return new UnknownType(this);

        switch(this.kind) {
            case SetKind.Set: 
                let type = getPossibleUnionType(context, this.values.map(v => (v as Expression | Unparsable).getType(context)));
                if(type === undefined) type = new UnknownType(this);
                else return new SetOrMapType(undefined, undefined, type);
            case SetKind.Map:
                let keyType = getPossibleUnionType(context, this.values.map(v => v instanceof KeyValue ? v.key.getType(context) : v.getType(context)));
                let valueType = getPossibleUnionType(context, this.values.map(v => v instanceof KeyValue ? v.value.getType(context) : v.getType(context)));
                if(keyType === undefined) keyType = new UnknownType(this);
                else if(valueType === undefined) valueType = new UnknownType(this);
                else return new SetOrMapType(undefined, undefined, keyType, undefined, valueType);
            default: return new UnknownType(this);
        }

    }

    compile(): Step[] {
        return this.kind === SetKind.Neither ?
            [ new Halt(new Exception(this, ExceptionKind.EXPECTED_TYPE), this)] :
            [
                new Start(this),
                // Evaluate all of the item or key/value expressions
                ...this.values.reduce(
                    (steps: Step[], item) => [
                        ...steps, 
                        ...(this.kind === SetKind.Set ? 
                            // Evaluate all of the set item expressions
                            (item as Expression).compile() : 
                            // Evaluate all of the key/value pairs
                            [...(item as KeyValue).key.compile(), ...(item as KeyValue).value.compile()])
                    ], []),
                // Then build the set or map.
                new Finish(this)
            ];
    }

    evaluate(evaluator: Evaluator): Value {

        // Which value are we on?
        if(this.kind === SetKind.Set) {
            // Pop all of the values. Order doesn't matter.
            const values = [];
            for(let i = 0; i < this.values.length; i++)
                values.push(evaluator.popValue());
            return new SetValue(values);
        }
        else {
            // Pop all of the values. Order doesn't matter.
            const values: [Value, Value][] = [];
            for(let i = 0; i < this.values.length; i++) {
                const value = evaluator.popValue();
                const key = evaluator.popValue();
                values.push([ key, value ]);
            }
            return new MapValue(values);
       }
            
    }

}
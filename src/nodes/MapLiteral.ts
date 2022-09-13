import Expression from "./Expression";
import KeyValue from "./KeyValue";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Conflict from "../conflicts/Conflict";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import MapValue from "../runtime/MapValue";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type { ConflictContext } from "./Node";
import { getPossibleUnionType } from "./UnionType";
import { NotAMap } from "../conflicts/NotAMap";
import MapType from "./MapType";
import Halt from "../runtime/Halt";
import Exception, { ExceptionKind } from "../runtime/Exception";
import AnyType from "./AnyType";

export default class MapLiteral extends Expression {

    readonly open: Token;
    readonly values: (Unparsable|Expression|KeyValue)[];
    readonly close: Token | Unparsable;
    readonly bind?: Token;

    constructor(open: Token, values: (Unparsable|Expression|KeyValue)[], close: Token | Unparsable, bind?: Token) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
        this.bind = bind;
        
    }

    notAMap() { return this.values.find(v => v instanceof Expression) !== undefined; }

    computeChildren() {
        return [ this.open, ...this.values, this.close, ... (this.bind ? [ this.bind ] : []) ];
    }

    computeConflicts(context: ConflictContext): Conflict[] { 
    
        return this.notAMap() ? [ new NotAMap(this) ] : [];
    
    }

    computeType(context: ConflictContext): Type {
        const values = this.values.filter(v => !(v instanceof Unparsable)) as (KeyValue)[];
        let keyType = getPossibleUnionType(context, this.values.map(v => v instanceof KeyValue ? v.key.getTypeUnlessCycle(context) : new UnknownType(v)));
        let valueType = getPossibleUnionType(context, this.values.map(v => v instanceof KeyValue ? v.value.getTypeUnlessCycle(context) : v.getTypeUnlessCycle(context)));
        if(keyType === undefined) keyType = new AnyType(this);
        else if(valueType === undefined) valueType = new AnyType(this);
        
        return new MapType(undefined, undefined, keyType, undefined, valueType);

    }

    compile(context: ConflictContext):Step[] {
        return this.notAMap() ? 
            [ new Halt(new Exception(this, ExceptionKind.EXPECTED_VALUE, "Missing values in map"), this)] :
            [
                new Action(this),
                // Evaluate all of the item or key/value expressions
                ...this.values.reduce(
                    (steps: Step[], item) => [
                        ...steps, 
                        ...( item instanceof Unparsable ? item.compile(context) : [...(item as KeyValue).key.compile(context), ...(item as KeyValue).value.compile(context)])
                    ], []),
                // Then build the set or map.
                new Finish(this)
            ];
    }

    evaluate(evaluator: Evaluator): Value {

        // Pop all of the values. Order doesn't matter.
        const values: [Value, Value][] = [];
        for(let i = 0; i < this.values.length; i++) {
            const value = evaluator.popValue();
            const key = evaluator.popValue();
            values.unshift([ key, value ]);
        }
        return new MapValue(values);
            
    }

}
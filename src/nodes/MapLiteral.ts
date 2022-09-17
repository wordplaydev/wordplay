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
import MapValue from "../runtime/MapValue";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type Context from "./Context";
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

    computeConflicts(): Conflict[] { 
    
        return this.notAMap() ? [ new NotAMap(this) ] : [];
    
    }

    computeType(context: Context): Type {
        let keyType = getPossibleUnionType(context, this.values.map(v => v instanceof KeyValue ? v.key.getTypeUnlessCycle(context) : new UnknownType(v)));
        let valueType = getPossibleUnionType(context, this.values.map(v => v instanceof KeyValue ? v.value.getTypeUnlessCycle(context) : v.getTypeUnlessCycle(context)));
        if(keyType === undefined) keyType = new AnyType();
        else if(valueType === undefined) valueType = new AnyType();
        
        return new MapType(undefined, undefined, keyType, undefined, valueType);

    }

    compile(context: Context):Step[] {
        return this.notAMap() ? 
            [ new Halt(new Exception(this, ExceptionKind.EXPECTED_VALUE, "Missing values in map"), this)] :
            [
                new Action(this),
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

    clone(original?: Node, replacement?: Node) { 
        return new MapLiteral(
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.values.map(v => v.cloneOrReplace([ Unparsable, Expression, KeyValue ], original, replacement)), 
            this.close.cloneOrReplace([ Token ], original, replacement), 
            this.bind?.cloneOrReplace([ Token, undefined ], original, replacement)
        ) as this; 
    }

}
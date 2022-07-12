import Conflict from "./Conflict";
import Expression from "./Expression";
import KeyValue from "./KeyValue";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import SetOrMapType from "./SetOrMapType";
import type { Token } from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";

export default class SetOrMap extends Expression {

    readonly open: Token;
    readonly values: (Unparsable|Expression|KeyValue)[];
    readonly close: Token;

    constructor(open: Token, values: (Unparsable|Expression|KeyValue)[], close: Token) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
    }

    getChildren() {
        return [ this.open, ...this.values, this.close ];
    }

    getConflicts(program: Program): Conflict[] { 
        
        // Must all be expressions or all key/values
        const allExpressions = this.values.every(v => v instanceof Expression);
        const allKeyValue = this.values.every(v => v instanceof KeyValue);

        if(!allExpressions && !allKeyValue)
            return [ new Conflict(this, SemanticConflict.NEITHER_SET_NOR_MAP)]

        // If all expressions. they must all be of the same type.
        if(allExpressions) {
            const types = (this.values.filter(v => v instanceof Expression) as Expression[]).map(e => e.getType(program));
            if(types.length > 1 && !types.every(t => t.isCompatible(program, types[0])))
                return [ new Conflict(this, SemanticConflict.SET_VALUES_ARENT_SAME_TYPE) ]
        }
        else if(allKeyValue) {
            const conflicts = [];
            const keyTypes = 
                ((this.values.filter(v => v instanceof KeyValue) as KeyValue[])
                .map(k => k.key)
                .filter(k => k instanceof Expression) as Expression[])
                .map(k => k.getType(program));
            if(keyTypes.length > 1 && !keyTypes.every(t => t.isCompatible(program, keyTypes[0])))
                conflicts.push(new Conflict(this, SemanticConflict.MAP_KEYS_ARENT_SAME_TYPE));
            const valueTypes = 
                ((this.values.filter(v => v instanceof KeyValue) as KeyValue[])
                .map(v => v.value)
                .filter(v => v instanceof Expression) as Expression[])
                .map(v => v.getType(program));
            if(valueTypes.length > 1 && !valueTypes.every(t => t.isCompatible(program, valueTypes[0])))
                conflicts.push(new Conflict(this, SemanticConflict.MAP_VALUES_ARENT_SAME_TYPE));
            return conflicts;
        }
        
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

}
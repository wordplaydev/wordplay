import type Conflict from "./Conflict";
import Expression from "./Expression";
import KeyValue from "./KeyValue";
import type Program from "./Program";
import SetOrMapType from "./SetOrMapType";
import type { Token } from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";

export default class SetOrMap extends Expression {

    readonly open: Token;
    readonly values: (Unparsable|Expression|KeyValue)[];
    readonly close: Token;

    constructor(open: Token, values: (Unparsable|Expression)[] | (Unparsable|KeyValue)[], close: Token) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
    }

    getChildren() {
        return [ this.open, ...this.values, this.close ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

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
import Conflict, { IncompatibleValues } from "../parser/Conflict";
import Expression from "./Expression";
import ListType from "./ListType";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";

export default class ListLiteral extends Expression {

    readonly open: Token;
    readonly values: (Expression | Unparsable)[];
    readonly close: Token;

    constructor(open: Token, values: (Expression | Unparsable)[], close: Token) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
    }

    getChildren() {
        return [ this.open, ...this.values, this.close ];
    }

    getConflicts(program: Program): Conflict[] { 

        // The list values have to all be of compatible types.
        const types = (this.values.filter(v => v instanceof Expression) as Expression[]).map(e => e.getType(program));
        if(types.length > 1 && !types.every(t => t.isCompatible(program, types[0])))
            return [ new IncompatibleValues(this) ]

        return []; 
    
    }

    getType(program: Program): Type {
        const expressions = this.values.filter(e => e instanceof Expression) as Expression[];
        if(expressions.length === 0) return new UnknownType(this);
        const firstValue = expressions[0];
        return new ListType(firstValue.getType(program));
    }

}
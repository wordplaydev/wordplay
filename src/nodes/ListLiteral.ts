import Conflict, { IncompatibleValues } from "../parser/Conflict";
import Expression from "./Expression";
import ListType from "./ListType";
import type Node from "./Node";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";
import List from "../runtime/List";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";

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

    evaluate(evaluator: Evaluator): Value | Node {

        // Empty list? Just make it.
        if(this.values.length === 0)
            return new List([]);

        // Which value are we on?
        const lastValue = evaluator.lastEvaluated();
        const index = lastValue === undefined ? -1 : this.values.indexOf(lastValue);
        // If we haven't started, return the first.
        if(index < 0)
            return this.values[0];
        // If it was the last value, return the list.
        else if(index === this.values.length - 1) {

            // Pop all of the values.
            const values = [];
            for(let i = 0; i < this.values.length; i++)
                values.unshift(evaluator.popValue());

            return new List(values);

        }
        // If we're in the middle of the list, evaluate the next value.
        else return this.values[index + 1];
        
    }

}
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
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";

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

    compile(): Step[] {
        return [ 
            new Start(this),
            ...this.values.reduce((steps: Step[], item) => [...steps, ...item.compile()], []),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value | Node {

        // Pop all of the values.
        const values = [];
        for(let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue());

        // Construct the new list.
        return new List(values);
        
    }

}
import Expression from "./Expression";
import ListType from "./ListType";
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
import type { ConflictContext } from "./Node";
import { getPossibleUnionType } from "./UnionType";
import type Conflict from "../parser/Conflict";

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

    getConflicts(context: ConflictContext): Conflict[] {  return []; }

    getType(context: ConflictContext): Type {
        const expressions = this.values.filter(e => e instanceof Expression) as Expression[];
        if(expressions.length === 0) return new UnknownType(this);
        let itemType = getPossibleUnionType(context, expressions.map(v => v.getType(context)));
        if(itemType === undefined) itemType = new UnknownType(this);
        return new ListType(undefined, undefined, itemType);
    }

    compile(): Step[] {
        return [ 
            new Start(this),
            ...this.values.reduce((steps: Step[], item) => [...steps, ...item.compile()], []),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value {

        // Pop all of the values.
        const values = [];
        for(let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue());

        // Construct the new list.
        return new List(values);
        
    }

}
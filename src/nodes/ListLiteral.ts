import Expression from "./Expression";
import ListType from "./ListType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import Unparsable from "./Unparsable";
import List from "../runtime/List";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type Context from "./Context";
import { getPossibleUnionType } from "./UnionType";
import AnyType from "./AnyType";

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

    computeChildren() {
        return [ this.open, ...this.values, this.close ];
    }

    computeType(context: Context): Type {
        const expressions = this.values.filter(e => e instanceof Expression) as Expression[];
        let itemType = getPossibleUnionType(context, expressions.map(v => v.getTypeUnlessCycle(context)));
        if(itemType === undefined) itemType = new AnyType();
        return new ListType(itemType);
    }

    computeConflicts() {}

    compile(context: Context):Step[] {
        return [ 
            new Action(this),
            ...this.values.reduce((steps: Step[], item) => [...steps, ...item.compile(context)], []),
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

    clone(original?: Node, replacement?: Node) { 
        return new ListLiteral(
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.values.map(v => v.cloneOrReplace([ Expression, Unparsable ], original, replacement)), 
            this.close.cloneOrReplace([ Token ], original, replacement)
         ) as this; 
    }

}
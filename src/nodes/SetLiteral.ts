import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Set from "../runtime/Set";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import { getPossibleUnionType, TypeSet } from "./UnionType";
import SetType from "./SetType";
import AnyType from "./AnyType";
import type Bind from "./Bind";

export default class SetLiteral extends Expression {

    readonly open: Token;
    readonly values: (Unparsable|Expression)[];
    readonly close: Token | Unparsable;

    constructor(open: Token, values: (Unparsable|Expression)[], close: Token | Unparsable) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
        
    }

    computeChildren() {
        return [ this.open, ...this.values, this.close ];
    }
    computeConflicts() {}

    computeType(context: Context): Type {
        let type = getPossibleUnionType(context, this.values.map(v => (v as Expression | Unparsable).getTypeUnlessCycle(context)));
        if(type === undefined) type = new AnyType();        
        return new SetType(undefined, undefined, type);
    }

    compile(context: Context):Step[] {
        return [
            new Start(this),
            // Evaluate all of the item or key/value expressions
            ...this.values.reduce(
                (steps: Step[], item) => [
                    ...steps, 
                    ...(item as Expression).compile(context)
                ], []),
            // Then build the set or map.
            new Finish(this)
        ];
    }

    getStartExplanations() { 
        return {
            "eng": "Start evaluating all the set items."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now that we have all the set items, make the set."
        }
    }

    evaluate(evaluator: Evaluator): Value {

        // Pop all of the values. Order doesn't matter.
        const values = [];
        for(let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue(undefined));
        return new Set(values);
            
    }

    clone(original?: Node, replacement?: Node) { 
        return new SetLiteral(
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.values.map(v => v.cloneOrReplace([ Expression, Unparsable ], original, replacement)), 
            this.close.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.values.forEach(val => { if(val instanceof Expression) val.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

}
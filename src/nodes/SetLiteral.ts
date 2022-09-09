import Expression from "./Expression";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import SetValue from "../runtime/SetValue";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type { ConflictContext } from "./Node";
import { getPossibleUnionType } from "./UnionType";
import SetType from "./SetType";

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

    computeType(context: ConflictContext): Type {

        const values = this.values.filter(v => !(v instanceof Unparsable)) as Expression[];
        if(values.length === 0) return new UnknownType(this);

        let type = getPossibleUnionType(context, this.values.map(v => (v as Expression | Unparsable).getTypeUnlessCycle(context)));
        if(type === undefined) type = new UnknownType(this);
        
        return new SetType(undefined, undefined, type);

    }

    compile(context: ConflictContext):Step[] {
        return [
            new Action(this),
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

    evaluate(evaluator: Evaluator): Value {

        // Pop all of the values. Order doesn't matter.
        const values = [];
        for(let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue());
        return new SetValue(values);
            
    }

}
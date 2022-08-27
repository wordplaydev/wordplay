import type Conflict from "../conflicts/Conflict";
import Bool from "../runtime/Bool";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Finish from "../runtime/Finish";
import Halt from "../runtime/Halt";
import type Step from "../runtime/Step";
import type Value from "../runtime/Value";
import BooleanType from "./BooleanType";
import Expression from "./Expression";
import type { ConflictContext } from "./Node";
import type Token from "./Token";
import type Type from "./Type";
import Unparsable from "./Unparsable";

export default class Is extends Expression {

    readonly operator: Token;
    readonly left: Expression;
    readonly right: Type | Unparsable;

    constructor(left: Expression, operator: Token, right: Type | Unparsable, ) {
        super();

        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    getChildren() {
        return [ this.left, this.operator, this.right ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    getType(context: ConflictContext): Type { return new BooleanType(); }
    
    compile(context: ConflictContext): Step[] {
        return this.right instanceof Unparsable ? [ new Halt(new Exception(this, ExceptionKind.UNPARSABLE), this) ] : [ ...this.left.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {

        const left = evaluator.popValue();

        return this.right instanceof Unparsable ? 
            new Exception(this, ExceptionKind.UNPARSABLE) : 
            new Bool(left.getType().isCompatible(evaluator.getContext(), this.right));

    }

}
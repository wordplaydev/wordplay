import Bool from "../runtime/Bool";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Finish from "../runtime/Finish";
import Halt from "../runtime/Halt";
import type Step from "../runtime/Step";
import type Value from "../runtime/Value";
import BooleanType from "./BooleanType";
import Expression from "./Expression";
import type Context from "./Context";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import Unparsable from "./Unparsable";

export default class Is extends Expression {

    readonly operator: Token;
    readonly left: Expression | Unparsable;
    readonly right: Type | Unparsable;

    constructor(left: Expression | Unparsable, operator: Token, right: Type | Unparsable, ) {
        super();

        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    computeChildren() { return [ this.left, this.operator, this.right ]; }
    computeType() { return new BooleanType(); }
    computeConflicts() {}
    
    compile(context: Context): Step[] {
        return this.right instanceof Unparsable ? [ new Halt(new Exception(this, ExceptionKind.UNPARSABLE), this) ] : [ ...this.left.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {

        const left = evaluator.popValue();

        return this.right instanceof Unparsable ? 
            new Exception(this, ExceptionKind.UNPARSABLE) : 
            new Bool(left.getType().isCompatible(this.right, evaluator.getContext()));

    }

    clone(original?: Node, replacement?: Node) { 
        return new Is(
            this.left.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.operator.cloneOrReplace([ Token ], original, replacement),
            this.right.cloneOrReplace([ Unparsable, Type ], original, replacement)
        ) as this; 
    }

}
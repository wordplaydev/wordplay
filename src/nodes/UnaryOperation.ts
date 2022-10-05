import BooleanType from "./BooleanType";
import type Conflict from "../conflicts/Conflict";
import { IncompatibleOperand } from "../conflicts/IncompatibleOperand";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Bool from "../runtime/Bool";
import Measurement from "../runtime/Measurement";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import type Bind from "./Bind";
import { NOT_SYMBOL } from "../parser/Tokenizer";
import type { TypeSet } from "./UnionType";
import FunctionException from "../runtime/FunctionException";

export default class UnaryOperation extends Expression {

    readonly operator: Token;
    readonly operand: Expression | Unparsable;

    constructor(operator: Token, operand: Expression|Unparsable) {
        super();

        this.operator = operator;
        this.operand = operand;
    }

    getOperator() { return this.operator.text.toString(); }

    computeChildren() {
        return [ this.operator, this.operand ];
    }

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts = [];

        // If the type is unknown, that's bad.
        const type = this.operand instanceof Expression ? this.operand.getTypeUnlessCycle(context) : undefined;

        // If the type doesn't match the operator, that's bad.
        if(this.operand instanceof Expression && type !== undefined && (this.operator.text.toString() === "√" || this.operator.text.toString() === "-") && !(type instanceof MeasurementType))
            conflicts.push(new IncompatibleOperand(this, this.operator, this.operand, type, new MeasurementType()));
        else if(this.operand instanceof Expression && type !== undefined && this.operator.text.toString() === "¬" && !(type instanceof BooleanType))
            conflicts.push(new IncompatibleOperand(this, this.operator, this.operand, type, new BooleanType()));

        return conflicts;
    
    }

    computeType(context: Context): Type {
        if(this.operator.text.toString() === "¬" || this.operator.text.toString() === "~") return new BooleanType();
        else if(this.operator.text.toString() === "√" && this.operand instanceof Expression) {
            const type = this.operand.getTypeUnlessCycle(context);
            if(!(type instanceof MeasurementType)) return new UnknownType(this);
            if(type.unit ===  undefined || type.unit instanceof Unparsable) return type;
            return new MeasurementType(undefined, type.unit.sqrt());
        } 
        else if(this.operator.text.toString() === "-" && this.operand instanceof Expression)
            return this.operand.getTypeUnlessCycle(context);
        else return new UnknownType(this);
    }
    
    compile(context: Context):Step[] {
        return [
            new Start(this),
            ...this.operand.compile(context),
            new Finish(this)
        ];
    }

    getStartExplanations() { 
        return {
            "eng": "First we evsluate the operand."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now that we have the operand, we operate on it."
        }
    }

    evaluate(evaluator: Evaluator): Value {

        // Get the value of the operand.
        const value = evaluator.popValue(undefined);

        // Evaluate the function on the value.
        return value instanceof Measurement || value instanceof Bool ?
            value.evaluatePrefix(evaluator, this) :
            new FunctionException(evaluator, this, value, this.operator.getText());

    }

    clone(original?: Node, replacement?: Node) { 
        return new UnaryOperation(
            this.operator.cloneOrReplace([ Token ], original, replacement), 
            this.operand.cloneOrReplace([ Expression, Unparsable ], original, replacement)
        ) as this; 
    }

    /** 
     * Logical negations take the set complement of the current set from the original.
     * */
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 

        // We only manipulate possible types for logical negation operators.
        if(this.operator.getText() !== NOT_SYMBOL || this.operand instanceof Unparsable) return current;

        // Get the possible types of the operand.
        const possible = this.operand.evaluateTypeSet(bind, original, current, context);

        // Return the difference between the original types and the possible types, 
        return original.difference(possible, context);

    }
    
}
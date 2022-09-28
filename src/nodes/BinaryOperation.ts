import BooleanType from "./BooleanType";
import type Conflict from "../conflicts/Conflict";
import { IncompatibleUnits } from "../conflicts/IncompatibleUnits";
import { IncompatibleOperand } from "../conflicts/IncompatibleOperand";
import Expression from "./Expression";
import MeasurementLiteral from "./MeasurementLiteral";
import MeasurementType from "./MeasurementType";
import Token from "./Token";
import type Type from "./Type";
import UnaryOperation from "./UnaryOperation";
import Unit from "./Unit";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "src/runtime/Evaluator";
import Measurement from "../runtime/Measurement";
import Bool from "../runtime/Bool";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Value from "../runtime/Value";
import type Context from "./Context";
import type Node from "./Node";
import { AND_SYMBOL, OR_SYMBOL } from "../parser/Tokenizer";
import OrderOfOperations from "../conflicts/OrderOfOperations";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import FunctionException from "../runtime/FunctionException";
import JumpIf from "../runtime/JumpIf";

export default class BinaryOperation extends Expression {

    readonly operator: Token;
    readonly left: Expression | Unparsable;
    readonly right: Expression | Unparsable;

    constructor(operator: Token, left: Expression | Unparsable, right: Expression | Unparsable) {
        super();

        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    getOperator() { return this.operator.text.toString(); }

    computeChildren() {
        return [ this.left, this.operator, this.right ];
    }

    computeConflicts(context: Context): Conflict[] { 

        const conflicts = [];

        if(this.left instanceof BinaryOperation && this.operator.getText() !== this.left.operator.getText())
            conflicts.push(new OrderOfOperations(this.left, this));

        const leftType = this.left instanceof Expression ? this.left.getTypeUnlessCycle(context) : undefined;
        const rightType = this.right instanceof Expression ? this.right.getTypeUnlessCycle(context) : undefined;

        // Left and right must be compatible measurements.
        switch(this.operator.text.toString()) {
            case "×":
            case "·":
            case "÷":
            case "%":
            case "^":
                // Both operands must be measurement types.
                if(this.left instanceof Expression && leftType !== undefined && !(leftType instanceof MeasurementType)) conflicts.push(new IncompatibleOperand(this, this.operator, this.left, leftType, new MeasurementType()));
                if(this.right instanceof Expression && rightType !== undefined && !(rightType instanceof MeasurementType)) conflicts.push(new IncompatibleOperand(this, this.operator, this.right, rightType, new MeasurementType()));
                break;
            case "-":
            case "+":
            case "<":
            case ">":
            case "≤":
            case "≥":
                // Both operands must be measurement types.
                if(this.left instanceof Expression && leftType !== undefined && !(leftType instanceof MeasurementType)) conflicts.push(new IncompatibleOperand(this, this.operator, this.left, leftType, new MeasurementType()));
                if(this.right instanceof Expression && rightType !== undefined && !(rightType instanceof MeasurementType)) conflicts.push(new IncompatibleOperand(this, this.operator, this.right, rightType, new MeasurementType()));
                // Both operands must have compatible units.
                if(leftType instanceof MeasurementType && rightType instanceof MeasurementType && !leftType.isCompatible(rightType))
                    conflicts.push(new IncompatibleUnits(this, leftType, rightType));
                break;
            case "≠":
            case "=":
                // Must be compatible types?
                if(leftType !== undefined && rightType !== undefined && !(this.right instanceof Unparsable) && !leftType.isCompatible(rightType, context))
                    return [ new IncompatibleOperand(this, this.operator, this.right, rightType, leftType) ];
                break;
            case AND_SYMBOL:
            case OR_SYMBOL:
                if(this.left instanceof Expression && leftType !== undefined && !(leftType instanceof BooleanType)) conflicts.push(new IncompatibleOperand(this, this.operator, this.left, leftType, new BooleanType()));
                if(this.right instanceof Expression && rightType !== undefined && !(rightType instanceof BooleanType)) conflicts.push(new IncompatibleOperand(this, this.operator, this.right, rightType, new BooleanType()));
                break;
        }

        return conflicts;
    
    }

    computeType(context: Context): Type {
        const leftType = this.left instanceof Expression ? this.left.getTypeUnlessCycle(context) : undefined;
        const rightType = this.right instanceof Expression ? this.right.getTypeUnlessCycle(context) : undefined;

        switch(this.operator.text.toString()) {
            case "-":
            case "+":
                if(!(leftType instanceof MeasurementType)) return new UnknownType(this);
                if(!(rightType instanceof MeasurementType)) return new UnknownType(this);
                if(leftType.unit instanceof Unparsable || rightType.unit instanceof Unparsable) return new UnknownType(this);

                if(leftType.unit === undefined && rightType.unit === undefined) return leftType;
                else if(leftType.unit !== undefined && rightType.unit === undefined) return new UnknownType(this);
                else if(leftType.unit === undefined && rightType.unit !== undefined) return new UnknownType(this);
                else return leftType.isCompatible(rightType) ? leftType : new UnknownType(this);
            case "×":
            case "·":
                if(!(leftType instanceof MeasurementType)) return new UnknownType(this);
                if(!(rightType instanceof MeasurementType)) return new UnknownType(this);
                if(leftType.unit instanceof Unparsable || rightType.unit instanceof Unparsable) return new UnknownType(this);

                // If one side is unitless, units don't change.
                if(leftType.unit === undefined && rightType.unit !== undefined) return rightType;
                else if(leftType.unit === undefined || rightType.unit === undefined) return leftType;
                // Otherwise, we combine the numerators and denominators.
                else {
                    return new MeasurementType(
                        undefined, 
                        new Unit(
                            leftType.unit.numerator.concat(rightType.unit.numerator), 
                            leftType.unit.denominator.concat(rightType.unit.denominator)
                        )
                    );
                }
            case "÷":
                if(!(leftType instanceof MeasurementType)) return new UnknownType(this);
                if(!(rightType instanceof MeasurementType)) return new UnknownType(this);
                if(leftType.unit instanceof Unparsable || rightType.unit instanceof Unparsable) return new UnknownType(this);

                // If the denominator is unitless, the type is the numerator.
                if(rightType.unit === undefined) return leftType;
                // If the numerator is unitless, flip the right
                else if(leftType.unit === undefined) {
                    if(rightType.unit instanceof Token) return new MeasurementType(undefined, new Unit([ rightType.unit.text.toString()], []));
                    else return new MeasurementType(undefined, new Unit(rightType.unit.denominator, rightType.unit.numerator)); 
                }
                // If neither are unitless, flip the right and combine it.
                else {
                    return new MeasurementType(
                        undefined, 
                        new Unit(
                            leftType.unit.numerator.concat(rightType.unit.denominator), 
                            leftType.unit.denominator.concat(rightType.unit.numerator)
                        )
                    );
                }
            case "%":
                if(!(leftType instanceof MeasurementType)) return new UnknownType(this);
                // Modulo preserves the left's type.
                return leftType;
            case "^":
                if(!(leftType instanceof MeasurementType)) return new UnknownType(this);
                if(!(rightType instanceof MeasurementType)) return new UnknownType(this);
                if(leftType.unit instanceof Unparsable || rightType.unit instanceof Unparsable) return new UnknownType(this);

                // If both sides or unitless, just propagate the left.
                if(leftType.unit === undefined && rightType.unit === undefined) return leftType;
                // If left has a unit and the right does not, duplicate the units the number of times of the power
                else if(leftType.unit !== undefined && rightType.unit === undefined) {
                    // If the exponent is computed, we can't know the resulting type.
                    // But we can special case literals and negated literals.
                    let exponent = undefined;
                    if(this.right instanceof MeasurementLiteral && this.right.isInteger())
                        exponent = parseInt(this.right.number.text.toString());
                    else if(this.right instanceof UnaryOperation && this.right.operand instanceof MeasurementLiteral && this.right.operand.isInteger())
                        exponent = parseInt(this.right.operand.number.text.toString());
                    if(exponent === undefined) return new UnknownType(this);
                    // If the exponent is an integer, then we can compute it.
                    let newNumerator = leftType.unit.numerator;
                    let newDenominator = leftType.unit.denominator;
                    if(exponent > 1) {
                        for(let i = 0; i < exponent - 1; i++) {
                            newNumerator = newNumerator.concat(leftType.unit.numerator);
                            newDenominator = newDenominator.concat(leftType.unit.denominator);
                        }
                    }
                    else if(exponent === 0) {
                        return new MeasurementType(undefined, new Unit([], []));
                    }
                    else if(exponent < -1) {
                        for(let i = 0; i < -exponent + 1; i++) {
                            newNumerator = newNumerator.concat(leftType.unit.denominator);
                            newDenominator = newDenominator.concat(leftType.unit.numerator);
                        }
                    }
                    return new MeasurementType(undefined, new Unit(newNumerator, newDenominator));
                } 
                // Otherwise, undefined: exponents can't have units.
                else return new UnknownType(this);
            case "<":
            case ">":
            case "≤":
            case "≥":
            case "=":
            case "≠":
            case "∧":
            case "∨":
                return new BooleanType();
            default:
                return new UnknownType(this);
        }
    }

    compile(context: Context): Step[] {

        const left = this.left.compile(context);
        const right = this.right.compile(context);

        // Logical and is short circuited: if the left is false, we do not evaluate the right.
        if(this.operator.getText() === AND_SYMBOL) {
            return [ 
                new Start(this), 
                ...left,
                // Jump past the right's instructions if false and just push a false on the stack.
                new JumpIf(right.length + 1, true, false, this),
                ...right, 
                new Finish(this)
            ];
        }
        // Logical OR is short circuited: if the left is true, we do not evaluate the right.
        else if(this.operator.getText() === OR_SYMBOL) {
            return [ 
                new Start(this), 
                ...left,
                // Jump past the right's instructions if true and just push a true on the stack.
                new JumpIf(right.length + 1, true, true, this),
                ...right, 
                new Finish(this)
            ];
        }
        else
            return [ new Start(this), ...left, ...right, new Finish(this) ];
    }

    getStartExplanations() { 
        return {
            "eng": "We first evaluate the left and right."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "We end by performing the operation on the left and right."
        }
    }

    evaluate(evaluator: Evaluator): Value {

        const right = evaluator.popValue(undefined);
        const left = evaluator.popValue(undefined);

        // Ask the value to evaluate it. We could do this here, but it's
        // just cleaner to delegate it to specific types.
        if(left instanceof Measurement || left instanceof Bool)
            return left.evaluateInfix(evaluator, this, right);
        // Process equality and inequality
        else if(this.operator.getText() === "=")
            return new Bool(left.toString() === right.toString());
        else if(this.operator.getText() === "≠")
            return new Bool(left.toString() !== right.toString());
        else
            return new FunctionException(evaluator, left, this.operator.getText());

    }

    clone(original?: Node, replacement?: Node) { 
        return new BinaryOperation(
            this.operator.cloneOrReplace([ Token ], original, replacement), 
            this.left.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.right.cloneOrReplace([ Expression, Unparsable ], original, replacement)
        ) as this; 
    }

    /** 
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 

        // If conjunction, then we compute the intersection of the left and right's possible types.
        // Note that we pass the left's possible types because we don't evaluate the right if the left isn't true.
        if(this.operator.getText() === AND_SYMBOL) {
            const left = this.left instanceof Unparsable ? current : this.left.evaluateTypeSet(bind, original, current, context);
            const right = this.right instanceof Unparsable ? current : this.right.evaluateTypeSet(bind, original, left, context);
            return left.intersection(right, context);
        }
        // If disjunction of type checks, then we return the union.
        // Note that we pass the left's possible types because we don't evaluate the right if the left is true.
        else if(this.operator.getText() === OR_SYMBOL) {
            const left = this.left instanceof Unparsable ? current : this.left.evaluateTypeSet(bind, original, current, context);
            const right = this.right instanceof Unparsable ? current : this.right.evaluateTypeSet(bind, original, left, context);
            return left.union(right, context);
        }
        // Otherwise, just pass the types down and return the original types.
        else {
            if(!(this.left instanceof Unparsable)) this.left.evaluateTypeSet(bind, original, current, context);
            if(!(this.right instanceof Unparsable)) this.right.evaluateTypeSet(bind, original, current, context);
            return current;
        }
    
    }

}
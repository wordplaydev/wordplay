import BooleanType from "./BooleanType";
import Conflict, { IncompatibleOperand, IncompatibleUnits, LeftToRightOrderOfOperations, UnknownName } from "../parser/Conflict";
import Expression from "./Expression";
import MeasurementLiteral from "./MeasurementLiteral";
import MeasurementType from "./MeasurementType";
import type Program from "./Program";
import Token, { TokenType } from "./Token";
import type Type from "./Type";
import UnaryOperation from "./UnaryOperation";
import Unit from "./Unit";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "src/runtime/Evaluator";
import Measurement from "../runtime/Measurement";
import Exception, { ExceptionType } from "../runtime/Exception";
import Bool from "../runtime/Bool";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Value from "../runtime/Value";

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

    getChildren() {
        return [ this.left, this.operator, this.right ];
    }

    getConflicts(program: Program): Conflict[] { 

        const conflicts = [];

        const leftType = this.left instanceof Expression ? this.left.getType(program) : undefined;
        const rightType = this.right instanceof Expression ? this.right.getType(program) : undefined;

        const operators = new Set(this.nodes().filter(n => n instanceof Token && n.is(TokenType.BINARY_OP)).map(n => (n as Token).text));
        if(operators.size > 1)
            conflicts.push(new LeftToRightOrderOfOperations(this));

        // Left and right must be compatible measurements.
        switch(this.operator.text) {
            case "×":
            case "*":
            case "·":
            case "÷":
            case "%":
            case "^":
                // Both operands must be measurement types.
                if(this.left instanceof Expression && !(leftType instanceof MeasurementType)) conflicts.push(new IncompatibleOperand(this.left, this.operator, new MeasurementType()));
                if(this.right instanceof Expression && !(rightType instanceof MeasurementType)) conflicts.push(new IncompatibleOperand(this.right, this.operator, new MeasurementType()));
                break;
            case "-":
            case "+":
            case "<":
            case ">":
            case "≤":
            case "≥":
            case "=":
            case "≠":
                // Both operands must be measurement types.
                if(this.left instanceof Expression && !(leftType instanceof MeasurementType)) conflicts.push(new IncompatibleOperand(this.left, this.operator, new MeasurementType()));
                if(this.right instanceof Expression && !(rightType instanceof MeasurementType)) conflicts.push(new IncompatibleOperand(this.right, this.operator, new MeasurementType()));
                // Both operands must have compatible types.
                if(leftType !== undefined && rightType !== undefined && !leftType.isCompatible(program, rightType))
                    conflicts.push(new IncompatibleUnits(this));
                break;
            case "∧":
            case "∨":
                if(this.left instanceof Expression && !(leftType instanceof BooleanType)) conflicts.push(new IncompatibleOperand(this.left, this.operator, new BooleanType()));
                if(this.right instanceof Expression && !(rightType instanceof BooleanType)) conflicts.push(new IncompatibleOperand(this.right, this.operator, new BooleanType()));
                break;
        }

        return conflicts;
    
    }

    getType(program: Program): Type {
        const leftType = this.left instanceof Expression ? this.left.getType(program) : undefined;
        const rightType = this.right instanceof Expression ? this.right.getType(program) : undefined;

        if(!(leftType instanceof MeasurementType)) return new UnknownType(this);
        if(!(rightType instanceof MeasurementType)) return new UnknownType(this);

        if(leftType.unit instanceof Unparsable || rightType.unit instanceof Unparsable) return new UnknownType(this);

        // The below assumes that units match.
        switch(this.operator.text) {
            case "-":
            case "+":
                if(leftType.unit === undefined && rightType.unit === undefined) return leftType;
                else if(leftType.unit !== undefined && rightType.unit === undefined) return new UnknownType(this);
                else if(leftType.unit === undefined && rightType.unit !== undefined) return new UnknownType(this);
                else return leftType.isCompatible(program, rightType) ? leftType : new UnknownType(this);
            case "×":
            case "*":
            case "·":
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
                // If the denominator is unitless, the type is the numerator.
                if(rightType.unit === undefined) return leftType;
                // If the numerator is unitless, flip the right
                else if(leftType.unit === undefined) {
                    if(rightType.unit instanceof Token) return new MeasurementType(undefined, new Unit([ rightType.unit.text], []));
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
                // Modulo preserves the left's type.
                return leftType;
            case "^":
                // If both sides or unitless, just propagate the left.
                if(leftType.unit === undefined && rightType.unit === undefined) return leftType;
                // If left has a unit and the right does not, duplicate the units the number of times of the power
                else if(leftType.unit !== undefined && rightType.unit === undefined) {
                    // If the exponent is computed, we can't know the resulting type.
                    // But we can special case literals and negated literals.
                    let exponent = undefined;
                    if(this.right instanceof MeasurementLiteral && this.right.isInteger())
                        exponent = parseInt(this.right.number.text);
                    else if(this.right instanceof UnaryOperation && this.right.operand instanceof MeasurementLiteral && this.right.operand.isInteger())
                        exponent = parseInt(this.right.operand.number.text);
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

    compile(): Step[] {
        return [ new Start(this), ...this.left.compile(), ...this.right.compile(), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {

        const right = evaluator.popValue();
        const left = evaluator.popValue();

        // Ask the value to evaluate it. We could do this here, but it's
        // just cleaner to delegate it to specific types.
        if(left instanceof Measurement || left instanceof Bool)
            return left.evaluateInfix(this.operator.text, right);
        // Process equality and inequality
        else if(this.operator.text === "=")
            return new Bool(left.toString() === right.toString());
        else if(this.operator.text === "≠")
            return new Bool(left.toString() !== right.toString());
        else
            return new Exception(ExceptionType.UNKNOWN_OPERATOR);

    }

}
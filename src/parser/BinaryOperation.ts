import BooleanType from "./BooleanType";
import Conflict from "./Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import type { Token } from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";

export default class BinaryOperation extends Expression {

    readonly operator: Token;
    readonly left: Expression;
    readonly right: Expression | Unparsable;

    constructor(operator: Token, left: Expression, right: Expression | Unparsable) {
        super();

        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    getChildren() {
        return [ this.left, this.operator, this.right ];
    }

    getConflicts(program: Program): Conflict[] { 

        const leftType = this.left.getType(program);
        const rightType = this.right instanceof Expression ? this.right.getType(program) : undefined;

        if(rightType === undefined) return [];

        // Left and right must be numbers
        switch(this.operator.text) {
            case "-":
            case "+":
            case "×":
            case "*":
            case "·":
            case "÷":
            case "%":
            case "^":
            case "<":
            case ">":
            case "≤":
            case "≥":
            case "=":
            case "≠":
                if(!(leftType instanceof MeasurementType) || !(rightType instanceof MeasurementType))
                    return [ new Conflict(this, SemanticConflict.ARITHMETIC_REQUIRES_NUMBERS)]
                // Need to verify units
                break;
            case "∧":
            case "∨":
                if(!(leftType instanceof BooleanType) || !(rightType instanceof BooleanType))
                    return [ new Conflict(this, SemanticConflict.LOGIC_REQUIRES_BOOLEANS)]
                break;
        }

        return [];
    
    }

    getType(program: Program): Type {
        switch(this.operator.text) {
            case "-":
            case "+":
            case "×":
            case "*":
            case "·":
            case "÷":
            case "%":
            case "^":
                // This is wrong; it doesn't account for units.
                return this.left.getType(program);
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

}
import BooleanType from "./BooleanType";
import Conflict, { IncompatibleOperand } from "../parser/Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import Unit from "./Unit";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionType } from "../runtime/Exception";
import Bool from "../runtime/Bool";
import Measurement from "../runtime/Measurement";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type { ConflictContext } from "./Node";

export default class UnaryOperation extends Expression {

    readonly operator: Token;
    readonly operand: Expression | Unparsable;

    constructor(operator: Token, value: Expression|Unparsable) {
        super();

        this.operator = operator;
        this.operand = value;
    }

    getChildren() {
        return [ this.operator, this.operand ];
    }

    getConflicts(context: ConflictContext): Conflict[] { 
    
        const conflicts = [];

        // If the type is unknown, that's bad.
        const type = this.operand instanceof Expression ? this.operand.getType(context) : undefined;

        // If the type doesn't match the operator, that's bad.
        if(this.operand instanceof Expression && (this.operator.text === "√" || this.operator.text === "-") && !(type instanceof MeasurementType))
            conflicts.push(new IncompatibleOperand(this, type, new MeasurementType()));
        else if(this.operand instanceof Expression && this.operator.text === "¬" && !(type instanceof BooleanType))
            conflicts.push(new IncompatibleOperand(this, type, new BooleanType()));

        return conflicts;
    
    }

    getType(context: ConflictContext): Type {
        if(this.operator.text === "¬") return new BooleanType();
        else if(this.operator.text === "√" && this.operand instanceof Expression) {
            const type = this.operand.getType(context);
            if(!(type instanceof MeasurementType)) return new UnknownType(this);
            if(type.unit ===  undefined || type.unit instanceof Unparsable) return type;
            const newNumerator = type.unit.numerator.slice();
            const newDenominator = type.unit.denominator.slice();
            // If it has a unit, remove one of each unique unit on the numerator, and if it's the last one, move it to the denominator.
            // For example:
            //   m·m·m => m·m
            //   m => 1/m
            //   1/m => 1/m·m
            const numeratorUnits = [ ... new Set(type.unit.numerator) ];
            const denominatorUnits = [ ... new Set(type.unit.denominator) ];
            // Remove one of each numerator unit from the numerator.
            numeratorUnits.forEach(u => newNumerator.splice(newNumerator.indexOf(u), 1));
            // Add an extra of each denominator unit to the denominator.
            denominatorUnits.forEach(u => newDenominator.push(u));
            // For each numerator unit no longer in the numerator, add one unit to the denominator.
            numeratorUnits.forEach(u => { if(newNumerator.indexOf(u) < 0) newDenominator.push(u); });
            return new MeasurementType(undefined, new Unit(newNumerator, newDenominator));
        } 
        else if(this.operator.text === "-" && this.operand instanceof Expression)
            return this.operand.getType(context);
        else return new UnknownType(this);
    }
    
    compile(): Step[] {
        return [
            new Start(this),
            ...this.operand.compile(),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value {

        // Get the value of the operand.
        const value = evaluator.popValue();

        // Evaluate the function on the value.
        return value instanceof Measurement || value instanceof Bool ?
            value.evaluatePrefix(this.operator.text) :
            new Exception(ExceptionType.UNKNOWN_OPERATOR);

    }

}
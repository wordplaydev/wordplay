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

export default class UnaryOperation extends Expression {

    readonly operator: Token;
    readonly value: Expression | Unparsable;

    constructor(operator: Token, value: Expression|Unparsable) {
        super();

        this.operator = operator;
        this.value = value;
    }

    getChildren() {
        return [ this.operator, this.value ];
    }

    getConflicts(program: Program): Conflict[] { 
    
        const conflicts = [];

        // If the type is unknown, that's bad.
        const type = this.value instanceof Expression ? this.value.getType(program) : undefined;

        // If the type doesn't match the operator, that's bad.
        if(this.value instanceof Expression && (this.operator.text === "√" || this.operator.text === "-") && !(type instanceof MeasurementType))
            conflicts.push(new IncompatibleOperand(this.value, this.operator, new MeasurementType()));
        else if(this.value instanceof Expression && this.operator.text === "¬" && !(type instanceof BooleanType))
            conflicts.push(new IncompatibleOperand(this.value, this.operator, new BooleanType()));

        return conflicts;
    
    }

    getType(program: Program): Type {
        if(this.operator.text === "¬") return new BooleanType();
        else if(this.operator.text === "√" && this.value instanceof Expression) {
            const type = this.value.getType(program);
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
        else if(this.operator.text === "-" && this.value instanceof Expression)
            return this.value.getType(program);
        else return new UnknownType(this);
    }
    

}
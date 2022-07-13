import type Conflict from "./Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";

export default class Measurement extends Expression {
    
    readonly number: Token;
    readonly unit?: Token;

    constructor(number: Token, unit?: Token) {
        super();
        this.number = number;
        this.unit = unit;
    }

    getChildren() { return this.unit !== undefined ? [ this.number, this.unit ] : [ this.number ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        return new MeasurementType(undefined, this.unit);
    }

}
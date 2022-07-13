import type Conflict from "./Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import type Unit from "./Unit";
import Unparsable from "./Unparsable";

export default class Measurement extends Expression {
    
    readonly number: Token;
    readonly unit?: Unit | Unparsable;

    constructor(number: Token, unit?: Unit | Unparsable) {
        super();
        this.number = number;
        this.unit = unit;
    }

    getChildren() { return this.unit === undefined ? [ this.number ] : [ this.number, this.unit ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        return new MeasurementType(undefined, this.unit instanceof Unparsable ? undefined : this.unit);
    }

}
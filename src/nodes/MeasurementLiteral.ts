import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import Measurement from "../runtime/Measurement";
import type Value from "../runtime/Value";
import type Conflict from "../parser/Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import type Node from "./Node";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import Unit from "./Unit";
import Unparsable from "./Unparsable";

export default class MeasurementLiteral extends Expression {
    
    readonly number: Token;
    readonly unit?: Unit | Unparsable;

    constructor(number: Token, unit?: Unit | Unparsable) {
        super();
        this.number = number;
        this.unit = unit;
    }

    isInteger() { return !isNaN(parseInt(this.number.text)); }

    getChildren() { return this.unit === undefined ? [ this.number ] : [ this.number, this.unit ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        return new MeasurementType(undefined, this.unit instanceof Unparsable ? undefined : this.unit);
    }

    evaluate(evaluator: Evaluator): Node | Value {
        if(this.unit instanceof Unparsable) return new Exception(ExceptionType.UNPARSABLE);
        // This needs to translate between different number formats.
        else return new Measurement(parseFloat(this.number.text), this.unit === undefined ? new Unit([], []) : this.unit);
    }

}
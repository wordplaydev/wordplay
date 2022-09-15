import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Measurement from "../runtime/Measurement";
import type Value from "../runtime/Value";
import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import Unit from "./Unit";
import Unparsable from "./Unparsable";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type { ConflictContext } from "./Node";
import { NotANumber } from "../conflicts/NotANumber";

export default class MeasurementLiteral extends Expression {
    
    readonly number: Token;
    readonly unit: Unit | Unparsable;

    constructor(number: Token, unit?: Unit | Unparsable) {
        super();
        this.number = number;
        this.unit = unit ?? new Unit();
    }

    isInteger() { return !isNaN(parseInt(this.number.text.toString())); }

    computeChildren() { return this.unit === undefined ? [ this.number ] : [ this.number, this.unit ]; }

    computeConflicts(context: ConflictContext): Conflict[] { 
    
        if(new Measurement(this.number).num.isNaN())
            return [ new NotANumber(this) ];
        else
            return []; 
    
    }

    computeType(context: ConflictContext): Type {
        return new MeasurementType(undefined, this.unit instanceof Unparsable ? undefined : this.unit);
    }

    compile(context: ConflictContext):Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        if(this.unit instanceof Unparsable) return new Exception(this, ExceptionKind.UNPARSABLE);
        // This needs to translate between different number formats.
        else return new Measurement(this.number, this.unit);
    }

    clone(original?: Node, replacement?: Node) { 
        return new MeasurementLiteral(
            this.number.cloneOrReplace([ Token ], original, replacement), 
            this.unit?.cloneOrReplace([ Unit, Unparsable ], original, replacement)
        ) as this; 
    }

}
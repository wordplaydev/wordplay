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
import { NotANumber } from "../conflicts/NotANumber";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import type Evaluator from "../runtime/Evaluator";
import SemanticException from "../runtime/SemanticException";
import TokenType from "./TokenType";
import { getPossibleUnits } from "../transforms/getPossibleUnits";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";

export default class MeasurementLiteral extends Expression {
    
    readonly number: Token;
    readonly unit: Unit | Unparsable;

    constructor(number?: Token, unit?: Unit | Unparsable) {
        super();
        this.number = number ?? new Token("", [ TokenType.NUMBER ]);
        this.unit = unit ?? new Unit();
    }

    clone(original?: Node | string, replacement?: Node) { 
        return new MeasurementLiteral(
            this.cloneOrReplaceChild([ Token ], "number", this.number, original, replacement), 
            this.cloneOrReplaceChild([ Unit, Unparsable ], "unit", this.unit, original, replacement)
        ) as this; 
    }

    isInteger() { return !isNaN(parseInt(this.number.text.toString())); }

    computeChildren() { return this.unit === undefined ? [ this.number ] : [ this.number, this.unit ]; }

    computeConflicts(): Conflict[] { 
    
        if(new Measurement(this.number).num.isNaN())
            return [ new NotANumber(this) ];
        else
            return []; 
    
    }

    computeType(): Type {
        return new MeasurementType(undefined, this.unit instanceof Unparsable ? undefined : this.unit);
    }

    compile():Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        if(this.unit instanceof Unparsable) return new SemanticException(evaluator, this.unit);
        // This needs to translate between different number formats.
        else return new Measurement(this.number, this.unit);
    }

    getStartExplanations() { return this.getFinishExplanations(); }

    getFinishExplanations() {
        return {
            "eng": "Evaluate to a measurement!"
        }
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getDescriptions() {
        return {
            eng: "A number with an optional unit"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined {

        const project = context.source.getProject();
        // Any unit in the project
        if(child === this.unit && project !== undefined)
            return getPossibleUnits(project).map(unit => new Replace(context.source, child, unit));

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}
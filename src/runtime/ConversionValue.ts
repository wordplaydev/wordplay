import type ConversionDefinition from "../nodes/ConversionDefinition";
import type Evaluation from "./Evaluation";
import Value from "./Value";


export default class ConversionValue extends Value {

    /** The definition from the AST. */
    readonly definition: ConversionDefinition;
    
    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation;

    constructor(definition: ConversionDefinition, context: Evaluation) {
        super();

        this.definition = definition;
        this.context = context;
    }

    getType() { return this.definition.getType({ program: this.context.getEvaluator().program, shares: this.context.getEvaluator().getShares()}); }

    toString() { return this.definition.toWordplay(); }

}
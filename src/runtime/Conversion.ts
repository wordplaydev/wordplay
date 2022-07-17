import type ConversionDefinition from "../nodes/ConversionDefinition";
import type Evaluation from "./Evaluation";
import Value from "./Value";


// We could have just called this Function, but Javascript claims that globally.
export default class Conversion extends Value {

    /** The definition from the AST. */
    readonly definition: ConversionDefinition;
    
    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation;

    constructor(definition: ConversionDefinition, context: Evaluation) {
        super();

        this.definition = definition;
        this.context = context;
    }

    toString() { return this.definition.toWordplay(); }

}
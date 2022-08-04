import type FunctionDefinition from "../nodes/FunctionDefinition";
import type Evaluation from "./Evaluation";
import Value from "./Value";

// We could have just called this Function, but Javascript claims that globally.
export default class FunctionValue extends Value {

    /** The definition from the AST. */
    readonly definition: FunctionDefinition;
    
    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation;

    constructor(definition: FunctionDefinition, context: Evaluation) {
        super();

        this.definition = definition;
        this.context = context;
    }

    getType() { return this.definition.getType({ program: this.context.getEvaluator().program, shares: this.context.getEvaluator().getShares() }); }

    toString() { return this.definition.toWordplay(); }

}
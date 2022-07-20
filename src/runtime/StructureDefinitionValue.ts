import type StructureDefinition from "../nodes/StructureDefinition";
import type Evaluation from "./Evaluation";
import Value from "./Value";


// We could have just called this Function, but Javascript claims that globally.
export default class StructureDefinitionValue extends Value {

    /** The definition from the AST. */
    readonly definition: StructureDefinition;
    
    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation;

    constructor(definition: StructureDefinition, context: Evaluation) {
        super();

        this.definition = definition;
        this.context = context;
    }

    toString() { return this.definition.toWordplay(); }

}
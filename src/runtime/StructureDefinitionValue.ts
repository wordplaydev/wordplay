import type StructureDefinition from "../nodes/StructureDefinition";
import StructureType from "../nodes/StructureType";
import type Evaluation from "./Evaluation";
import Value from "./Value";


export default class StructureDefinitionValue extends Value {

    /** The definition from the AST. */
    readonly definition: StructureDefinition;
    
    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | undefined;

    constructor(definition: StructureDefinition, context?: Evaluation) {
        super();

        this.definition = definition;
        this.context = context;
    }

    getType() { return new StructureType(this.definition); }

    toString() { return this.definition.toWordplay(); }

}
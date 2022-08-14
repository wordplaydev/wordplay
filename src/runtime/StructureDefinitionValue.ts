import type StructureDefinition from "../nodes/StructureDefinition";
import StructureType from "../nodes/StructureType";
import type Evaluation from "./Evaluation";
import Primitive from "./Primitive";

export default class StructureDefinitionValue extends Primitive {

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
    getNativeTypeName() { return "structuredefinition"; }

    toString() { return this.definition.toWordplay(); }

}
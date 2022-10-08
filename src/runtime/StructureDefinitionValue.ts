import type StructureDefinition from "../nodes/StructureDefinition";
import StructureType, { STRUCTURE_NATIVE_TYPE_NAME } from "../nodes/StructureType";
import type Evaluation from "./Evaluation";
import Primitive from "./Primitive";
import type Value from "./Value";

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
    
    getNativeTypeName() { return STRUCTURE_NATIVE_TYPE_NAME; }

    toString() { return this.definition.toWordplay(); }

    isEqualTo(value: Value): boolean {
        return value instanceof StructureDefinitionValue && this.definition === value.definition && this.context === value.context;
    }

}
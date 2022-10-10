import { CONVERSION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type ConversionDefinition from "../nodes/ConversionDefinition";
import Context from "../nodes/Context";
import type Evaluation from "./Evaluation";
import Primitive from "./Primitive";
import Value from "./Value";

export default class Conversion extends Primitive {
    /** The definition from the AST. */
    readonly definition: ConversionDefinition;
    
    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | Value;

    constructor(definition: ConversionDefinition, context: Evaluation | Value) {
        super();

        this.definition = definition;
        this.context = context;
    }

    getType() { 
        return this.context instanceof Value ? 
            this.context.getType() :
            this.definition.getTypeUnlessCycle(new Context(this.context.getEvaluator().getSource(), this.context.getEvaluator().getProgram(), this.context.getEvaluator().getShares())); 
    }

    getNativeTypeName(): string { return CONVERSION_NATIVE_TYPE_NAME; }

    toString() { return this.definition.toWordplay(); }

    isEqualTo(value: Value): boolean {
        return value instanceof Conversion && this.definition === value.definition && this.context === value.context;
    }

}
import { CONVERSION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type ConversionDefinition from "../nodes/ConversionDefinition";
import type Context from "../nodes/Context";
import type Evaluation from "./Evaluation";
import Primitive from "./Primitive";
import Value from "./Value";

export default class Conversion extends Primitive {
    /** The definition from the AST. */
    readonly definition: ConversionDefinition;
    
    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | Value;

    constructor(definition: ConversionDefinition, context: Evaluation | Value) {
        super(definition);

        this.definition = definition;
        this.context = context;
    }

    getType(context: Context) { 
        return this.context instanceof Value ? 
            this.context.getType(context) :
            this.definition.getTypeUnlessCycle(context); 
    }

    getNativeTypeName(): string { return CONVERSION_NATIVE_TYPE_NAME; }

    toString() { return this.definition.toWordplay(); }

    isEqualTo(value: Value): boolean {
        return value instanceof Conversion && this.definition === value.definition && this.context === value.context;
    }

}
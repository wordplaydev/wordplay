import { FUNCTION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Context from "../nodes/Context";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type Evaluation from "./Evaluation";
import Value from "./Value";

// We could have just called this Function, but Javascript claims that globally.
export default class FunctionValue extends Value {
    /** The definition from the AST. */
    readonly definition: FunctionDefinition;
    
    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | Value;

    constructor(definition: FunctionDefinition, context: Evaluation | Value) {
    super(definition);

        this.definition = definition;
        this.context = context;
    }

    getType(context: Context) { return this.context instanceof Value ? this.context.getType(context) : this.definition.getTypeUnlessCycle(context); }
    
    getNativeTypeName() { return FUNCTION_NATIVE_TYPE_NAME; }

    resolve() { return undefined; }

    toString() { return this.definition.toWordplay(); }

    isEqualTo(value: Value): boolean {
        return value instanceof FunctionValue && this.definition === value.definition && this.context === value.context;
    }

}
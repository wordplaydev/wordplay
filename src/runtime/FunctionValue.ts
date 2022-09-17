import { FUNCTION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
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
    super();

        this.definition = definition;
        this.context = context;
    }

    getType() { return this.context instanceof Value ? this.context.getType() : this.definition.getTypeUnlessCycle(this.context.getEvaluator().getContext()); }
    
    getNativeTypeName() { return FUNCTION_NATIVE_TYPE_NAME; }

    resolve() { return undefined; }

    toString() { return this.definition.toWordplay(); }

}
import type Evaluator from "./Evaluator";
import type Value from "./Value";
import type Step from "./Step";
import type Context from "../nodes/Context";

export default interface Evaluable {
    /** Evaluates one step of the node in the context of the given Evaluator.
     *  Returns a Value when done evaluating or the next node to evaluate. */
    evaluate(evaluator: Evaluator): Value | undefined;

    /** Compiles the evaluable into an executable list of Steps. */
    compile(context: Context): Step[];

}

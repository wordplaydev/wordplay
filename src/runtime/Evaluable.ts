import type Evaluator from "./Evaluator";
import type Value from "./Value";
import type Evaluation from "./Evaluation";
import type Step from "./Step";

export default interface Evaluable {
    /** Evaluates one step of the node in the context of the given Evaluator.
     *  Returns a Value when done evaluating or the next node to evaluate. */
    evaluate(evaluator: Evaluator): Value | Evaluation | undefined;

    /** Compiles the evaluable into an executable list of Steps. */
    compile(): Step[];

}

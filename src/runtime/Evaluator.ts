import type Program from "../nodes/Program";
import Evaluation, { type Evaluable } from "./Evaluation";
import Exception, { ExceptionType } from "./Exception";
import Value from "./Value";

export default class Evaluator {

    /** This represents a stack of values returned by evaluations. */
    values: Value[] = [];
    
    /** This represents a stack of node evaluations. The first element of the stack is the currently executing node. */
    evaluations: Evaluation[] = [];

    /** This is a list of previous evaluations, in reverse order of execution. */
    history: Evaluation[] = [];

    constructor(program: Program) {

        this.evaluations = [ new Evaluation(program) ];

    }

    /** Advance one step in execution. Returns false if there's nothing left to execute. */
    step(): boolean {

        // If it seems like we're stuck in an infinite (recursive) loop, halt.
        if(this.evaluations.length > 100000)
            return false;

        // If there's no node evaluating, we're done.
        if(this.evaluations.length === 0)
            return false;

        const evaluation = this.evaluations[0];

        // Evaluate the node.
        const result = evaluation.evaluate(this);

        // If the value is an instance of undefined, something went wrong. THis shouldn't be possible.
        // If it's a value, it's done evaluating. Remove it from the stack and push the value to the value stack.
        // Remember the evaluation we just finished.
        if(result instanceof Value) {

            // Save the value on the value stack.
            this.values.unshift(result);

            // If it was an exception, stop evaluating.
            if(result instanceof Exception)
                return false;

            // Otherwise, finish the evaluation and save it in the history.
            const finishedEvaluation = this.evaluations.shift();
            if(finishedEvaluation)
                this.history.unshift(finishedEvaluation);
        }
        // Otherwise, evaluate the node returned.
        else {
            this.evaluations.unshift(new Evaluation(result));
        }

        // If this particular frame has been stuck on the same node for a long time, there's a defect in a Node.evaluate() function.
        // All of them should execute a finite number of steps.
        if(evaluation.getCount() > 1000)
            return false;

        // Keep on evaluatin'
        return true;
    }

    /** Evaluate until we're done */
    evaluate(): Value | undefined{

        while(this.step());

        return this.values.shift();

    }

    justEvaluated(node: Evaluable) { return this.history.length > 0 && this.history[0].node === node; }
    lastEvaluated() { return this.history.length > 0 ? this.history[0].node : undefined; }

    popValue(): Value { 
        const value = this.values.shift(); 
        return value === undefined ? new Exception(ExceptionType.EXPECTED_VALUE) : value;
    }

}
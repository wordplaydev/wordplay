import type Program from "../nodes/Program";
import Evaluation from "./Evaluation";
import Exception, { ExceptionType } from "./Exception";
import Value from "./Value";

export default class Evaluator {
    
    /** This represents a stack of node evaluations. The first element of the stack is the currently executing node. */
    evaluations: Evaluation[] = [];

    constructor(program: Program) {

        this.evaluations = [ new Evaluation(program) ];

    }

    /** Advance one step in execution. Returns false if there's nothing left to execute. */
    step(): Value | undefined {

        // If it seems like we're stuck in an infinite (recursive) loop, halt.
        if(this.evaluations.length > 100000)
            return new Exception(ExceptionType.POSSIBLE_INFINITE_RECURSION);

        // If there's no node evaluating, we're done.
        if(this.evaluations.length === 0)
            return false;

        const evaluation = this.evaluations[0];

        // Evaluate the node.
        const result = evaluation.step(this);

        // If it's an exception, halt execution.
        if(result instanceof Exception)
            return result;
        // If it's a value, pop the evaluation off the stack and add the value to the 
        // vaule stack of the new top of the stack.
        else if(result instanceof Value) {
            this.endEvaluation();
            if(this.evaluations.length > 0)
                this.evaluations[0].pushValue(result);
            else return result;
        }
        // Otherwise, just keep steppin'

    }

    /** Evaluate until we're done */
    evaluate(): Value | undefined{

        while(true) {
            const value = this.step();
            if(value !== undefined) return value;
        }

    }

    /** Get the value on the top of the stack. */
    popValue(): Value { 
        return this.evaluations.length > 0 ? 
            this.evaluations[0].popValue() : 
            new Exception(ExceptionType.EXPECTED_VALUE);
    }

    /** Tell the current evaluation to jump to a new instruction. */
    jump(distance: number) {
        this.evaluations[0].jump(distance);
    }

    /** Start evaluation */
    endEvaluation() {
        this.evaluations.shift();
    }
    
    /** Start evaluation */
    startEvaluation(evaluation: Evaluation) {
        this.evaluations.unshift(evaluation);
    }

    /** Bind the given value to the given name in the context of the current evaluation. */
    bind(name: string, value: Value) {
        if(this.evaluations.length > 0)
            this.evaluations[0].bind(name, value);
    }

    /** Resolve the given name in the current execution context. */
    resolve(name: string): Value | undefined {
        return this.evaluations.length === 0 ? 
            undefined : 
            this.evaluations[0].resolve(name);
    }

    /** Get the context of the currently evaluating evaluation. */
    getEvaluationContext() {
        return this.evaluations.length === 0 ? 
            undefined :
            this.evaluations[0];
    }

}
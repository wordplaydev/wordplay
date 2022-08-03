import type Conditional from "../nodes/Conditional";
import Bool from "./Bool";
import type Evaluable from "./Evaluable";
import type Evaluator from "./Evaluator";
import Exception, { ExceptionType } from "./Exception";
import Step from "./Step";
import type Value from "./Value";

export default class JumpIfFalse extends Step {

    readonly conditional: Conditional;
    readonly count: number;

    constructor(count: number, node: Conditional) {
        super(node);

        this.count = count;
        this.conditional = node;
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        const value = evaluator.popValue();
        if(!(value instanceof Bool)) 
            return new Exception(this.conditional, ExceptionType.EXPECTED_TYPE);
        if(!value.bool) evaluator.jump(this.count);
        return undefined;
    }

}
import BooleanType from "../nodes/BooleanType";
import type Conditional from "../nodes/Conditional";
import Bool from "./Bool";
import type Evaluator from "./Evaluator";
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
        const value = evaluator.popValue(new BooleanType());
        if(!(value instanceof Bool)) return value;
        if(!value.bool) evaluator.jump(this.count);
        return undefined;
    }

}
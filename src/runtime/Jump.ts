import type Translations from "../nodes/Translations";
import type Evaluable from "./Evaluable";
import type Evaluator from "./Evaluator";
import Step from "./Step";
import type Value from "./Value";

export default class Jump extends Step {

    readonly count: number;

    constructor(count: number, node: Evaluable) {
        super(node);

        this.count = count;
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        evaluator.jump(this.count);
        return undefined;
    }

    toString() { 
        return super.toString() + " " + this.count;
    }

    getExplanations(): Translations {
        return {
            "eng": `Jumping ahead.`
        }
    }

}
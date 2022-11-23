import type Translations from "../nodes/Translations";
import type Evaluator from "./Evaluator";
import Step from "./Step";
import type Value from "./Value";
import type Expression from "../nodes/Expression";

export default class Finish extends Step {

    constructor(node: Expression) {
        super(node);
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        return this.node.evaluate(evaluator);
    }

    getExplanations(evaluator: Evaluator): Translations { 
        return this.node.getFinishExplanations(evaluator);
    }

}
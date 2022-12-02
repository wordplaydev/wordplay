import Step from "./Step";
import type Evaluator from "./Evaluator";
import type Value from "./Value";
import type Translations from "../nodes/Translations";
import type Expression from "../nodes/Expression";
import { finish } from "./Finish";
import { start } from "./Start";

export default class StartFinish extends Step {

    constructor(node: Expression) {
        super(node);
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        start(evaluator, this.node);
        return finish(evaluator, this.node);
    }

    getExplanations(evaluator: Evaluator): Translations { return this.node.getFinishExplanations(evaluator); }
    
}
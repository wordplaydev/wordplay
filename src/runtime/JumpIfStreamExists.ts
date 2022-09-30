import type Translations from "../nodes/Translations";
import type Reaction from "../nodes/Reaction";
import type Evaluator from "./Evaluator";
import Step from "./Step";
import type Value from "./Value";

export default class JumpIfStreamExists extends Step {

    readonly count: number;

    constructor(count: number, reaction: Reaction) {
        super(reaction);

        this.count = count;
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {

        if(evaluator.hasReactionStream(this.node as Reaction))
            evaluator.jump(this.count);

        return undefined;

    }

    toString() { 
        return super.toString() + " " + this.count;
    }

    getExplanations(): Translations {
        return {
            "eng": `Have we already initialized this stream?`
        }
    }

}
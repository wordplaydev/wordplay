import type Translations from "../nodes/Translations";
import type Reaction from "../nodes/Reaction";
import Bool from "./Bool";
import type Evaluator from "./Evaluator";
import Step from "./Step";
import type Value from "./Value";
import type Expression from "../nodes/Expression";

export default class JumpIfStreamUnchanged extends Step {

    readonly count: number;

    constructor(count: number, node: Expression) {
        super(node);

        this.count = count;
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {

        // Stop remembering streams accessed
        const streamsAccessed = evaluator.stopRememberingStreamAccesses();

        // If there were no streams accessed or none of the one's accessed changed or
        // the query evaluated to false, push the stream's current value and skip over the initial/next value expressions.
        const value = evaluator.popValue(undefined);
        if(streamsAccessed === undefined ||
            streamsAccessed.find(stream => evaluator.didStreamCauseReaction(stream)) === undefined ||
            (value instanceof Bool && !value.bool)) {
                evaluator.jump(this.count);
                const value = evaluator.getReactionStreamLatest(this.node as Reaction);
                if(value !== undefined)
                    evaluator.pushValue(value);
            }
        return undefined;
    }

    toString() { 
        return super.toString() + " " + this.count;
    }

    getExplanations(): Translations {
        return {
            eng: `Has this stream changed at all?`,
            "😀": "⏭∆"
        }
    }

}
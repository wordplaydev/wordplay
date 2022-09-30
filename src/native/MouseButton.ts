import BooleanType from "../nodes/BooleanType";
import Bool from "../runtime/Bool";
import type Evaluator from "../runtime/Evaluator";
import Stream from "../runtime/Stream";

export default class MouseButton extends Stream {

    constructor(evaluator: Evaluator) {
        super(evaluator, new Bool(true));
    }

    record(state: boolean) {
        this.add(new Bool(state));
    }

    getNames() { 
        return {
            "eng": "🖱⬇️"
        };
    }

    start() {}
    stop() {}

    getType() { return new BooleanType(); }

}
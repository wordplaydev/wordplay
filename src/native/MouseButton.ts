import BooleanType from "../nodes/BooleanType";
import { TRANSLATE } from "../nodes/Translations";
import Bool from "../runtime/Bool";
import type Evaluator from "../runtime/Evaluator";
import Stream from "../runtime/Stream";

export default class MouseButton extends Stream {

    constructor(evaluator: Evaluator) {
        super(
            {
                eng: "A stream of mouse button up and down events.",
                "😀": TRANSLATE
            }, 
            {
                "😀": "mouse-button",
                eng: "🖱⬇️"
            },
            evaluator, 
            new Bool(true)
        );
    }

    record(state: boolean) {
        this.add(new Bool(state));
    }

    start() {}
    stop() {}

    getType() { return new BooleanType(); }

}
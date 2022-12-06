import BooleanType from "../nodes/BooleanType";
import { TRANSLATE } from "../nodes/Translations";
import Bool from "../runtime/Bool";
import type Evaluator from "../runtime/Evaluator";
import Stream from "../runtime/Stream";

export default class MouseButton extends Stream<Bool> {

    on: boolean = false;

    constructor(evaluator: Evaluator) {
        super(
            evaluator,
            {
                eng: "A stream of mouse button up and down events.",
                "😀": TRANSLATE
            }, 
            {
                "😀": "mouse-button",
                eng: "🖱⬇️"
            },
            new Bool(evaluator.getMain(), true)
        );
    }

    record(state: boolean) {
        if(this.on)
            this.add(new Bool(this.creator, state));
    }

    start() {
        this.on = true;
    }
    stop() {
        this.on = false;
    }

    getType() { return new BooleanType(); }

}
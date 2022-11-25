import BooleanType from "../nodes/BooleanType";
import type Program from "../nodes/Program";
import { TRANSLATE } from "../nodes/Translations";
import Bool from "../runtime/Bool";
import Stream from "../runtime/Stream";

export default class MouseButton extends Stream {

    on: boolean = false;

    constructor(program: Program) {
        super(
            program,
            {
                eng: "A stream of mouse button up and down events.",
                "😀": TRANSLATE
            }, 
            {
                "😀": "mouse-button",
                eng: "🖱⬇️"
            },
            new Bool(program, true)
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
import Bool from "../runtime/Bool";
import Stream from "../runtime/Stream";

export default class MouseButton extends Stream {

    constructor() {
        super({"eng": "mousebutton"}, new Bool(true));
    }

    record(state: boolean) {
        this.add(new Bool(state));
    }

    start() {}
    stop() {}

}
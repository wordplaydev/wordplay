import BooleanType from "../nodes/BooleanType";
import Bool from "../runtime/Bool";
import Stream from "../runtime/Stream";

export default class MouseButton extends Stream {

    constructor() {
        super({"eng": "🖱⬇️"}, new Bool(true));
    }

    record(state: boolean) {
        this.add(new Bool(state));
    }

    start() {}
    stop() {}

    getType() { return new BooleanType(); }

}
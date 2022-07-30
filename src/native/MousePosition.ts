import Unit from "../nodes/Unit";
import Measurement from "../runtime/Measurement";
import Stream from "../runtime/Stream";
import { createStructure } from "../runtime/Structure";
import Place from "./Place";

function position(x: number, y: number) {
    return createStructure(Place, { x: new Measurement(x, new Unit([ "px"])), y: new Measurement(y, new Unit([ "px"])) })
}

export default class MousePosition extends Stream {

    constructor() {
        super({"eng": "🖱⌖"}, position(0, 0));
    }

    record(x: number, y: number) {
        this.add(position(x, y));
    }

    start() {}
    stop() {}

}
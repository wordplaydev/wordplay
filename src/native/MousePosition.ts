import StreamType from "../nodes/StreamType";
import StructureType from "../nodes/StructureType";
import Unit from "../nodes/Unit";
import type Evaluator from "../runtime/Evaluator";
import Measurement from "../runtime/Measurement";
import Stream from "../runtime/Stream";
import { createStructure } from "../runtime/Structure";
import Place from "./Place";

function position(evaluator: Evaluator, x: number, y: number) {
    return createStructure(evaluator, Place, { x: new Measurement(x, Unit.unit([ "px"])), y: new Measurement(y, Unit.unit([ "px"])) })
}

export default class MousePosition extends Stream {

    constructor(evaluator: Evaluator) {
        super(evaluator, position(evaluator, 0, 0));
    }

    getNames() {
        return {
            "eng": "🖱⌖"
        }
    }

    record(x: number, y: number) {
        this.add(position(this.evaluator, x, y));
    }

    start() {}
    stop() {}

    getType() { return new StreamType(new StructureType(Place)); }

}
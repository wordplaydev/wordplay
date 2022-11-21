import type Names from "../nodes/Names";
import StreamType from "../nodes/StreamType";
import StructureType from "../nodes/StructureType";
import { TRANSLATE } from "../nodes/Translations";
import Unit from "../nodes/Unit";
import type Evaluator from "../runtime/Evaluator";
import Measurement from "../runtime/Measurement";
import Stream from "../runtime/Stream";
import { createStructure } from "../runtime/Structure";
import type Value from "../runtime/Value";
import Place from "./Place";

function position(evaluator: Evaluator, x: number, y: number) {
    const bindings = new Map<Names, Value>();
    bindings.set(Place.inputs[0].names, new Measurement(evaluator.getProgram(), x, Unit.unit([ "px"])));
    bindings.set(Place.inputs[1].names, new Measurement(evaluator.getProgram(), y, Unit.unit([ "px"])));
    return createStructure(evaluator, Place, bindings)
}

export default class MousePosition extends Stream {

    constructor(evaluator: Evaluator) {
        super(
            evaluator.getProgram(),
            {
                eng: "A stream of mouse move events",
                "😀": TRANSLATE
            }, 
            {
                "😀": "mouse position",
                eng: "🖱⌖"
            },
            evaluator, 
            position(evaluator, 0, 0)
        );
    }

    record(x: number, y: number) {
        this.add(position(this.evaluator, x, y));
    }

    start() {}
    stop() {}

    getType() { return new StreamType(new StructureType(Place)); }

}
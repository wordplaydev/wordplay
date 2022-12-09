import MeasurementType from "../nodes/MeasurementType";
import StreamType from "../nodes/StreamType";
import { TRANSLATE } from "../nodes/Translations";
import type Evaluator from "../runtime/Evaluator";
import Measurement from "../runtime/Measurement";
import Stream from "../runtime/Stream";

export const FREQUENCY = 33;

export default class Random extends Stream<Measurement> {

    constructor(evaluator: Evaluator) {
        super(
            evaluator,
            {
                eng: "An infinite sequence of random numbers between 0 and 1",
                "😀": TRANSLATE
            }, 
            {
                "😀": "⚁",
                eng: "random"
            },
            Random.next(evaluator)
        );
    }

    static next(evaluator: Evaluator) {
        return new Measurement(evaluator.getMain(), Math.random());
    }

    /**
     * Override latest behavior: if in the present, silently add a new value to return. (If in the past, do as normal).
     */
     latest() { 
        // If in the present, add a value without causing a reaction.
        if(!this.evaluator.isInPast())
            this.add(Random.next(this.evaluator), true);
        // Return the latest value (present or past).
        return super.latest();
    }


    start() {}
    stop() {}

    getType() { return new StreamType(new MeasurementType()); }

}
import MeasurementType from '../nodes/MeasurementType';
import StreamType from '../nodes/StreamType';
import type Evaluator from '../runtime/Evaluator';
import Measurement from '../runtime/Measurement';
import Stream from '../runtime/Stream';
import { getDocTranslations } from '../translations/getDocTranslations';
import { getNameTranslations } from '../translations/getNameTranslations';

export const FREQUENCY = 33;

export default class Random extends Stream<Measurement> {
    constructor(evaluator: Evaluator) {
        super(evaluator, Random.next(evaluator));
    }

    computeDocs() {
        return getDocTranslations((t) => t.input.random.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.random.name);
    }

    static next(evaluator: Evaluator) {
        return new Measurement(evaluator.getMain(), Math.random());
    }

    /**
     * Override latest behavior: if in the present, silently add a new value to return. (If in the past, do as normal).
     */
    latest() {
        // If in the present, add a value without causing a reaction.
        if (!this.evaluator.isInPast())
            this.add(Random.next(this.evaluator), true);
        // Return the latest value (present or past).
        return super.latest();
    }

    start() {}
    stop() {}

    getType() {
        return StreamType.make(MeasurementType.make());
    }
}

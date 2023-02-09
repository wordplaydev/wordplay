import MeasurementType from '@nodes/MeasurementType';
import StreamType from '@nodes/StreamType';
import Unit from '@nodes/Unit';
import type Evaluator from '@runtime/Evaluator';
import Measurement from '@runtime/Measurement';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import TimeDefinition from './TimeDefinition';
import TemporalStream from '../runtime/TemporalStream';
import type Expression from '../nodes/Expression';

const DEFAULT_FREQUENCY = 33;

export default class Time extends TemporalStream<Measurement> {
    firstTime: number | undefined = undefined;
    frequency: number = 33;
    lastTime: DOMHighResTimeStamp | undefined = undefined;

    constructor(evaluator: Evaluator, frequency: number = DEFAULT_FREQUENCY) {
        super(
            evaluator,
            TimeDefinition,
            new Measurement(evaluator.getMain(), 0, Unit.unit(['ms']))
        );
        this.frequency = frequency;
    }

    computeDocs() {
        return getDocTranslations((t) => t.input.time.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.time.name);
    }

    // No setup or cleanup necessary; Evaluator manages the requestAnimationFrame loop.
    start() {}
    stop() {}

    setFrequency(frequency: number | undefined) {
        this.frequency = frequency ?? DEFAULT_FREQUENCY;
    }

    tick(time: DOMHighResTimeStamp) {
        if (this.firstTime === undefined) this.firstTime = time;

        // If the frequency has elapsed, add a value to the stream.
        if (
            this.lastTime === undefined ||
            time - this.lastTime >= this.frequency
        ) {
            this.lastTime = time;
            this.add(
                Time.make(
                    this.creator,
                    this.firstTime === undefined
                        ? 0
                        : Math.round(time - this.firstTime)
                )
            );
        }
    }

    static make(creator: Expression, time: number) {
        return new Measurement(creator, time, Unit.unit(['ms']));
    }

    getType() {
        return StreamType.make(MeasurementType.make(Unit.unit(['ms'])));
    }
}

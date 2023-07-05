import type Evaluator from '@runtime/Evaluator';
import TemporalStream from '../runtime/TemporalStream';
import type Expression from '../nodes/Expression';
import Bind from '../nodes/Bind';
import MeasurementType from '../nodes/MeasurementType';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneType from '../nodes/NoneType';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import Measurement from '../runtime/Measurement';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import createStreamEvaluator from './createStreamEvaluator';

const DEFAULT_FREQUENCY = 33;

export default class Time extends TemporalStream<Measurement> {
    firstTime: number | undefined = undefined;
    frequency: number = 33;
    lastTime: DOMHighResTimeStamp | undefined = undefined;

    constructor(evaluator: Evaluator, frequency: number = DEFAULT_FREQUENCY) {
        super(
            evaluator,
            TimeDefinition,
            new Measurement(evaluator.getMain(), 0, Unit.make(['ms']))
        );
        this.frequency = frequency;
    }

    // No setup or cleanup necessary; Evaluator manages the requestAnimationFrame loop.
    start() {}
    stop() {}

    setFrequency(frequency: number | undefined) {
        this.frequency = frequency ?? DEFAULT_FREQUENCY;
    }

    tick(time: DOMHighResTimeStamp, _: number, multiplier: number) {
        if (this.firstTime === undefined) this.firstTime = time;

        const factor = Math.max(0, multiplier);

        // If the frequency has elapsed, add a value to the stream.
        if (
            multiplier > 0 &&
            (this.lastTime === undefined ||
                time - this.lastTime >= this.frequency * factor)
        ) {
            this.lastTime = time;
            this.add(
                Time.make(
                    this.creator,
                    this.firstTime === undefined
                        ? 0
                        : Math.round(time - this.firstTime) / factor
                )
            );
        }
    }

    static make(creator: Expression, time: number) {
        return new Measurement(creator, time, Unit.make(['ms']));
    }

    getType() {
        return StreamType.make(MeasurementType.make(Unit.make(['ms'])));
    }
}

const TimeType = MeasurementType.make(Unit.make(['ms']));

const FrequencyBind = Bind.make(
    getDocLocales((t) => t.input.Time.frequency.doc),
    getNameLocales((t) => t.input.Time.frequency.names),
    UnionType.make(MeasurementType.make(Unit.make(['ms'])), NoneType.make()),
    // Default to nothing
    NoneLiteral.make()
);

export const TimeDefinition = StreamDefinition.make(
    getDocLocales((t) => t.input.Time.doc),
    getNameLocales((t) => t.input.Time.names),
    [FrequencyBind],
    createStreamEvaluator(
        TimeType.clone(),
        Time,
        (evaluation) =>
            new Time(
                evaluation.getEvaluator(),
                evaluation.get(FrequencyBind.names, Measurement)?.toNumber()
            ),
        (stream, evaluation) => {
            stream.setFrequency(
                evaluation.get(FrequencyBind.names, Measurement)?.toNumber()
            );
        }
    ),

    TimeType.clone()
);

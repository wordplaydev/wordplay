import type Evaluator from '@runtime/Evaluator';
import TemporalStream from '../runtime/TemporalStream';
import type Expression from '../nodes/Expression';
import Bind from '../nodes/Bind';
import NumberType from '../nodes/NumberType';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneType from '../nodes/NoneType';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import Number from '../runtime/Number';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import createStreamEvaluator from './createStreamEvaluator';
import type Locale from '../locale/Locale';

const DEFAULT_FREQUENCY = 33;

export default class Time extends TemporalStream<Number> {
    firstTime: number | undefined = undefined;
    frequency: number = 33;
    lastTime: DOMHighResTimeStamp | undefined = undefined;

    constructor(evaluator: Evaluator, frequency: number = DEFAULT_FREQUENCY) {
        super(
            evaluator,
            evaluator.project.shares.input.Time,
            new Number(evaluator.getMain(), 0, Unit.reuse(['ms']))
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
        return new Number(creator, time, Unit.reuse(['ms']));
    }

    getType() {
        return StreamType.make(NumberType.make(Unit.reuse(['ms'])));
    }
}

export function createTimeDefinition(locale: Locale[]) {
    const TimeType = NumberType.make(Unit.reuse(['ms']));

    const FrequencyBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Time.frequency.doc),
        getNameLocales(locale, (locale) => locale.input.Time.frequency.names),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        // Default to nothing
        NoneLiteral.make()
    );

    return StreamDefinition.make(
        getDocLocales(locale, (locale) => locale.input.Time.doc),
        getNameLocales(locale, (locale) => locale.input.Time.names),
        [FrequencyBind],
        createStreamEvaluator(
            TimeType.clone(),
            Time,
            (evaluation) =>
                new Time(
                    evaluation.getEvaluator(),
                    evaluation.get(FrequencyBind.names, Number)?.toNumber()
                ),
            (stream, evaluation) => {
                stream.setFrequency(
                    evaluation.get(FrequencyBind.names, Number)?.toNumber()
                );
            }
        ),

        TimeType.clone()
    );
}

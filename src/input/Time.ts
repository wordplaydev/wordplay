import type Evaluator from '@runtime/Evaluator';
import TemporalStreamValue from '../values/TemporalStreamValue';
import type Expression from '../nodes/Expression';
import Bind from '../nodes/Bind';
import NumberType from '../nodes/NumberType';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneType from '../nodes/NoneType';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import NumberValue from '@values/NumberValue';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import createStreamEvaluator from './createStreamEvaluator';
import type Locales from '../locale/Locales';

const DEFAULT_FREQUENCY = 33;

export default class Time extends TemporalStreamValue<NumberValue, number> {
    firstTime: number | undefined = undefined;
    frequency = 33;
    lastTime: DOMHighResTimeStamp | undefined = undefined;

    constructor(evaluator: Evaluator, frequency: number = DEFAULT_FREQUENCY) {
        super(
            evaluator,
            evaluator.project.shares.input.Time,
            new NumberValue(evaluator.getMain(), 0, Unit.reuse(['ms'])),
            0
        );
        this.frequency = frequency;
    }

    // No setup or cleanup necessary; Evaluator manages the requestAnimationFrame loop.
    start() {
        return;
    }
    stop() {
        return;
    }

    setFrequency(frequency: number | undefined) {
        this.frequency = frequency ?? DEFAULT_FREQUENCY;
    }

    react(time: number) {
        this.add(Time.make(this.creator, time), time);
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
            const newTime =
                this.firstTime === undefined
                    ? 0
                    : Math.round(time - this.firstTime) / factor;
            this.react(newTime);
        }
    }

    static make(creator: Expression, time: number) {
        return new NumberValue(creator, time, Unit.reuse(['ms']));
    }

    getType() {
        return StreamType.make(NumberType.make(Unit.reuse(['ms'])));
    }
}

export function createTimeType(locale: Locales) {
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
                    evaluation.get(FrequencyBind.names, NumberValue)?.toNumber()
                ),
            (stream, evaluation) => {
                stream.setFrequency(
                    evaluation.get(FrequencyBind.names, NumberValue)?.toNumber()
                );
            }
        ),

        TimeType.clone()
    );
}

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
import BooleanType from '@nodes/BooleanType';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BoolValue from '@values/BoolValue';

const DEFAULT_FREQUENCY = 33;

export default class Time extends TemporalStreamValue<NumberValue, number> {
    firstTime: number | undefined = undefined;
    frequency = 33;
    relative: boolean;
    lastTime: DOMHighResTimeStamp | undefined = undefined;

    constructor(
        evaluator: Evaluator,
        frequency: number = DEFAULT_FREQUENCY,
        relative: boolean,
    ) {
        super(
            evaluator,
            evaluator.project.shares.input.Time,
            new NumberValue(evaluator.getMain(), 0, Unit.reuse(['ms'])),
            0,
        );
        this.frequency = frequency;
        this.relative = relative;
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

    setRelative(relative: boolean) {
        this.relative = relative;
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
            const newTime = this.relative
                ? this.firstTime === undefined
                    ? 0
                    : Math.round(time - this.firstTime) / factor
                : // Remainder of Unix time modulo milliseconds per day
                  Date.now() % (86400 * 1000);
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
        NoneLiteral.make(),
    );

    const RelativeBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Time.relative.doc),
        getNameLocales(locale, (locale) => locale.input.Time.relative.names),
        BooleanType.make(),
        // Default to nothing
        BooleanLiteral.make(true),
    );

    return StreamDefinition.make(
        getDocLocales(locale, (locale) => locale.input.Time.doc),
        getNameLocales(locale, (locale) => locale.input.Time.names),
        [FrequencyBind, RelativeBind],
        createStreamEvaluator(
            TimeType.clone(),
            Time,
            (evaluation) =>
                new Time(
                    evaluation.getEvaluator(),
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber(),
                    evaluation.get(RelativeBind.names, BoolValue)?.bool ?? true,
                ),
            (stream, evaluation) => {
                stream.setFrequency(
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber(),
                );
                stream.setRelative(
                    evaluation.get(RelativeBind.names, BoolValue)?.bool ?? true,
                );
            },
        ),

        TimeType.clone(),
    );
}

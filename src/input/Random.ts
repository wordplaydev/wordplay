import type Evaluator from '@runtime/Evaluator';
import Stream from '@runtime/Stream';
import StreamDefinition from '@nodes/StreamDefinition';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import MeasurementType from '@nodes/MeasurementType';
import Bind from '@nodes/Bind';
import UnionType from '@nodes/UnionType';
import NoneType from '@nodes/NoneType';
import NoneLiteral from '@nodes/NoneLiteral';
import StreamType from '@nodes/StreamType';
import Measurement from '@runtime/Measurement';
import Unit from '@nodes/Unit';
import createStreamEvaluator from './createStreamEvaluator';

export const FREQUENCY = 33;

export default class Random extends Stream<Measurement> {
    min: number | undefined;
    max: number | undefined;

    constructor(
        evaluator: Evaluator,
        min: number | undefined,
        max: number | undefined
    ) {
        super(evaluator, RandomDefinition, Random.next(evaluator, min, max));

        this.min = min;
        this.max = max;
    }

    setRange(min: number | undefined, max: number | undefined) {
        this.min = min;
        this.max = max;
    }

    static next(
        evaluator: Evaluator,
        min: number | undefined,
        max: number | undefined
    ) {
        return new Measurement(
            evaluator.getMain(),
            min === undefined
                ? max === undefined
                    ? // No range provided, [0, 1)
                      Math.random()
                    : // Just a max, [0, max)
                      Math.random() * max
                : max === undefined
                ? // Just a min, (-min, 0]
                  Math.random() * min
                : // Both [min, max]
                  Random.getRandomIntInclusive(min, max)
        );
    }

    static getRandomIntInclusive(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    /**
     * Override latest behavior: if in the present, silently add a new value to return. (If in the past, do as normal).
     */
    latest() {
        // If in the present, add a value without causing a reaction.
        if (!this.evaluator.isInPast())
            this.add(Random.next(this.evaluator, this.min, this.max), true);

        // Return the latest value (present or past).
        return super.latest();
    }

    start() {}
    stop() {}

    getType() {
        return StreamType.make(MeasurementType.make());
    }
}

const MinBind = Bind.make(
    getDocTranslations((t) => t.input.random.min.doc),
    getNameTranslations((t) => t.input.random.min.name),
    UnionType.make(MeasurementType.make(Unit.Wildcard), NoneType.make()),
    // Default to nothing
    NoneLiteral.make()
);

const MaxBind = Bind.make(
    getDocTranslations((t) => t.input.random.max.doc),
    getNameTranslations((t) => t.input.random.max.name),
    UnionType.make(MeasurementType.make(Unit.Wildcard), NoneType.make()),
    // Default to nothing
    NoneLiteral.make()
);

export const RandomDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.random.doc),
    getNameTranslations((t) => t.input.random.name),
    [MinBind, MaxBind],
    createStreamEvaluator(
        MeasurementType.make(),
        Random,
        (evaluation) =>
            new Random(
                evaluation.getEvaluator(),
                evaluation.get(MinBind.names, Measurement)?.toNumber(),
                evaluation.get(MaxBind.names, Measurement)?.toNumber()
            ),
        (stream, evaluation) =>
            stream.setRange(
                evaluation.get(MinBind.names, Measurement)?.toNumber(),
                evaluation.get(MaxBind.names, Measurement)?.toNumber()
            )
    ),
    MeasurementType.make()
);

import type Evaluation from '#runtime/Evaluation.ts';
import NumberValue from '#values/NumberValue.ts';
import { PitchDetector } from 'pitchy';
import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import type Locales from '#locale/Locales.ts';
import Bind from '#nodes/Bind.ts';
import NoneType from '#nodes/NoneType.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import NumberType from '#nodes/NumberType.ts';
import StreamDefinition from '#nodes/StreamDefinition.ts';
import UnionType from '#nodes/UnionType.ts';
import Unit from '#nodes/Unit.ts';
import AudioStream from '#input/AudioStream.ts';
import createStreamEvaluator from '#input/createStreamEvaluator.ts';
import {
    PITCH_FFT_SIZE,
    computePitch,
    createPitchDetector,
} from '#input/AudioAnalysisMath.ts';
import type { StreamKind } from '#values/StreamValue.ts';
const DEFAULT_FREQUENCY = 50;

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default class Pitch extends AudioStream {
    readonly kind: StreamKind = 'pitch';

    readonly amplitudes = new Float32Array(PITCH_FFT_SIZE);
    readonly detector: PitchDetector<Float32Array>;

    constructor(evaluation: Evaluation, frequency: number | undefined) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Pitch,
            frequency,
            Unit.reuse(['hz']),
            PITCH_FFT_SIZE,
        );

        this.frequency = Math.max(15, frequency ?? DEFAULT_FREQUENCY);
        this.detector = createPitchDetector();
    }

    react(pitch: number) {
        // Add the stream value.
        this.add(
            new NumberValue(this.creator, pitch, Unit.reuse(['hz'])),
            pitch,
        );
    }

    valueFromFrequencies(sampleRate: number, analyzer: AnalyserNode): number {
        analyzer.getFloatTimeDomainData(this.amplitudes);
        return computePitch(this.detector, sampleRate, this.amplitudes);
    }

    getType() {
        return NumberType.make(Unit.reuse(['hz']));
    }
}

export function createPitchDefinition(locales: Locales) {
    const FrequencyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Pitch.frequency.doc),
        getNameLocales(locales, (locale) => locale.input.Pitch.frequency.names),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms'])),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Pitch.doc),
        getNameLocales(locales, (locale) => locale.input.Pitch.names),
        [FrequencyBind],
        createStreamEvaluator(
            NumberType.make(Unit.create(['hz'])),
            Pitch,
            (evaluation) =>
                new Pitch(
                    evaluation,
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber(),
                ),
            (stream, evaluation) =>
                stream.setFrequency(
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber(),
                ),
        ),
        NumberType.make(Unit.create(['hz'])),
    );
}

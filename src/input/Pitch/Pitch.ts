import type Evaluation from '@runtime/Evaluation';
import NumberValue from '@values/NumberValue';
import { PitchDetector } from 'pitchy';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import AudioStream from '@input/AudioStream';
import createStreamEvaluator from '@input/createStreamEvaluator';
import { PITCH_FFT_SIZE, computePitch } from '@input/AudioAnalysisMath';
const DEFAULT_FREQUENCY = 50;

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default class Pitch extends AudioStream {
    readonly amplitudes = new Float32Array(PITCH_FFT_SIZE);
    readonly detector: PitchDetector<Float32Array>;

    constructor(evaluation: Evaluation, frequency: number | undefined) {
        super(evaluation, frequency, Unit.reuse(['hz']), PITCH_FFT_SIZE);

        this.frequency = Math.max(15, frequency ?? DEFAULT_FREQUENCY);
        this.detector = PitchDetector.forFloat32Array(PITCH_FFT_SIZE);
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

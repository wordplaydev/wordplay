import type Evaluator from '@runtime/Evaluator';
import StreamDefinition from '../nodes/StreamDefinition';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import NumberType from '../nodes/NumberType';
import Bind from '../nodes/Bind';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import NoneType from '../nodes/NoneType';
import NumberLiteral from '../nodes/NumberLiteral';
import NumberValue from '@values/NumberValue';
import createStreamEvaluator from './createStreamEvaluator';
import AudioStream from './AudioStream';
import { PitchDetector } from 'pitchy';
import type Locales from '../locale/Locales';

/** We want more deail in the frequency domain and less in the amplitude domain, but we also want to minimize how much data we analyze. */
const FFT_SIZE = 1024;
const DEFAULT_FREQUENCY = 50;

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default class Pitch extends AudioStream {
    readonly amplitudes = new Float32Array(FFT_SIZE);
    readonly detector: PitchDetector<Float32Array>;

    constructor(evaluator: Evaluator, frequency: number | undefined) {
        super(evaluator, frequency, FFT_SIZE);

        this.frequency = Math.max(15, frequency ?? DEFAULT_FREQUENCY);
        this.detector = PitchDetector.forFloat32Array(FFT_SIZE);
    }

    react(pitch: number) {
        // Add the stream value.
        this.add(
            new NumberValue(this.creator, pitch, Unit.reuse(['hz'])),
            pitch
        );
    }

    valueFromFrequencies(sampleRate: number, analyzer: AnalyserNode): number {
        analyzer.getFloatTimeDomainData(this.amplitudes);

        const [frequency, clarity] = this.detector.findPitch(
            this.amplitudes,
            sampleRate
        );

        return clarity < 0.75 ? 0 : Math.floor(frequency);
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
        NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms']))
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Pitch.doc),
        getNameLocales(locales, (locale) => locale.input.Pitch.names),
        [FrequencyBind],
        createStreamEvaluator(
            NumberType.make(),
            Pitch,
            (evaluation) =>
                new Pitch(
                    evaluation.getEvaluator(),
                    evaluation.get(FrequencyBind.names, NumberValue)?.toNumber()
                ),
            (stream, evaluation) =>
                stream.setFrequency(
                    evaluation.get(FrequencyBind.names, NumberValue)?.toNumber()
                )
        ),
        NumberType.make(Unit.create(['hz']))
    );
}

import type Evaluation from '@runtime/Evaluation';
import NumberValue from '@values/NumberValue';
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
import AudioStream, { DEFAULT_FREQUENCY } from '@input/AudioStream';
import createStreamEvaluator from '@input/createStreamEvaluator';
import { VOLUME_FFT_SIZE, computeVolume } from '@input/AudioAnalysisMath';

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default class Volume extends AudioStream {
    frequencies: Uint8Array<ArrayBuffer> = new Uint8Array(VOLUME_FFT_SIZE);

    constructor(evaluation: Evaluation, frequency: number | undefined) {
        super(evaluation, frequency, undefined, VOLUME_FFT_SIZE);
    }

    react(percent: number) {
        // Add the stream value.
        this.add(new NumberValue(this.creator, percent), percent);
    }

    valueFromFrequencies(sampleRate: number, analyzer: AnalyserNode): number {
        analyzer.getByteFrequencyData(this.frequencies);
        return computeVolume(sampleRate, this.frequencies);
    }

    getType() {
        return NumberType.make();
    }
}

export function createVolumeDefinition(locales: Locales) {
    const FrequencyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Volume.frequency.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Volume.frequency.names,
        ),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms'])),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Volume.doc),
        getNameLocales(locales, (locale) => locale.input.Volume.names),
        [FrequencyBind],
        createStreamEvaluator(
            NumberType.make(),
            Volume,
            (evaluation) =>
                new Volume(
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
        NumberType.make(),
    );
}

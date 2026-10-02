import type Evaluation from '#runtime/Evaluation.ts';
import NumberValue from '#values/NumberValue.ts';
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
import AudioStream, { DEFAULT_FREQUENCY } from '#input/AudioStream.ts';
import createStreamEvaluator from '#input/createStreamEvaluator.ts';
import { VOLUME_FFT_SIZE, computeVolume } from '#input/AudioAnalysisMath.ts';
import type { StreamKind } from '#values/StreamValue.ts';

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default class Volume extends AudioStream {
    readonly kind: StreamKind = 'volume';

    frequencies: Uint8Array<ArrayBuffer> = new Uint8Array(VOLUME_FFT_SIZE);

    constructor(evaluation: Evaluation, frequency: number | undefined) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Volume,
            frequency,
            undefined,
            VOLUME_FFT_SIZE,
        );
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

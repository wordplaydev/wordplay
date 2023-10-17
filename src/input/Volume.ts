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
import AudioStream, { DEFAULT_FREQUENCY } from './AudioStream';
import type Locales from '../locale/Locales';

const FFT_SIZE = 32;

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default class Volume extends AudioStream {
    frequencies: Uint8Array = new Uint8Array(FFT_SIZE);

    constructor(evaluator: Evaluator, frequency: number | undefined) {
        super(evaluator, frequency, FFT_SIZE);
    }

    react(percent: number) {
        // Add the stream value.
        this.add(new NumberValue(this.creator, percent), percent);
    }

    valueFromFrequencies(sampleRate: number, analyzer: AnalyserNode): number {
        // Get the sample
        analyzer.getByteFrequencyData(this.frequencies);
        const frequencies = Array.from(this.frequencies);

        // Get a copy of the frequencies.
        let sumOfSquares = 0.0;
        let frequency = 0;
        let count = 0;
        // Only count the audible frequencies of the human voice.
        for (const amplitude of frequencies) {
            // The frequency increases in increments of the sample rate (usually 44100), divided by two since the byte frequency data only goes to
            // half of the sample rate in frequencies, divided by the number of FFT bins. For our defaults, this is about 700Hz per bin,
            // so we're only looking about about 6 of the 32 bins we sample.
            frequency += sampleRate / 2 / frequencies.length;
            if (frequency >= 0 && frequency <= 4000) {
                sumOfSquares += amplitude * amplitude;
                count++;
            }
        }

        return Math.floor((100 * Math.sqrt(sumOfSquares / count)) / 256) / 100;
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
            (locale) => locale.input.Volume.frequency.names
        ),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms']))
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
                    evaluation.getEvaluator(),
                    evaluation.get(FrequencyBind.names, NumberValue)?.toNumber()
                ),
            (stream, evaluation) =>
                stream.setFrequency(
                    evaluation.get(FrequencyBind.names, NumberValue)?.toNumber()
                )
        ),
        NumberType.make()
    );
}

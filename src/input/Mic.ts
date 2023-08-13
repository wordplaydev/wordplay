import type Evaluator from '@runtime/Evaluator';
import TemporalStreamValue from '../values/TemporalStreamValue';
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
import type Locale from '../locale/Locale';

const FFT_SIZE = 32;
const DEFAULT_FREQUENCY = 33;

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default class Mic extends TemporalStreamValue<NumberValue, number> {
    stream: MediaStream | undefined;
    source: MediaStreamAudioSourceNode | undefined;
    context: AudioContext | undefined;
    analyzer: AnalyserNode | undefined;
    frequencies: Uint8Array = new Uint8Array(FFT_SIZE);
    lastSampleTime: number | undefined = undefined;
    stopped = false;

    frequency: number;

    constructor(evaluator: Evaluator, frequency: number | undefined) {
        super(
            evaluator,
            evaluator.project.shares.input.Mic,
            new NumberValue(evaluator.getMain(), 100),
            100
        );
        this.frequency = frequency ?? DEFAULT_FREQUENCY;
    }

    react(percent: number) {
        // Add the stream value.
        this.add(new NumberValue(this.creator, percent), percent);
    }

    tick(time: DOMHighResTimeStamp) {
        if (this.analyzer === undefined) return;

        if (
            this.lastSampleTime === undefined ||
            time - this.lastSampleTime > this.frequency
        ) {
            // Remember when we got the sample.
            this.lastSampleTime = time;

            // Get the sample.
            this.analyzer.getByteFrequencyData(this.frequencies);
            // Get a copy of the frequencies.
            const frequencies = Array.from(this.frequencies);

            // Compute a percent
            this.react(
                Math.floor((100 * Math.max.apply(undefined, frequencies)) / 256)
            );
        }
    }

    connect() {
        if (this.analyzer === undefined) return;
        if (this.source === undefined) return;
        this.source.connect(this.analyzer);
    }

    setFrequency(frequency: number | undefined) {
        this.frequency = frequency ?? DEFAULT_FREQUENCY;
    }

    start() {
        if (
            typeof navigator === 'undefined' ||
            typeof navigator.mediaDevices == 'undefined'
        )
            return;
        if (this.source !== undefined) return;

        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            // Dont' start if we've stopped.
            if (this.stopped) return;
            // Create an analyzer that gets 64 frequency samples per time frame.
            this.context = new AudioContext();
            this.analyzer = this.context.createAnalyser();
            this.analyzer.fftSize = FFT_SIZE;
            this.stream = stream;
            this.source = this.context.createMediaStreamSource(stream);

            this.connect();
        });
    }

    stop() {
        this.stopped = true;
        // Stop all tracks
        if (this.stream !== undefined) {
            this.stream.getTracks().forEach((track) => track.stop());
        }
        // Stop streaming microphone input.
        if (this.source !== undefined) {
            this.source.disconnect();
        }
    }

    getType() {
        return NumberType.make();
    }
}

export function createMicDefinition(locales: Locale[]) {
    const FrequencyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Mic.frequency.doc),
        getNameLocales(locales, (locale) => locale.input.Mic.frequency.names),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        // Default to nothing
        NumberLiteral.make(33, Unit.reuse(['ms']))
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Mic.doc),
        getNameLocales(locales, (locale) => locale.input.Mic.names),
        [FrequencyBind],
        createStreamEvaluator(
            NumberType.make(),
            Mic,
            (evaluation) =>
                new Mic(
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

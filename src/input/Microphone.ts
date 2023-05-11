import type Evaluator from '@runtime/Evaluator';
import TemporalStream from '../runtime/TemporalStream';
import StreamDefinition from '../nodes/StreamDefinition';
import { getDocLocales } from '../translation/getDocLocales';
import { getNameLocales } from '../translation/getNameLocales';
import MeasurementType from '../nodes/MeasurementType';
import Bind from '../nodes/Bind';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import NoneType from '../nodes/NoneType';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import Measurement from '../runtime/Measurement';
import createStreamEvaluator from './createStreamEvaluator';

const FFT_SIZE = 32;
const DEFAULT_FREQUENCY = 33;

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default class Mic extends TemporalStream<Measurement> {
    stream: MediaStream | undefined;
    source: MediaStreamAudioSourceNode | undefined;
    context: AudioContext | undefined;
    analyzer: AnalyserNode | undefined;
    frequencies: Uint8Array = new Uint8Array(FFT_SIZE);
    lastSampleTime: number | undefined = undefined;
    stopped: boolean = false;

    frequency: number;

    constructor(evaluator: Evaluator, frequency: number | undefined) {
        super(
            evaluator,
            MicDefinition,
            new Measurement(evaluator.getMain(), 100)
        );
        this.frequency = frequency ?? DEFAULT_FREQUENCY;
    }

    // Compute the maximum frequency in the same and convert it to a percentage.
    percent(frequencies: number[]) {
        return new Measurement(
            this.creator,
            Math.floor((100 * Math.max.apply(undefined, frequencies)) / 256)
        );
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
            // Add the stream value.
            this.add(this.percent(frequencies));
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
        return MeasurementType.make();
    }
}

const FrequencyBind = Bind.make(
    getDocLocales((t) => t.input.mic.frequency.doc),
    getNameLocales((t) => t.input.mic.frequency.names),
    UnionType.make(MeasurementType.make(Unit.make(['ms'])), NoneType.make()),
    // Default to nothing
    MeasurementLiteral.make(33, Unit.make(['ms']))
);

export const MicDefinition = StreamDefinition.make(
    getDocLocales((t) => t.input.mic.doc),
    getNameLocales((t) => t.input.mic.names),
    [FrequencyBind],
    createStreamEvaluator(
        MeasurementType.make(),
        Mic,
        (evaluation) =>
            new Mic(
                evaluation.getEvaluator(),
                evaluation.get(FrequencyBind.names, Measurement)?.toNumber()
            ),
        (stream, evaluation) =>
            stream.setFrequency(
                evaluation.get(FrequencyBind.names, Measurement)?.toNumber()
            )
    ),
    MeasurementType.make()
);

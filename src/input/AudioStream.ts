import type Evaluator from '@runtime/Evaluator';
import TemporalStreamValue from '../values/TemporalStreamValue';
import NumberType from '../nodes/NumberType';
import NumberValue from '@values/NumberValue';
import { database } from '../db/Database';

/** We want more deail in the frequency domain and less in the amplitude domain, but we also want to minimize how much data we analyze. */
export const DEFAULT_FREQUENCY = 33;

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default abstract class AudioStream extends TemporalStreamValue<
    NumberValue,
    number
> {
    fftSize: number;
    stream: MediaStream | undefined;
    source: MediaStreamAudioSourceNode | undefined;
    context: AudioContext | undefined;
    analyzer: AnalyserNode | undefined;
    lastSampleTime: number | undefined = undefined;

    stopped = false;

    frequency: number;

    constructor(
        evaluator: Evaluator,
        frequency: number | undefined,
        fftSize: number
    ) {
        super(
            evaluator,
            evaluator.project.shares.input.Volume,
            new NumberValue(evaluator.getMain(), 0),
            0
        );
        this.fftSize = fftSize;
        this.frequency = Math.max(15, frequency ?? DEFAULT_FREQUENCY);
    }

    abstract valueFromFrequencies(
        sampleRate: number,
        analyzer: AnalyserNode
    ): number;

    tick(time: DOMHighResTimeStamp) {
        if (this.analyzer === undefined) return;
        if (this.context === undefined) return;

        // If the frequency has elapsed, take a sample.
        if (
            this.lastSampleTime === undefined ||
            time - this.lastSampleTime > this.frequency
        ) {
            // Remember when we got the sample.
            this.lastSampleTime = time;

            // React to the compute number
            this.react(
                this.valueFromFrequencies(
                    this.context.sampleRate,
                    this.analyzer
                )
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

        const micID = database.getMic();

        navigator.mediaDevices
            .getUserMedia({ audio: micID ? { deviceId: micID } : true })
            .then((stream) => {
                // Don't start if we've stopped. This handles the case where an Evaluator is shutting down, but this promise hasn't resolved yet.
                if (this.stopped) return;

                // Create an analyzer
                this.context = new AudioContext();
                this.analyzer = this.context.createAnalyser();
                this.analyzer.fftSize = this.fftSize;
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

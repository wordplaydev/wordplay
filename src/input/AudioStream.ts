import type Unit from '@nodes/Unit';
import type Evaluation from '@runtime/Evaluation';
import NumberValue from '@values/NumberValue';
import NumberType from '@nodes/NumberType';
import TemporalStreamValue from '@values/TemporalStreamValue';
import PermissionException from '@values/PermissionException';
import { denyConsent, Permission } from '@input/permissions';
import { acquireAudioSource, type AudioSourceHandle } from '@input/AudioSource';

/** We want more deail in the frequency domain and less in the amplitude domain, but we also want to minimize how much data we analyze. */
export const DEFAULT_FREQUENCY = 33;

// A helpful article on getting raw data streams:
// https://stackoverflow.com/questions/69237143/how-do-i-get-the-audio-frequency-from-my-mic-using-javascript
export default abstract class AudioStream extends TemporalStreamValue<
    NumberValue,
    number
> {
    fftSize: number;
    analyzer: AnalyserNode | undefined;
    lastSampleTime: number | undefined = undefined;

    stopped = false;

    frequency: number;
    private source: AudioSourceHandle | undefined;

    constructor(
        evaluation: Evaluation,
        frequency: number | undefined,
        unit: Unit | undefined,
        fftSize: number,
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Volume,
            new NumberValue(evaluation.getCreator(), 0, unit),
            0,
        );
        this.fftSize = fftSize;
        this.frequency = Math.max(15, frequency ?? DEFAULT_FREQUENCY);
    }

    abstract valueFromFrequencies(
        sampleRate: number,
        analyzer: AnalyserNode,
    ): number;

    tick(time: DOMHighResTimeStamp) {
        const context = this.source?.getContext();
        if (context === undefined) return;

        // On the first tick after acquiring a source, lazily create the analyzer
        // and connect it — this avoids trying to connect during start() before
        // the shared source has fully resolved.
        if (this.analyzer === undefined) {
            this.analyzer = context.createAnalyser();
            this.analyzer.fftSize = this.fftSize;
            this.connect();
        }

        // If the frequency has elapsed, take a sample.
        if (
            this.lastSampleTime === undefined ||
            time - this.lastSampleTime > this.frequency
        ) {
            // Remember when we got the sample.
            this.lastSampleTime = time;

            // React to the compute number
            this.react(
                this.valueFromFrequencies(context.sampleRate, this.analyzer),
            );
        }
    }

    setFrequency(frequency: number | undefined) {
        this.frequency = frequency ?? DEFAULT_FREQUENCY;
    }

    start() {
        if (this.source !== undefined) return;

        this.source = acquireAudioSource(
            this.evaluator.database,
            () => this.handleMicDenied(),
        );

        // If the source is already failed, report the denial immediately.
        if (this.source.isFailed()) this.handleMicDenied();
        // If it's ready, connect immediately; otherwise it will be ready soon and
        // we'll connect when it's first ticked.
        else if (this.source.isReady()) this.connect();
    }

    private connect() {
        if (this.analyzer === undefined) return;
        const sourceNode = this.source?.getSourceNode();
        if (sourceNode === undefined) return;
        sourceNode.connect(this.analyzer);
    }

    private handleMicDenied() {
        if (this.stopped) return;
        denyConsent(Permission.Microphone);
        this.evaluator.replaceMainValue(
            new PermissionException(
                this.creator,
                this.evaluator,
                Permission.Microphone,
            ),
        );
        this.evaluator.broadcast();
    }

    stop() {
        this.stopped = true;
        if (this.source !== undefined) {
            this.source.release();
            this.source = undefined;
        }
        if (this.analyzer !== undefined) {
            this.analyzer.disconnect();
        }
    }

    getType() {
        return NumberType.make();
    }
}

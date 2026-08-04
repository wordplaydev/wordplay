import samples from '@output/Music/InstrumentSamples';

/**
 * Reactive container for instrument sample loading, so the stage can say what
 * it's waiting for.
 *
 * The loader itself lives in `InstrumentSamples.ts` so non-browser tools can
 * import the surrounding music code without needing a Svelte compiler. This is
 * the thin bridge that turns its state changes into reactive state, mirroring
 * `HandLandmarkerLoader.svelte.ts`.
 */
class InstrumentSamplesStatus {
    /** Instruments whose recordings are still on their way. */
    loading = $state<string[]>([]);
    /** Instruments that will sound synthesized because their files failed. */
    failed = $state<string[]>([]);
}

export const instrumentSamplesStatus = new InstrumentSamplesStatus();

samples.observe(() => {
    instrumentSamplesStatus.loading = samples.loading();
    instrumentSamplesStatus.failed = samples.failedInstruments();
});

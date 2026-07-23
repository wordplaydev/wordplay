import { observeLoading } from '@input/ObjectDetector';

/**
 * Reactive container for object-detector loading state, mirroring the hand and
 * face loaders: the runtime itself lives in `ObjectDetector.ts` so non-browser
 * tooling can import the stream code without a Svelte compiler, and this file
 * is the thin bridge that turns its loading callbacks into reactive state.
 */
class ObjectDetectorStatus {
    loading = $state(false);
    /** Download progress in [0, 1] while loading, or undefined if unknown. */
    progress = $state<number | undefined>(undefined);
}

export const objectDetectorStatus = new ObjectDetectorStatus();

observeLoading((loading, progress) => {
    objectDetectorStatus.loading = loading;
    objectDetectorStatus.progress = progress;
});

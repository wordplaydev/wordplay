import { observeLoading } from '@input/Face/FaceLandmarker';

/**
 * Reactive container for face-tracker loading state. `loading` flips to true
 * while MediaPipe's Tasks Vision runtime + face model are being downloaded for
 * the first time, and back to false once cached. UI components read
 * `faceLandmarkerStatus.loading` directly (Svelte 5 runes track reads
 * automatically). The runtime itself lives in `FaceLandmarker.ts` so non-browser
 * tools can import the surrounding stream code without a Svelte compiler; this
 * is the thin bridge that turns loading callbacks into reactive state.
 */
class FaceLandmarkerStatus {
    loading = $state(false);
    /** Download progress in [0, 1] while loading, or undefined if unknown. */
    progress = $state<number | undefined>(undefined);
}

export const faceLandmarkerStatus = new FaceLandmarkerStatus();

observeLoading((loading, progress) => {
    faceLandmarkerStatus.loading = loading;
    faceLandmarkerStatus.progress = progress;
});

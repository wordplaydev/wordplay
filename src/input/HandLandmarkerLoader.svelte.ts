import { observeLoading } from '@input/HandLandmarker';

/**
 * Reactive container for hand-tracker loading state. `loading` flips to
 * true while MediaPipe's Tasks Vision runtime + model are being downloaded
 * for the first time, and back to false once cached. UI components read
 * `handLandmarkerStatus.loading` directly (Svelte 5 runes track reads
 * automatically).
 *
 * The runtime itself lives in `HandLandmarker.ts` so non-browser tools
 * (the locale verifier, schema generators) can import the surrounding
 * stream code without needing a Svelte compiler. This file is the thin
 * bridge that turns the runtime's loading callbacks into reactive state.
 */
class HandLandmarkerStatus {
    loading = $state(false);
}

export const handLandmarkerStatus = new HandLandmarkerStatus();

observeLoading((loading) => {
    handLandmarkerStatus.loading = loading;
});

import type { HandLandmarker } from '@mediapipe/tasks-vision';

/**
 * Plain-TypeScript runtime for lazy-loading MediaPipe's hand landmarker.
 * Kept free of Svelte runes so that non-browser tooling (like the locale
 * verifier, which runs under tsx) can import the surrounding stream
 * definitions without tripping over compiler-only syntax. The reactive
 * loading state lives next door in HandLandmarkerLoader.svelte.ts and
 * subscribes via observeLoading() below.
 */

let landmarker: HandLandmarker | undefined;
let loadingPromise: Promise<HandLandmarker> | undefined;

type LoadingObserver = (loading: boolean) => void;
const observers: LoadingObserver[] = [];

/**
 * Subscribe to loading-state changes. Returns an unsubscribe function. The
 * loader uses this so that the Svelte $state container in
 * HandLandmarkerLoader.svelte.ts can stay in sync without this file
 * depending on Svelte.
 */
export function observeLoading(observer: LoadingObserver): () => void {
    observers.push(observer);
    return () => {
        const i = observers.indexOf(observer);
        if (i >= 0) observers.splice(i, 1);
    };
}

function notifyLoading(loading: boolean) {
    for (const o of observers) o(loading);
}

/**
 * Get the shared HandLandmarker instance, lazy-loading MediaPipe Tasks
 * Vision (~3–4MB gzipped WASM + ~5MB model) on first call. Subsequent
 * calls return the existing instance.
 */
export async function getHandLandmarker(): Promise<HandLandmarker> {
    if (landmarker) return landmarker;
    if (loadingPromise) return loadingPromise;

    notifyLoading(true);
    loadingPromise = (async () => {
        const { HandLandmarker, FilesetResolver } = await import(
            '@mediapipe/tasks-vision'
        );
        const fileset = await FilesetResolver.forVisionTasks('/wasm');
        const result = await HandLandmarker.createFromOptions(fileset, {
            baseOptions: {
                modelAssetPath:
                    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
        });
        landmarker = result;
        notifyLoading(false);
        return result;
    })();

    try {
        return await loadingPromise;
    } catch (e) {
        notifyLoading(false);
        loadingPromise = undefined;
        throw e;
    }
}

/** True if the landmarker has already loaded (subsequent Hand() streams skip the spinner). */
export function isHandLandmarkerReady(): boolean {
    return landmarker !== undefined;
}

let lastDetectTimestamp = 0;

/**
 * Strictly-monotonic timestamp for MediaPipe's `detectForVideo`. The
 * HandLandmarker survives across Wordplay program re-runs, but `tick` time
 * resets per run — sending a smaller timestamp than one previously seen
 * makes MediaPipe error out. `performance.now()` is monotonic for the
 * whole page session; the `+1` floor protects against multiple Hand
 * instances calling within the same fractional millisecond.
 */
export function nextDetectTimestamp(): number {
    const now = performance.now();
    lastDetectTimestamp = Math.max(now, lastDetectTimestamp + 1);
    return lastDetectTimestamp;
}

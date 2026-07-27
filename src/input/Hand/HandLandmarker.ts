import type { HandLandmarker } from '@mediapipe/tasks-vision';
import createLandmarkerRuntime, {
    fetchModel,
    isWebKit,
} from '@input/createLandmarkerRuntime';

const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/**
 * The MediaPipe hand landmarker, wrapped in the shared lazy-load + WASM-heap
 * recycle lifecycle (see createLandmarkerRuntime). Only the `create()` closure
 * below is hand-specific; everything else is shared with the face landmarker.
 * WebKit (Safari desktop, all iOS browsers) gets the CPU delegate because its
 * WebGL texture GC lags until the OS kills the tab; Chromium/Gecko keep the GPU
 * speedup.
 */
const runtime = createLandmarkerRuntime<HandLandmarker>(async (onProgress) => {
    const { HandLandmarker, FilesetResolver } =
        await import('@mediapipe/tasks-vision');
    const [fileset, modelAssetBuffer] = await Promise.all([
        FilesetResolver.forVisionTasks('/wasm'),
        fetchModel(MODEL_URL, onProgress),
    ]);
    return HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
            modelAssetBuffer,
            delegate: isWebKit() ? 'CPU' : 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
    });
});

export default runtime;

/**
 * Begin downloading the model (and initializing the WASM runtime) now,
 * without waiting for a stream to start. Used to overlap the multi-MB
 * download with the camera-permission prompt instead of running after it.
 * Safe to call repeatedly — the runtime dedupes concurrent loads.
 */
export function prefetch() {
    void runtime.get().catch(() => {});
}

/** Subscribe to hand-model loading state (the loader bridges this into a rune). */
export const observeLoading = runtime.observeLoading;

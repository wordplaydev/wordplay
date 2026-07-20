import type { HandLandmarker } from '@mediapipe/tasks-vision';
import createLandmarkerRuntime, {
    isWebKit,
} from '@input/createLandmarkerRuntime';

/**
 * The MediaPipe hand landmarker, wrapped in the shared lazy-load + WASM-heap
 * recycle lifecycle (see createLandmarkerRuntime). Only the `create()` closure
 * below is hand-specific; everything else is shared with the face landmarker.
 * WebKit (Safari desktop, all iOS browsers) gets the CPU delegate because its
 * WebGL texture GC lags until the OS kills the tab; Chromium/Gecko keep the GPU
 * speedup.
 */
const runtime = createLandmarkerRuntime<HandLandmarker>(async () => {
    const { HandLandmarker, FilesetResolver } = await import(
        '@mediapipe/tasks-vision'
    );
    const fileset = await FilesetResolver.forVisionTasks('/wasm');
    return HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
            modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: isWebKit() ? 'CPU' : 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
    });
});

export default runtime;

/** Subscribe to hand-model loading state (the loader bridges this into a rune). */
export const observeLoading = runtime.observeLoading;

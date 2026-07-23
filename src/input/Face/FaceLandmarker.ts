import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import createLandmarkerRuntime, {
    fetchModel,
    isWebKit,
} from '@input/createLandmarkerRuntime';

const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * The MediaPipe face landmarker, wrapped in the shared lazy-load + WASM-heap
 * recycle lifecycle (see createLandmarkerRuntime). Blendshapes give the 52
 * normalized 0–1 expression scores the Face stream reads (eye blink, jaw open,
 * smile, frown, brow raise, …); the transformation matrix gives head pose.
 * WebKit gets the CPU delegate for the same reason the hand landmarker does.
 */
const runtime = createLandmarkerRuntime<FaceLandmarker>(async (onProgress) => {
    const { FaceLandmarker, FilesetResolver } =
        await import('@mediapipe/tasks-vision');
    const [fileset, modelAssetBuffer] = await Promise.all([
        FilesetResolver.forVisionTasks('/wasm'),
        fetchModel(MODEL_URL, onProgress),
    ]);
    return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
            modelAssetBuffer,
            delegate: isWebKit() ? 'CPU' : 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
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

/** Subscribe to face-model loading state (the loader bridges this into a rune). */
export const observeLoading = runtime.observeLoading;

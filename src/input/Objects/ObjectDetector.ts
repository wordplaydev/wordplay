import type { ObjectDetector } from '@mediapipe/tasks-vision';
import createLandmarkerRuntime, {
    fetchModel,
    isWebKit,
} from '@input/createLandmarkerRuntime';

/**
 * EfficientDet-Lite0, float16. The int8 build silently returns no detections on
 * the GPU delegate (Chromium/Firefox); float16 detects on both GPU and CPU, and
 * matches the precision the hand/face models already use.
 */
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

/**
 * The MediaPipe object detector, wrapped in the same lazy-load + WASM-heap
 * recycle lifecycle as the hand and face landmarkers (see
 * createLandmarkerRuntime). EfficientDet-Lite0 int8 is the smallest of the
 * published builds (~4.6MB, versus 7.2MB float16 and 13.8MB float32), which
 * matters most on the mobile memory ceiling these camera streams already fight.
 *
 * The score/count limits here are deliberately permissive: this runtime is a
 * singleton shared by every `Objects()` stream in a project, so calling
 * `setOptions()` to apply one stream's `confidence`/`category`/`count` would
 * silently change the others. Each stream filters the raw detections itself.
 */
const runtime = createLandmarkerRuntime<ObjectDetector>(async (onProgress) => {
    const { ObjectDetector, FilesetResolver } =
        await import('@mediapipe/tasks-vision');
    const [fileset, modelAssetBuffer] = await Promise.all([
        FilesetResolver.forVisionTasks('/wasm'),
        fetchModel(MODEL_URL, onProgress),
    ]);
    return ObjectDetector.createFromOptions(fileset, {
        baseOptions: {
            modelAssetBuffer,
            delegate: isWebKit() ? 'CPU' : 'GPU',
        },
        runningMode: 'VIDEO',
        scoreThreshold: 0.2,
        maxResults: 10,
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

/** Subscribe to detector loading state (the loader bridges this into a rune). */
export const observeLoading = runtime.observeLoading;

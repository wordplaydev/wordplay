import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import createLandmarkerRuntime, {
    isWebKit,
} from '@input/createLandmarkerRuntime';

/**
 * The MediaPipe face landmarker, wrapped in the shared lazy-load + WASM-heap
 * recycle lifecycle (see createLandmarkerRuntime). Blendshapes give the 52
 * normalized 0–1 expression scores the Face stream reads (eye blink, jaw open,
 * smile, frown, brow raise, …); the transformation matrix gives head pose.
 * WebKit gets the CPU delegate for the same reason the hand landmarker does.
 */
const runtime = createLandmarkerRuntime<FaceLandmarker>(async () => {
    const { FaceLandmarker, FilesetResolver } = await import(
        '@mediapipe/tasks-vision'
    );
    const fileset = await FilesetResolver.forVisionTasks('/wasm');
    return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
            modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: isWebKit() ? 'CPU' : 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
    });
});

export default runtime;

/** Subscribe to face-model loading state (the loader bridges this into a rune). */
export const observeLoading = runtime.observeLoading;

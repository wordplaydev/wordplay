import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import Camera from '#input/Camera/Camera.ts';
import Face from '#input/Face/Face.ts';
import Hand from '#input/Hand/Hand.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import Evaluator from '#runtime/Evaluator.ts';
import type {
    FaceLandmarkerResult,
    HandLandmarkerResult,
    NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import { afterEach, expect, test } from 'vitest';

/**
 * What a program sees from the camera streams, driven with synthetic frames and detections.
 * Without a document the camera feed opens nothing, so each stream's own work — turning a frame
 * or a detection into a value — runs here exactly as it does behind a real camera.
 */

const evaluators: Evaluator[] = [];
afterEach(() => {
    for (const evaluator of evaluators.splice(0)) evaluator.stop();
});

function start(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    evaluators.push(evaluator);
    evaluator.start();
    return {
        evaluator,
        value: () => evaluator.getLatestSourceValue(source)?.toString(),
    };
}

function point(x: number, y: number): NormalizedLandmark {
    return { x, y, z: 0, visibility: 1 };
}

/** A right hand, palm toward the camera, with every finger straight up or curled down. */
function handDetection(extended: boolean): HandLandmarkerResult {
    const landmarks: NormalizedLandmark[] = [
        point(0.5, 0.9),
        point(0.42, 0.85),
        point(0.36, 0.8),
        extended ? point(0.3, 0.75) : point(0.4, 0.7),
        extended ? point(0.24, 0.7) : point(0.47, 0.72),
    ];
    for (const x of [0.44, 0.5, 0.56, 0.62])
        landmarks.push(
            point(x, 0.7),
            point(x, 0.6),
            extended ? point(x, 0.5) : point(x, 0.65),
            extended ? point(x, 0.4) : point(x, 0.72),
        );
    return {
        landmarks: [landmarks],
        worldLandmarks: [],
        handednesses: [],
        handedness: [
            [{ categoryName: 'Right', score: 1, index: 0, displayName: '' }],
        ],
    };
}

const noHand: HandLandmarkerResult = {
    landmarks: [],
    worldLandmarks: [],
    handednesses: [],
    handedness: [],
};

/** A face facing the camera, smiling or not. */
function faceDetection(smiling: boolean): FaceLandmarkerResult {
    return {
        faceLandmarks: [[point(0.5, 0.5), point(0.5, 0.5)]],
        faceBlendshapes: [
            {
                headName: '',
                headIndex: 0,
                categories: [
                    ['mouthSmileLeft', smiling ? 0.9 : 0],
                    ['mouthSmileRight', smiling ? 0.9 : 0],
                ].map(([categoryName, score], index) => ({
                    categoryName: String(categoryName),
                    score: Number(score),
                    index,
                    displayName: '',
                })),
            },
        ],
        facialTransformationMatrixes: [],
    };
}

const noFace: FaceLandmarkerResult = {
    faceLandmarks: [],
    faceBlendshapes: [],
    facialTransformationMatrixes: [],
};

test('a camera frame is rows of colors', () => {
    const { evaluator, value } = start('Camera(2px 1px 100ms)');
    expect(value()).toBe('[]');
    evaluator.getBasisStreamsOfType(Camera)[0]?.react([
        [
            { l: 0.5, c: 20, h: 90 },
            { l: 1, c: 0, h: 0 },
        ],
    ]);
    evaluator.flush();
    expect(value()).toBe(
        '[[🌈(lightness: 0.5 chroma: 20 hue: 90°) 🌈(lightness: 1 chroma: 0 hue: 0°)]]',
    );
});

test('a hand is open with every finger up and closed in a fist', () => {
    const { evaluator, value } = start(
        'h: Hand()\n[h.open h.fingers h.thumb h.index h.pinky h.palm]',
    );
    const hand = evaluator.getBasisStreamsOfType(Hand)[0];
    expect(value()).toBe('[⊥ 0 ⊥ ⊥ ⊥ ⊥]');
    hand?.react(handDetection(true));
    evaluator.flush();
    expect(value()).toBe('[⊤ 5 ⊤ ⊤ ⊤ ⊤]');
    hand?.react(handDetection(false));
    evaluator.flush();
    expect(value()).toBe('[⊥ 0 ⊥ ⊥ ⊥ ⊤]');
});

// A hand held through a few missed frames, then let go of: the reset to the default used to be
// deduplicated against the held hand it replaced, so a hand that left stayed open forever.
test('a hand is held through brief misses and let go of after ten', () => {
    const { evaluator, value } = start('h: Hand()\n[h.open h.fingers]');
    const hand = evaluator.getBasisStreamsOfType(Hand)[0];
    hand?.react(handDetection(true));
    for (let miss = 1; miss <= 9; miss++) hand?.react(noHand);
    evaluator.flush();
    expect(value()).toBe('[⊤ 5]');
    hand?.react(noHand);
    evaluator.flush();
    expect(value()).toBe('[⊥ 0]');
});

test('a face is held through brief misses and let go of after ten', () => {
    const { evaluator, value } = start('Face().smiling');
    const face = evaluator.getBasisStreamsOfType(Face)[0];
    expect(value()).toBe('⊥');
    face?.react(faceDetection(true));
    evaluator.flush();
    expect(value()).toBe('⊤');
    for (let miss = 1; miss <= 9; miss++) face?.react(noFace);
    evaluator.flush();
    expect(value()).toBe('⊤');
    face?.react(noFace);
    evaluator.flush();
    expect(value()).toBe('⊥');
});

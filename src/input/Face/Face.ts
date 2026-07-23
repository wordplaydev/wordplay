import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import CameraLandmarkStream, {
    DEFAULT_FREQUENCY,
    DEFAULT_RESOLUTION,
} from '@input/CameraLandmarkStream';
import faceLandmarker from '@input/Face/FaceLandmarker';
import createStreamEvaluator from '@input/createStreamEvaluator';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import {
    createExpressionStructure,
    type ExpressionState,
} from '@output/Expression/Expression';
import { createPlaceStructure } from '@output/Place/Place';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import NumberValue from '@values/NumberValue';

/** Frames a face may be missing before we revert to the default Expression. */
const MISSES_TO_LOSE_LOCK = 10;

/**
 * Blendshape thresholds for the boolean flags. MediaPipe blendshape scores are
 * 0–1; these turn the continuous score into a discrete state. Hand-tuned
 * starting points — creators read the raw `*Amount` fields when they want the
 * continuous value instead.
 */
const EYE_CLOSED_THRESHOLD = 0.5;
const MOUTH_OPEN_THRESHOLD = 0.4;
const SMILE_THRESHOLD = 0.4;
/** Higher than the old mouth-only threshold, since the brow signal is stronger. */
const FROWN_THRESHOLD = 0.4;
const BROW_THRESHOLD = 0.4;

/**
 * Face-mesh landmark used for the emitted place. Index 1 sits at the nose tip —
 * central and stable across expressions, unlike the outline points.
 */
const NOSE_TIP = 1;

/** Quantize a 0–1 amount for the dedup key (~50 buckets). */
const quantizeAmount = (v: number) => Math.round(v / 0.02);
/** Quantize a degree angle for the dedup key (~2° buckets). */
const quantizeAngle = (deg: number) => Math.round(deg / 2);

/**
 * A face tracker backed by MediaPipe Tasks Vision. Each frame produces 52
 * "blendshape" scores (0–1) plus a head-pose matrix, which we collapse into an
 * Expression: a Place, friendly booleans (eyes/mouth open, smiling, frowning,
 * brows raised), the continuous 0–1 amounts behind those booleans, and head
 * turn/tilt in degrees. All camera plumbing and the emit-dedup live in
 * CameraLandmarkStream; only the blendshape → ExpressionState mapping is here.
 */
export default class Face extends CameraLandmarkStream<FaceLandmarkerResult> {
    /** Most recent emitted state — held when MediaPipe misses for a few frames. */
    private state: ExpressionState;
    private consecutiveMisses = 0;

    constructor(evaluation: Evaluation, frequency: number, resolution: number) {
        const evaluator = evaluation.getEvaluator();
        const defaultState = Face.defaultState(evaluator);

        const emptyResult: FaceLandmarkerResult = {
            faceLandmarks: [],
            faceBlendshapes: [],
            facialTransformationMatrixes: [],
        };

        super(
            evaluation,
            evaluator.project.shares.input.Face,
            createExpressionStructure(evaluator, defaultState),
            emptyResult,
            faceLandmarker,
            frequency,
            resolution,
        );

        this.state = defaultState;
    }

    private static defaultState(evaluator: Evaluator): ExpressionState {
        return {
            place: createPlaceStructure(evaluator, 0, 0, 0),
            leftEyeOpen: false,
            rightEyeOpen: false,
            eyesOpen: false,
            mouthOpen: false,
            mouthOpenAmount: 0,
            smiling: false,
            smileAmount: 0,
            frowning: false,
            frownAmount: 0,
            browsRaised: false,
            browRaiseAmount: 0,
            turn: 0,
            tilt: 0,
        };
    }

    /** Turn a MediaPipe result into an ExpressionState and emit it. */
    react(result: FaceLandmarkerResult) {
        const landmarks = result.faceLandmarks?.[0];
        const categories = result.faceBlendshapes?.[0]?.categories;

        if (!landmarks || landmarks.length === 0 || !categories) {
            // Miss — hold last emitted state for a few frames so brief detection
            // gaps don't visibly reset the expression.
            this.consecutiveMisses++;
            if (this.consecutiveMisses >= MISSES_TO_LOSE_LOCK) {
                this.resetSmoothing();
                this.state = Face.defaultState(this.evaluator);
            }
            this.emitIfChanged(undefined, undefined, '0', result, () =>
                createExpressionStructure(this.evaluator, this.state),
            );
            return;
        }

        this.consecutiveMisses = 0;

        // Build a name → score lookup once for the blendshapes we read.
        const score = (name: string) =>
            categories.find((c) => c.categoryName === name)?.score ?? 0;

        const mouthOpenAmount = score('jawOpen');
        const smileAmount =
            (score('mouthSmileLeft') + score('mouthSmileRight')) / 2;
        // People frown with their brows as often as with their mouth, and
        // MediaPipe's mouthFrown scores are weak even for a deliberate frown,
        // so take whichever signal is strongest. Sides are maxed rather than
        // averaged so a lopsided expression still registers.
        const frownAmount = Math.max(
            score('mouthFrownLeft'),
            score('mouthFrownRight'),
            score('browDownLeft'),
            score('browDownRight'),
        );
        const browRaiseAmount = Math.max(
            score('browInnerUp'),
            (score('browOuterUpLeft') + score('browOuterUpRight')) / 2,
        );

        const leftEyeOpen = score('eyeBlinkLeft') < EYE_CLOSED_THRESHOLD;
        const rightEyeOpen = score('eyeBlinkRight') < EYE_CLOSED_THRESHOLD;
        const eyesOpen = leftEyeOpen && rightEyeOpen;
        const mouthOpen = mouthOpenAmount > MOUTH_OPEN_THRESHOLD;
        const smiling = smileAmount > SMILE_THRESHOLD;
        const frowning = frownAmount > FROWN_THRESHOLD;
        const browsRaised = browRaiseAmount > BROW_THRESHOLD;

        const { turn, tilt } = headAngles(
            result.facialTransformationMatrixes?.[0]?.data,
        );

        // Nose tip in normalized image coords (0..1), EMA-smoothed like Hand.
        const anchor = landmarks[NOSE_TIP];
        const { x: sx, y: sy } = this.smoothPlace(anchor.x, anchor.y);

        this.state = {
            place: createPlaceStructure(
                this.evaluator,
                this.toStageMeters(sx),
                this.toStageMeters(sy),
                0,
            ),
            leftEyeOpen,
            rightEyeOpen,
            eyesOpen,
            mouthOpen,
            mouthOpenAmount,
            smiling,
            smileAmount,
            frowning,
            frownAmount,
            browsRaised,
            browRaiseAmount,
            turn,
            tilt,
        };

        const key = [
            leftEyeOpen,
            rightEyeOpen,
            eyesOpen,
            mouthOpen,
            smiling,
            frowning,
            browsRaised,
        ]
            .map((b) => (b ? 1 : 0))
            .join('');
        const amountKey = [
            mouthOpenAmount,
            smileAmount,
            frownAmount,
            browRaiseAmount,
        ]
            .map(quantizeAmount)
            .join(',');
        const angleKey = `${quantizeAngle(turn)},${quantizeAngle(tilt)}`;

        this.emitIfChanged(
            sx,
            sy,
            `${key}:${amountKey}:${angleKey}`,
            result,
            () => createExpressionStructure(this.evaluator, this.state),
        );
    }
}

/**
 * Decompose MediaPipe's 4×4 column-major facial transformation matrix into head
 * turn (yaw) and tilt (pitch) in degrees. Standard rotation-matrix → Euler
 * extraction on the upper-left 3×3. Yaw is mirrored to match the selfie-view
 * place convention (+ = the creator's right). Returns zeros when no matrix is
 * available. Sign conventions are provisional — verify against a live camera.
 */
function headAngles(data: number[] | undefined): {
    turn: number;
    tilt: number;
} {
    if (!data || data.length < 11) return { turn: 0, tilt: 0 };
    // Column-major 4×4 → row-major 3×3 rotation entries.
    const r00 = data[0];
    const r10 = data[1];
    const r20 = data[2];
    const r21 = data[6];
    const r22 = data[10];

    const sy = Math.hypot(r00, r10);
    const pitch = Math.atan2(r21, r22);
    const yaw = Math.atan2(-r20, sy);

    const toDegrees = 180 / Math.PI;
    return { turn: -yaw * toDegrees, tilt: pitch * toDegrees };
}

export function createFaceDefinition(
    locales: Locales,
    ExpressionType: StructureDefinition,
) {
    const FrequencyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Face.frequency.doc),
        getNameLocales(locales, (locale) => locale.input.Face.frequency.names),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms'])),
    );

    const ResolutionBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Face.resolution.doc),
        getNameLocales(locales, (locale) => locale.input.Face.resolution.names),
        UnionType.make(NumberType.make(Unit.reuse(['px'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_RESOLUTION, Unit.reuse(['px'])),
    );

    const outputType = new StructureType(ExpressionType);

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Face.doc),
        getNameLocales(locales, (locale) => locale.input.Face.names),
        [FrequencyBind, ResolutionBind],
        createStreamEvaluator(
            outputType,
            Face,
            (evaluation) =>
                new Face(
                    evaluation,
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_FREQUENCY,
                    evaluation
                        .get(ResolutionBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_RESOLUTION,
                ),
            (stream, evaluation) => {
                stream.configure(
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_FREQUENCY,
                    evaluation
                        .get(ResolutionBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_RESOLUTION,
                );
            },
        ),
        outputType,
    );
}

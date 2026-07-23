import type {
    HandLandmarkerResult,
    NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import CameraLandmarkStream, {
    DEFAULT_FREQUENCY,
    DEFAULT_RESOLUTION,
} from '@input/CameraLandmarkStream';
import handLandmarker from '@input/Hand/HandLandmarker';
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
import { createHandStructure, type HandState } from '@output/Gesture/Hand';
import { createPlaceStructure } from '@output/Place/Place';
import type Evaluation from '@runtime/Evaluation';
import NumberValue from '@values/NumberValue';

/** Frames a hand may be missing before we revert to the default Hand structure. */
const MISSES_TO_LOSE_LOCK = 10;

/**
 * MediaPipe Hand Landmarker indices. There are 21 landmarks per hand.
 * Wikipedia-style names from the MediaPipe spec — useful so the finger-extension
 * geometry below is readable.
 */
const LM = {
    WRIST: 0,
    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,
    INDEX_MCP: 5,
    INDEX_PIP: 6,
    INDEX_DIP: 7,
    INDEX_TIP: 8,
    MIDDLE_MCP: 9,
    MIDDLE_PIP: 10,
    MIDDLE_DIP: 11,
    MIDDLE_TIP: 12,
    RING_MCP: 13,
    RING_PIP: 14,
    RING_DIP: 15,
    RING_TIP: 16,
    PINKY_MCP: 17,
    PINKY_PIP: 18,
    PINKY_DIP: 19,
    PINKY_TIP: 20,
} as const;

/**
 * A hand tracker backed by MediaPipe Tasks Vision. The MediaPipe runtime
 * (~3–4MB gzipped) is lazy-loaded on first construction; until it's ready the
 * stream emits a default Hand structure (place 0,0, everything false). Once
 * loaded, each frame produces 21 hand landmarks which we collapse into a Place
 * plus six booleans:
 *
 *   - `open`: true if 3+ fingers are extended (counts thumb)
 *   - `fingers`: integer 0–5 of extended fingers
 *   - `thumb`, `index`, `middle`, `ring`, `pinky`: per-finger extended flag
 *   - `palm`: true if the palm faces the camera (vs. back of hand)
 *
 * All the camera plumbing, per-frame guards, and emit-dedup live in
 * CameraLandmarkStream; only the landmark → HandState geometry is here.
 */
export default class Hand extends CameraLandmarkStream<HandLandmarkerResult> {
    /** Most recent emitted state — held when MediaPipe misses for a few frames. */
    private state: HandState;
    private consecutiveMisses = 0;

    constructor(evaluation: Evaluation, frequency: number, resolution: number) {
        const evaluator = evaluation.getEvaluator();
        const defaultState: HandState = {
            place: createPlaceStructure(evaluator, 0, 0, 0),
            open: false,
            fingers: 0,
            thumb: false,
            index: false,
            middle: false,
            ring: false,
            pinky: false,
            palm: false,
        };

        const emptyResult: HandLandmarkerResult = {
            landmarks: [],
            worldLandmarks: [],
            handednesses: [],
            handedness: [],
        };

        super(
            evaluation,
            evaluator.project.shares.input.Hand,
            createHandStructure(evaluator, defaultState),
            emptyResult,
            handLandmarker,
            frequency,
            resolution,
        );

        this.state = defaultState;
    }

    /** Turn a MediaPipe result into a HandState and emit it. */
    react(result: HandLandmarkerResult) {
        const landmarks = result.landmarks?.[0];
        const handedness = result.handedness?.[0]?.[0]?.categoryName as
            | 'Left'
            | 'Right'
            | undefined;

        if (!landmarks || landmarks.length < 21) {
            // Miss — hold last emitted state for a few frames so brief detection
            // gaps don't visibly reset the place.
            this.consecutiveMisses++;
            if (this.consecutiveMisses >= MISSES_TO_LOSE_LOCK) {
                this.resetSmoothing();
                this.state = {
                    ...this.state,
                    place: createPlaceStructure(this.evaluator, 0, 0, 0),
                    open: false,
                    fingers: 0,
                    thumb: false,
                    index: false,
                    middle: false,
                    ring: false,
                    pinky: false,
                    palm: false,
                };
            }
            this.emitIfChanged(undefined, undefined, '0', result, () =>
                createHandStructure(this.evaluator, this.state),
            );
            return;
        }

        this.consecutiveMisses = 0;

        // Finger-extended check: tip should be farther from the wrist than the
        // PIP joint, AND the tip-PIP-MCP angle should be reasonably straight.
        // For the thumb (which moves perpendicular to the others), we compare
        // tip-CMC distance instead.
        const thumb = isThumbExtended(landmarks);
        const index = isFingerExtended(
            landmarks,
            LM.INDEX_MCP,
            LM.INDEX_PIP,
            LM.INDEX_TIP,
        );
        const middle = isFingerExtended(
            landmarks,
            LM.MIDDLE_MCP,
            LM.MIDDLE_PIP,
            LM.MIDDLE_TIP,
        );
        const ring = isFingerExtended(
            landmarks,
            LM.RING_MCP,
            LM.RING_PIP,
            LM.RING_TIP,
        );
        const pinky = isFingerExtended(
            landmarks,
            LM.PINKY_MCP,
            LM.PINKY_PIP,
            LM.PINKY_TIP,
        );

        const fingerFlags = [thumb, index, middle, ring, pinky];
        const fingers = fingerFlags.filter((f) => f).length;
        const open = fingers >= 3;

        // Palm vs back: use the sign of the cross-product of (index_mcp - wrist)
        // and (pinky_mcp - wrist) in the image plane, combined with the
        // handedness from MediaPipe. MediaPipe's handedness assumes a mirrored
        // (selfie) view, which matches how the creator perceives their hand.
        const palm = isPalmFacingCamera(landmarks, handedness);

        // Centroid in normalized image coords (0..1). Use the palm center
        // (landmark 9, MIDDLE_MCP) — it's stable across finger movements unlike
        // the geometric centroid of all landmarks.
        const { x: sx, y: sy } = this.smoothPlace(
            landmarks[LM.MIDDLE_MCP].x,
            landmarks[LM.MIDDLE_MCP].y,
        );

        this.state = {
            place: createPlaceStructure(
                this.evaluator,
                this.toStageMeters(sx),
                this.toStageMeters(sy),
                0,
            ),
            open,
            fingers,
            thumb,
            index,
            middle,
            ring,
            pinky,
            palm,
        };

        const key = String(
            packFlags(thumb, index, middle, ring, pinky, palm, open, fingers),
        );
        this.emitIfChanged(sx, sy, key, result, () =>
            createHandStructure(this.evaluator, this.state),
        );
    }
}

/**
 * Pack the seven Hand booleans plus the finger count into a single integer so
 * the dedup check is one comparison. Finger count is 0–5 so it fits in the high
 * bits without overlap.
 */
function packFlags(
    thumb: boolean,
    index: boolean,
    middle: boolean,
    ring: boolean,
    pinky: boolean,
    palm: boolean,
    open: boolean,
    fingers: number,
): number {
    return (
        (thumb ? 1 : 0) |
        (index ? 2 : 0) |
        (middle ? 4 : 0) |
        (ring ? 8 : 0) |
        (pinky ? 16 : 0) |
        (palm ? 32 : 0) |
        (open ? 64 : 0) |
        (fingers << 8)
    );
}

/**
 * A non-thumb finger is "extended" when its tip is farther from the wrist than
 * its PIP joint along the finger's axis. Practically: compute the signed
 * projection of (tip - PIP) onto (PIP - MCP); positive means the tip is past the
 * PIP in the MCP→PIP direction, which is the case for an extended finger. A
 * small dead-zone avoids flipping on partially-curled fingers.
 */
function isFingerExtended(
    landmarks: NormalizedLandmark[],
    mcp: number,
    pip: number,
    tip: number,
): boolean {
    const mcpP = landmarks[mcp];
    const pipP = landmarks[pip];
    const tipP = landmarks[tip];
    // Vector from MCP to PIP (the "extended direction").
    const ax = pipP.x - mcpP.x;
    const ay = pipP.y - mcpP.y;
    // Vector from PIP to TIP.
    const bx = tipP.x - pipP.x;
    const by = tipP.y - pipP.y;
    // Dot product; positive = continuing in same direction (extended).
    // Normalize by |a||b| so the comparison is angle-based.
    const aLen = Math.hypot(ax, ay) || 1e-6;
    const bLen = Math.hypot(bx, by) || 1e-6;
    const cosAngle = (ax * bx + ay * by) / (aLen * bLen);
    return cosAngle > 0.5; // ~60° dead zone; tightly curled fingers fail
}

/**
 * The thumb is "extended" when **both** of these hold:
 *
 *   1. It's roughly straight at the IP joint — the MCP→IP and IP→TIP segments
 *      point in similar directions (small bend angle).
 *   2. The tip sits well outside the palm — far enough from the palm center
 *      that it can't be tucked across the fingers.
 *
 * Either test alone is insufficient: a curled fist usually has a fairly straight
 * thumb tucked across the palm (passes #1 but fails #2), and a thumb laid flat
 * against the side of the hand has its tip far from the palm center but is
 * folded at the IP joint (passes #2 but fails #1). Requiring both rules out the
 * common false positives.
 */
function isThumbExtended(landmarks: NormalizedLandmark[]): boolean {
    const mcp = landmarks[LM.THUMB_MCP];
    const ip = landmarks[LM.THUMB_IP];
    const tip = landmarks[LM.THUMB_TIP];

    const ax = ip.x - mcp.x;
    const ay = ip.y - mcp.y;
    const bx = tip.x - ip.x;
    const by = tip.y - ip.y;
    const aLen = Math.hypot(ax, ay) || 1e-6;
    const bLen = Math.hypot(bx, by) || 1e-6;
    const straight = (ax * bx + ay * by) / (aLen * bLen) > 0.7;

    const palmCenter = landmarks[LM.MIDDLE_MCP];
    const wrist = landmarks[LM.WRIST];
    const palmSize = Math.hypot(
        palmCenter.x - wrist.x,
        palmCenter.y - wrist.y,
    );
    const tipFromPalm = Math.hypot(
        tip.x - palmCenter.x,
        tip.y - palmCenter.y,
    );
    const farEnough = tipFromPalm > palmSize * 0.75;

    return straight && farEnough;
}

/**
 * Palm vs back-of-hand detection. The 2D image-plane cross-product of
 * (index_mcp - wrist) × (pinky_mcp - wrist) flips sign depending on which side
 * of the hand faces the camera. Which sign means "palm" depends on which hand it
 * is (MediaPipe's `handedness` is reported assuming the selfie-view convention,
 * which matches the creator's perception).
 */
function isPalmFacingCamera(
    landmarks: NormalizedLandmark[],
    handedness: 'Left' | 'Right' | undefined,
): boolean {
    const wrist = landmarks[LM.WRIST];
    const index = landmarks[LM.INDEX_MCP];
    const pinky = landmarks[LM.PINKY_MCP];
    const ax = index.x - wrist.x;
    const ay = index.y - wrist.y;
    const bx = pinky.x - wrist.x;
    const by = pinky.y - wrist.y;
    const cross = ax * by - ay * bx;
    // For a right hand in selfie view with palm facing camera, pinky sits to the
    // viewer's right of the index → cross is positive. Left hand mirrors.
    if (handedness === 'Right') return cross > 0;
    if (handedness === 'Left') return cross < 0;
    // Unknown handedness: bias toward palm = true (more common pose).
    return cross > 0;
}

export function createHandDefinition(
    locales: Locales,
    HandType: StructureDefinition,
) {
    const FrequencyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Hand.frequency.doc),
        getNameLocales(locales, (locale) => locale.input.Hand.frequency.names),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms'])),
    );

    const ResolutionBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Hand.resolution.doc),
        getNameLocales(locales, (locale) => locale.input.Hand.resolution.names),
        UnionType.make(NumberType.make(Unit.reuse(['px'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_RESOLUTION, Unit.reuse(['px'])),
    );

    const outputType = new StructureType(HandType);

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Hand.doc),
        getNameLocales(locales, (locale) => locale.input.Hand.names),
        [FrequencyBind, ResolutionBind],
        createStreamEvaluator(
            outputType,
            Hand,
            (evaluation) =>
                new Hand(
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

import type Project from '@db/projects/Project';
import type Definition from '@nodes/Definition';
import Color, { isSaturatedRed, luminanceDelta } from '@output/Color/Color';
import type Output from '@output/Output/Output';
import type Place from '@output/Place/Place';
import Sequence from '@output/animation/Sequence';
import Shape from '@output/Output/Shape/Shape';
import Stage from '@output/Output/Stage';

/**
 * The categories of visual properties that may provoke photosensitive seizures
 * or other neurological stress. Reported to read-only viewers before a project
 * plays. See {@link analyzeOutput}.
 */
export const PhotosensitivityRisks = [
    /** Rapid luminance/opacity reversals in the 3–60 Hz seizure band. */
    'flashing',
    /** Rapidly alternating strongly saturated red. */
    'redflash',
    /** Full-screen (stage-level) flashing — a strobe. */
    'strobe',
    /** Dense, highly contrasting geometric patterns. */
    'pattern',
    /** Very fast animation, especially oscillating opacity or scale. */
    'motion',
] as const;
export type PhotosensitivityRisk = (typeof PhotosensitivityRisks)[number];

// All thresholds are tunable heuristics, documented inline.

/** A "significant" luminance change: LCH lightness delta ≥ this (≈ WCAG general-flash 10%). */
const FlashLuminanceDelta = 0.1;
/** A "significant" opacity change (opacity toggles the output on/off against the stage). */
const FlashOpacityDelta = 0.5;
/** The photosensitive-seizure frequency band, in flashes (on/off cycles) per second. */
const MinFlashHz = 3;
const MaxFlashHz = 60;
/** Per-property thresholds for a "motion" change. Opacity and scale are the
 *  emphasized triggers, but fast offset/rotation shaking counts too (issue #716). */
const MotionOpacityDelta = 0.2;
const MotionScaleDelta = 0.25;
const MotionOffsetDelta = 0.05; // meters
const MotionRotationDelta = 5; // degrees
/** Lower bound for "very fast" motion, in changes per second. */
const MinMotionHz = 3;
/** A dense pattern needs at least this many shapes... */
const PatternMinShapes = 16;
/** ...with at least this much luminance contrast between two of their fills. */
const PatternContrastDelta = 0.4;

/**
 * Statically analyze a rendered output tree for photosensitivity risks. This
 * inspects the *description* of each animation (Sequence keyframes, durations,
 * colors) rather than playing it, so it can run before any frame is painted.
 *
 * It sees only the initial frame's structure, so flashing that emerges purely
 * from later stream/reaction recoloring (not encoded as a Sequence) is not
 * caught here — {@link analyzeSource} covers that case at the source level.
 */
export default function analyzeOutput(root: Output): Set<PhotosensitivityRisk> {
    const risks = new Set<PhotosensitivityRisk>();
    const outputs = collectOutputs(root);

    for (const output of outputs) {
        // Only stage-level flashing is confidently full-screen (Shape sizes
        // aren't reliably known here), so we reserve the strobe label for it.
        const fullScreen = output instanceof Stage;
        for (const sequence of sequencesOf(output))
            analyzeSequence(sequence, fullScreen, risks);
    }

    // Pattern: many shapes whose fills span a wide luminance range. Since our
    // contrast metric is |Δlightness|, the widest pair equals max − min.
    const lightnesses = outputs
        .filter((o): o is Shape => o instanceof Shape)
        .map((shape) => fillOf(shape))
        .filter((color): color is Color => color !== undefined)
        .map((color) => color.lightness.toNumber());
    if (
        lightnesses.length >= PatternMinShapes &&
        Math.max(...lightnesses) - Math.min(...lightnesses) >=
            PatternContrastDelta
    )
        risks.add('pattern');

    return risks;
}

/** Iterative DFS over the output tree; `Stage.find` is shallow, so we walk `getOutput()`. */
function collectOutputs(root: Output): Output[] {
    const all: Output[] = [];
    const stack: Output[] = [root];
    while (stack.length > 0) {
        const output = stack.pop();
        if (output === undefined) continue;
        all.push(output);
        for (const child of output.getOutput())
            if (child !== null) stack.push(child);
    }
    return all;
}

/** The animation slots of an output that are Sequences (not static Poses). */
function sequencesOf(output: Output): Sequence[] {
    return [
        output.entering,
        output.resting,
        output.moving,
        output.exiting,
    ].filter((slot): slot is Sequence => slot instanceof Sequence);
}

/** A shape's visible fill color: its pose color, else its background. */
function fillOf(shape: Shape): Color | undefined {
    return shape.pose.color ?? shape.background;
}

/**
 * Add any risks a single Sequence carries. Reuses `Sequence.compile()` to get
 * per-transition durations (which already fold in the repeat `count`), then
 * derives flash/motion frequency from consecutive keyframe changes.
 */
function analyzeSequence(
    sequence: Sequence,
    fullScreen: boolean,
    risks: Set<PhotosensitivityRisk>,
): void {
    const transitions = sequence.compile();
    if (transitions === undefined || transitions.length < 2) return;

    // Total real time; equals the sequence duration since compile divides it
    // across keyframe gaps. Guard against zero to avoid dividing by it.
    const totalSeconds = transitions.reduce((sum, t) => sum + t.duration, 0);
    if (totalSeconds <= 0) return;

    const poses = transitions.map((transition) => transition.pose);

    // Flashing: count significant luminance/opacity transitions (direction-
    // agnostic — the high thresholds already ignore gradual fades). Two
    // transitions make one on/off cycle, so flashes/second = transitions/2/time.
    let flashTransitions = 0;
    let redFlash = false;
    for (let index = 1; index < poses.length; index++) {
        const before = poses[index - 1];
        const after = poses[index];
        const luminanceFlip =
            before.color !== undefined &&
            after.color !== undefined &&
            luminanceDelta(before.color, after.color) >= FlashLuminanceDelta;
        const opacityFlip =
            before.opacity !== undefined &&
            after.opacity !== undefined &&
            Math.abs(before.opacity - after.opacity) >= FlashOpacityDelta;
        if (luminanceFlip || opacityFlip) {
            flashTransitions++;
            if (
                (before.color !== undefined && isSaturatedRed(before.color)) ||
                (after.color !== undefined && isSaturatedRed(after.color))
            )
                redFlash = true;
        }
    }
    const flashHz = flashTransitions / 2 / totalSeconds;
    if (flashHz >= MinFlashHz && flashHz <= MaxFlashHz) {
        risks.add('flashing');
        if (redFlash) risks.add('redflash');
        if (fullScreen) risks.add('strobe');
    }

    // Motion: unlike flashing, count only *reversals* (back-and-forth
    // oscillation) per property, so a smooth fade or one-time zoom (monotonic)
    // never counts — only genuinely fast shaking/pulsing does. Use the
    // fastest-oscillating property. Two reversals make one oscillation cycle.
    const maxReversals = Math.max(
        countScalarReversals(
            poses.map((pose) => pose.opacity),
            MotionOpacityDelta,
        ),
        countScalarReversals(
            poses.map((pose) => pose.scale),
            MotionScaleDelta,
        ),
        countScalarReversals(
            poses.map((pose) => pose.rotation),
            MotionRotationDelta,
        ),
        countOffsetReversals(
            poses.map((pose) => pose.offset),
            MotionOffsetDelta,
        ),
    );
    const motionHz = maxReversals / 2 / totalSeconds;
    if (motionHz >= MinMotionHz) risks.add('motion');
}

/** Count direction reversals in a numeric series, ignoring steps below `delta`. */
function countScalarReversals(
    values: (number | undefined)[],
    delta: number,
): number {
    let reversals = 0;
    let lastDir = 0;
    let previous: number | undefined;
    for (const value of values) {
        if (value === undefined) continue;
        if (previous !== undefined) {
            const change = value - previous;
            if (Math.abs(change) >= delta) {
                const dir = Math.sign(change);
                if (lastDir !== 0 && dir !== lastDir) reversals++;
                lastDir = dir;
            }
        }
        previous = value;
    }
    return reversals;
}

/** Count movement-direction reversals in a series of offsets (dot product < 0). */
function countOffsetReversals(
    offsets: (Place | undefined)[],
    delta: number,
): number {
    let reversals = 0;
    let previous: Place | undefined;
    let lastDx = 0;
    let lastDy = 0;
    let moved = false;
    for (const offset of offsets) {
        if (offset === undefined) continue;
        if (previous !== undefined) {
            const dx = offset.x - previous.x;
            const dy = offset.y - previous.y;
            if (Math.hypot(dx, dy) >= delta) {
                if (moved && dx * lastDx + dy * lastDy < 0) reversals++;
                lastDx = dx;
                lastDy = dy;
                moved = true;
            }
        }
        previous = offset;
    }
    return reversals;
}

/**
 * A source-level (AST) companion to {@link analyzeOutput}. The output-tree walk
 * only sees the initial frame, so flashing shown later (e.g. after an
 * interaction) is invisible to it. Here we catch references to built-in
 * sequences whose motion is inherently fast, wherever they appear in the code —
 * `flash` and `shake` are the exact triggers raised in issues #716 and #1043.
 *
 * Deliberately narrow: we only flag known-fast built-ins (high precision), not
 * arbitrary custom sequences that a static scan can't reliably characterize.
 */
export function analyzeSource(project: Project): Set<PhotosensitivityRisk> {
    const risks = new Set<PhotosensitivityRisk>();
    const sequences = project.shares.sequences;

    // Each built-in mapped to the risk it poses when referenced.
    const risky: [Definition, PhotosensitivityRisk][] = [
        [sequences.flash, 'flashing'],
        [sequences.rainbow, 'flashing'],
        [sequences.shake, 'motion'],
        [sequences.wiggle, 'motion'],
        [sequences.pulse, 'motion'],
        [sequences.heartbeat, 'motion'],
        [sequences.tada, 'motion'],
    ];

    for (const [definition, risk] of risky)
        if (project.getReferences(definition).length > 0) risks.add(risk);

    return risks;
}

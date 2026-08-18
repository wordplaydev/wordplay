import { FOCAL_LENGTH, PX_PER_METER } from '@output/Output/outputToCSS';

/**
 * The focus that renders output at its natural size — one metre to `PX_PER_METER`
 * pixels, no magnification — since `rootScale` is `FOCAL_LENGTH / (0 - z)`.
 */
export const NaturalSizeZ = -FOCAL_LENGTH;

/** A rectangle of stage content, in metres. Matches the shape `Stage.getLayout()` returns. */
export type Box = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};

/**
 * Grow the framing box to cover the content's current bounds.
 *
 * Fitting the *instantaneous* bounds makes the camera chase anything that moves: the frame
 * rescales every frame, so moving content stays pinned to the same screen position and
 * never reads as moving. So the frame only ever grows. It settles once content has been
 * everywhere it goes, and motion within a settled frame reads as motion.
 *
 * It deliberately never tightens back in. A frame that shrinks again after a quiet moment
 * reads as a malfunction rather than as recovery, and any rule for when to shrink is a rule
 * for when the stage rescales itself under the viewer. The cost is that a project whose
 * content shrinks stays framed for its largest extent until it restarts or is edited, which
 * is the quieter failure.
 */
export function growEnvelope(envelope: Box | undefined, bounds: Box): Box {
    // Nothing framed yet? The content is the frame.
    if (envelope === undefined) return bounds;
    return {
        left: Math.min(envelope.left, bounds.left),
        right: Math.max(envelope.right, bounds.right),
        top: Math.max(envelope.top, bounds.top),
        bottom: Math.min(envelope.bottom, bounds.bottom),
    };
}

/** Where the auto-fit camera points, in metres. Plain numbers rather than a `Place`, so this
 *  decision stays pure and the view keeps ownership of the evaluator-bound value. */
export type Focus = { x: number; y: number; z: number };

/** What the auto-fit camera should become: the frame to remember, where to point, and
 *  whether this is the first frame of anything at all. */
export type Fit = {
    framing: Box;
    /** Undefined when there's no viewport to fit into yet; see `fitZ`. */
    focus: Focus | undefined;
    /** The first frame with any extent, which the camera should snap to rather than ease
     *  into: nothing was framed before it, so there is no camera move to make smooth. */
    opening: boolean;
};

/** Whether a box has any size at all. An empty stage measures exactly 0x0, since
 *  `Stage.getLayout` seeds its bounds at the origin and has nothing to union in. */
function extent(box: Box | undefined): boolean {
    return (
        box !== undefined &&
        (box.right - box.left > 0 || box.top - box.bottom > 0)
    );
}

function sameBox(a: Box | undefined, b: Box): boolean {
    return (
        a !== undefined &&
        a.left === b.left &&
        a.right === b.right &&
        a.top === b.top &&
        a.bottom === b.bottom
    );
}

function sameFocus(a: Focus | undefined, b: Focus | undefined): boolean {
    return a === undefined || b === undefined
        ? a === b
        : a.x === b.x && a.y === b.y && a.z === b.z;
}

/**
 * How the auto-fit camera should change, given the frame it has grown so far, the content it
 * sees now, and where it currently points.
 *
 * The content has to be re-read on every stage change, because a stream can deliver its first
 * content long after the stage first renders — a @Camera starts with an empty frame, so a
 * stage fit once at startup is a stage fit to nothing.
 *
 * Returns undefined when neither the frame nor the fit moved, so the view can leave its focus
 * object alone. Handing back an equal-but-new focus on every frame restarts the camera's ease
 * and re-renders every output that reads it, which is the whole per-frame cost of watching
 * the content this closely.
 */
export function refit(
    envelope: Box | undefined,
    bounds: Box,
    availableWidth: number,
    availableHeight: number,
    current: Focus | undefined,
): Fit | undefined {
    const framing = growEnvelope(envelope, bounds);
    const width = framing.right - framing.left;
    const height = framing.top - framing.bottom;
    const z = fitZ(width, height, availableWidth, availableHeight);
    // x is negated because moving the camera right moves the world left.
    const focus =
        z === undefined
            ? undefined
            : {
                  x: -(framing.left + width / 2),
                  y: framing.top - height / 2,
                  z,
              };
    if (sameBox(envelope, framing) && sameFocus(current, focus))
        return undefined;
    return { framing, focus, opening: !extent(envelope) && extent(framing) };
}

/**
 * The viewport an authored camera `z` is written against, per axis. A creator picks a `z`
 * by eye on whatever screen they happen to be using, and `z` alone decides scale — so the
 * same `z` shows strictly less of the world on a smaller viewport, clipping content the
 * creator could see.
 *
 * These are deliberately separate, and compared **per axis**: clipping is a shortfall in
 * one dimension, not in area. A tall narrow stage (a phone, or a portrait editor tile) is
 * roomy by any combined measure while being far too narrow for wide content — which is
 * exactly the case a single `min(width, height)` reference misses, since the small
 * dimension is the generous one.
 *
 * Calibrated against Heart Attack's menu, measuring the painted content against the stage
 * to get the pull-back each layout actually needs:
 *
 *     stage 1280x703  needs 1.00      stage 733x1150 needs 1.07   (the reported case)
 *     stage 1024x606  needs 1.00      stage 390x750  needs 1.63
 *     stage 820x1086  needs 1.00      stage 844x296  needs 1.00
 *
 * Width binds in every real case, so `ReferenceWidth` carries the work and is set to cover
 * the narrowest of them with headroom, while every desktop-class layout stays at 1.0.
 * `ReferenceHeight` is set low on purpose: it only rescues genuinely short viewports, and a
 * higher value would pull back short-wide windows further than their content needs. The
 * cost of erring high on either is content smaller than necessary, never content clipped.
 */
export const ReferenceWidth = 900;
export const ReferenceHeight = 400;

/**
 * How far the automatic pull-back may go. This bounds only the *automatic* adjustment, so a
 * small tile can't shrink a project to nothing; it never bounds the audience, who may zoom
 * out as far as they like (see `composeZ`).
 *
 * Set from measurement rather than taste. The editor's stage tile is far smaller than its
 * window — 383x654 inside a 1280x800 window — and Heart Attack's menu needs 2.04x there,
 * 2.56x in a smaller tile still, so a cap of 2 left both clipped. Content rendered smaller
 * than strictly necessary is the acceptable failure here; content cut off is not.
 */
export const MaxPullback = 3;

/**
 * Pull an authored camera `z` back on viewports smaller than the reference, so a narrow or
 * short screen still shows what the creator framed. Only ever pulls *back*: on a viewport
 * at or above the reference this is the identity, so nothing a creator authored for a large
 * screen changes, and no project is ever made *more* clipped than it was.
 */
export function responsiveZ(
    z: number,
    viewportWidth: number,
    viewportHeight: number,
): number {
    // An unmeasured viewport has no scale to respond to; leave the authored z alone.
    if (!(viewportWidth > 0) || !(viewportHeight > 0)) return z;
    // Pull back by whichever axis falls furthest short, since clipping on either one hides
    // content. An axis at or above its reference contributes a factor below 1 and loses.
    const shortfall = Math.max(
        ReferenceWidth / viewportWidth,
        ReferenceHeight / viewportHeight,
    );
    const factor = Math.min(MaxPullback, Math.max(1, shortfall));
    return z * factor;
}

/**
 * The nearest the audience may bring the camera. Output only draws in front of the focus,
 * so a focus that reaches the output's plane renders a blank stage, and one that passes it
 * turns the scene inside out (the stage scales by 1/z).
 */
export const NearestZ = -0.5;

/**
 * Compose the audience's zoom offset onto a base camera `z`.
 *
 * Bounded on the near side only. There is deliberately no far bound: zooming out merely
 * makes content small and is trivially reversible, and the one that existed applied to
 * pinch alone, so touch hit a wall that the scroll wheel never did. A program that authors
 * a `z` nearer than `NearestZ` keeps its own choice — the bound constrains the audience,
 * not the program.
 */
export function composeZ(baseZ: number, dz: number): number {
    // z is negative and nearer means closer to zero, so the near bound is the *larger* of
    // the two: a program already nearer than NearestZ sets its own bound.
    const nearest = Math.max(NearestZ, baseZ);
    const z = baseZ + dz;
    // A nonsense adjustment is ignored rather than obeyed; any finite distance is a
    // legitimate zoom-out.
    if (!Number.isFinite(z)) return Math.min(baseZ, nearest);
    return Math.min(z, nearest);
}

/**
 * Solve for the focus z that fits content of the given size (in metres) into the
 * available screen space (in pixels), leaving the content as large as it can be without
 * clipping. Returns undefined when there's no space to fit into — a viewport whose size
 * isn't known yet would otherwise divide by zero and produce z = -Infinity, which scales
 * all output to nothing.
 */
export default function fitZ(
    contentWidth: number,
    contentHeight: number,
    availableWidth: number,
    availableHeight: number,
): number | undefined {
    if (availableWidth <= 0 || availableHeight <= 0) return undefined;

    // Content with no extent at all — an empty phrase measures exactly 0×0 — can't be
    // framed. Fitting it solved to z = 0, which put the camera in the output's own plane,
    // and output only draws in front of the focus (`place.z > focus.z` in PhraseView), so
    // the stage rendered blank. Framing some minimum box instead only trades that for the
    // opposite problem, because the fit scale is `available / content`: the smaller the
    // box, the more it magnifies, and whatever placeholder the view paints then fills the
    // stage. With nothing to frame there is nothing to magnify, so don't — render at
    // natural size and let the placeholder read as the small, empty thing it is.
    if (contentWidth === 0 && contentHeight === 0) return NaturalSizeZ;

    // Fit the dimension whose scale would be smaller, so nothing is clipped. A single
    // zero dimension divides to Infinity here and loses the comparison, which is correct:
    // the axis that has extent is the one to frame by.
    const horizontal =
        availableWidth / (contentWidth * PX_PER_METER) <
        availableHeight / (contentHeight * PX_PER_METER);

    return (
        -(
            (horizontal ? contentWidth : contentHeight) *
            PX_PER_METER *
            FOCAL_LENGTH
        ) / (horizontal ? availableWidth : availableHeight)
    );
}

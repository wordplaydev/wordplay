import {
    FOCAL_LENGTH,
    PX_PER_METER,
    rootScale,
    stageToScreen,
} from '@output/Output/outputToCSS';

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
 * small tile can't shrink a project to nothing; it is unrelated to how far the audience may
 * zoom out (see `MaxZoomOut`).
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
 * The metres the camera stays in front of the nearest output.
 *
 * Output renders only when `place.z > focus.z` *strictly*, so a camera that reaches the
 * nearest output's plane hides it and one that passes it turns the scene inside out (scale
 * is `1/z`). With content on the stage plane this gap is the entire zoom-in ceiling: 0.125m
 * is 64x natural size.
 *
 * It replaces a flat `NearestZ = -0.5`, which was really `0 - 0.5` under an unstated
 * assumption that content lives at z = 0. Stated as a gap, the same rule follows whatever is
 * actually on the stage: a project that places content forward can still be zoomed into, and
 * that content no longer vanishes the moment you zoom fully in.
 */
export const CameraGap = 0.125;

/**
 * The magnification the audience may always have, whatever the nearest content would allow.
 *
 * Without a floor, a single output placed far forward locks zoom-in for the whole project —
 * the camera would have to stay behind it, and behind it there is no room left to magnify.
 * When the floor wins, that output does pass behind the camera; the off-stage hint is what
 * explains the result rather than leaving a blank stage.
 */
export const MinZoomIn = 4;

/**
 * The scale ratio one zoom click changes the view by.
 *
 * The audience's zoom is a *ratio* rather than a distance in metres, and this is why.
 * Scale is `FOCAL_LENGTH / -z`, so a fixed step in metres has an effect that depends
 * entirely on where the camera already is: from -2m one click out cut the picture by a
 * third, from -112m one click in grew it by under a percent. Zooming out was cheap and
 * zooming back in was not, so a single trackpad flick could strand a viewer hundreds of
 * clicks from where they started — which is what #1175 reported. With a ratio, every zoom
 * out is undone by exactly one zoom in, wherever the camera happens to be.
 */
export const ZoomStep = 1.25;

/**
 * How much smaller than the program's own framing the audience may make the content.
 *
 * This bounds the *ratio*, so the guarantee it buys is stated in clicks rather than
 * metres: home is never more than `ceil(log(MaxZoomOut) / log(ZoomStep))` = 19 clicks
 * away. An earlier version of this file argued there should be no far bound at all,
 * because zooming out "is trivially reversible" — true of the metres, false of the
 * clicks, which is the only currency the audience actually spends.
 *
 * Unlike the near bound it is deliberately relative to the base camera rather than to the
 * content: when fitting is on the base *is* the content's framing, and zooming out can never
 * hide anything, so there is nothing for it to follow.
 */
export const MaxZoomOut = 64;

/**
 * Wheel pixels per doubling or halving of scale. Calibrated to preserve the old feel at
 * the default camera: at z = -12 a 100px notch used to scale by 0.885, and 2^(-100/500)
 * is 0.87.
 */
export const WheelPixelsPerDoubling = 500;

/** Wheel deltas can arrive in lines or pages rather than pixels (`WheelEvent.deltaMode`).
 *  Reading them as pixels made a line-reporting mouse — Firefox on Windows, ~3 per notch —
 *  zoom by nothing at all. */
const LinePixels = 16;
const PagePixels = 800;

/** Close enough to no adjustment at all. Stepping out and back lands a few float ulps from
 *  1, and without a snap the reset control stays lit with nothing to clear. */
const ZoomEpsilon = 1e-9;

/**
 * What bounds the audience's zoom: the camera it is riding on, and the nearest thing on
 * stage. The two travel together because the bound depends on both and they change
 * independently — passing the base alone is how a stale ceiling got left behind.
 */
export type ZoomLimits = {
    baseZ: number;
    /** The nearest output's z, from `Stage.getLayout().nearest`. The stage plane, 0, when
     *  there is nothing placed forward — which is the overwhelmingly common case. */
    nearestContentZ: number;
};

/** The camera z that renders at a given scale: the inverse of `rootScale(0, z)`. */
export function zAtScale(scale: number): number {
    return -FOCAL_LENGTH / scale;
}

/** The scale a base camera renders at. A camera in or behind the output's own plane has no
 *  scale to be relative to — `rootScale` is 1 at exactly 0 and 0 beyond it, with a pole in
 *  between — so it counts as natural size. That is what stops a step from multiplying zero,
 *  and what stops the first zoom *out* from a `Place(0m 0m 0m)` magnifying by 8x. */
function baseScaleOf(baseZ: number): number {
    const scale = rootScale(0, baseZ);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/**
 * The nearest z the audience may bring the camera to, given what is on stage.
 *
 * z is negative and nearer means closer to zero, so "nearest" is the *larger* of the two
 * candidates: stay `CameraGap` in front of the nearest output, but never so far back that
 * there is no zoom left at all (`MinZoomIn`).
 *
 * A program that has already put its own camera nearer than this needs no term here — the
 * ratio it yields is below 1, and `boundZoom` floors the ratio at 1 so the audience can
 * always at least return home.
 */
function nearestZ({ baseZ, nearestContentZ }: ZoomLimits): number {
    const forContent = Number.isFinite(nearestContentZ)
        ? nearestContentZ - CameraGap
        : -CameraGap;
    const floor = zAtScale(baseScaleOf(baseZ) * MinZoomIn);
    // The outer bound is absolute: content entirely behind the stage plane would otherwise
    // solve to a positive z, where rootScale is 0 and nothing renders at all.
    return Math.min(Math.max(forContent, floor), -CameraGap);
}

/**
 * Bound an audience zoom ratio to what may actually be rendered.
 *
 * Bounding the *stored* ratio rather than only the rendered one is what keeps a bound from
 * leaving a dead zone. Note that this is only half the job: the bound moves whenever the
 * base camera or the content does, so the *store* has to be re-bounded as that happens, not
 * merely at the moment a gesture writes it. `StageView` owns that; see its zoom-limits
 * effect. Bounding at write time alone left the stored ratio above a ceiling that had since
 * come down, which is a dead zone again — smaller, and the same mistake.
 */
export function boundZoom(limits: ZoomLimits, zoom: number): number {
    // A nonsense zoom hands the camera back rather than being obeyed.
    if (!Number.isFinite(zoom) || zoom <= 0) return 1;
    if (Math.abs(zoom - 1) < ZoomEpsilon) return 1;
    const base = baseScaleOf(limits.baseZ);
    const nearest = nearestZ(limits);
    // Never below 1 — `nearest` is at least as near as `baseZ` and scale grows with
    // nearness — so the audience can always at least return home.
    const most = Math.max(rootScale(0, nearest) / base, 1);
    return Math.min(Math.max(zoom, 1 / MaxZoomOut), most);
}

/**
 * Compose the audience's zoom ratio onto a base camera. The ratio rides on top of a moving
 * base instead of replacing it, so a viewer can zoom out of a project that moves its own
 * camera without freezing it — and because it is a ratio, their adjustment means the same
 * thing before and after the program dollies.
 */
export function composeZoom(limits: ZoomLimits, zoom: number): number {
    const bounded = boundZoom(limits, zoom);
    // No adjustment is the base camera *itself*, exactly — never some other z that happens
    // to render at the same scale, since output at other depths projects differently.
    if (bounded === 1) return limits.baseZ;
    return zAtScale(baseScaleOf(limits.baseZ) * bounded);
}

/**
 * The audience's zoom after `steps` clicks; positive is in, negative is out. Dividing
 * rather than multiplying by the reciprocal keeps small step counts exact.
 *
 * Home is a detent: a step that would cross the base camera lands on it instead. Without
 * one, a viewer who hit the far bound walked back up a lattice offset from where they
 * started — 55%, 69%, 87%, 108%, never 100% — so clicking back in could not return them to
 * the project's own view, which is the complaint this whole change is about. Only whole
 * clicks snap; a wheel or pinch is a continuous gesture and would feel stuck.
 */
export function zoomBySteps(
    limits: ZoomLimits,
    zoom: number,
    steps: number,
): number {
    const next =
        steps >= 0
            ? zoom * Math.pow(ZoomStep, steps)
            : zoom / Math.pow(ZoomStep, -steps);
    if ((zoom < 1 && next > 1) || (zoom > 1 && next < 1)) return 1;
    return boundZoom(limits, next);
}

/** The audience's zoom after a wheel or trackpad delta: exponential in the delta, so the
 *  same flick in the other direction undoes it. Scrolling down zooms out, as before. */
export function zoomByWheel(
    limits: ZoomLimits,
    zoom: number,
    deltaY: number,
    deltaMode: number,
): number {
    const pixels =
        deltaY *
        (deltaMode === 1 ? LinePixels : deltaMode === 2 ? PagePixels : 1);
    return boundZoom(
        limits,
        zoom * Math.pow(2, -pixels / WheelPixelsPerDoubling),
    );
}

/** The audience's zoom as a percentage of the program's own framing; 100 is home. Tenths
 *  below 10%, so consecutive steps at the far end still differ — an announcement whose text
 *  repeats is heard once and then is silent. */
export function zoomPercent(zoom: number): number {
    return zoom >= 0.1 ? Math.round(zoom * 100) : Math.round(zoom * 1000) / 10;
}

/**
 * How sharply the zoom gauge eases near home.
 *
 * The gauge is a position, and the range it spans is about thirteen doublings, so drawn
 * proportionally one click off home moves half a pixel — no feedback at all. Raising the
 * normalized distance to this power spends the track where the viewer actually lives,
 * around home: the first click moves ~3px of a 20px track and the far ends compress. The
 * price is that equal clicks are not equal distances, which is the right trade for an
 * indicator whose exact value is already spoken by the button's label.
 */
export const ZoomGaugeEase = 0.4;

/**
 * How far up its track the zoom gauge fills: 0 at the far bound, 0.5 at home, 1 at the near
 * end of the scale.
 *
 * The scale is fixed at ±`MaxZoomOut` rather than at the project's actual zoom-in ceiling.
 * That ceiling follows the nearest content and therefore moves, and a gauge that rescaled
 * while the viewer watched would be the same moving reference the camera bound just stopped
 * being. The cost is that a project which can only reach 4x tops out partway up the track —
 * which is honest, since it says this project has little room to zoom.
 */
export function zoomGauge(zoom: number): number {
    if (!Number.isFinite(zoom) || zoom <= 0) return 0.5;
    const t = Math.max(-1, Math.min(1, Math.log(zoom) / Math.log(MaxZoomOut)));
    return 0.5 + 0.5 * Math.sign(t) * Math.pow(Math.abs(t), ZoomGaugeEase);
}

/** How much of the stage's content the camera can actually show. */
export type Visibility = 'visible' | 'offscreen' | 'infinitesimal';

/** Below this many pixels on *both* axes, projected content is a smudge rather than a
 *  picture. Both, not either: a hairline 1px wide and 300px tall is still visible. */
export const MinVisiblePixels = 4;

/**
 * Whether the camera is showing the content at all — the predicate behind telling a viewer
 * that everything is off the stage rather than leaving them with a blank one.
 *
 * `Stage.getLayout` seeds its bounds at the origin, so the box always contains (0,0) and
 * this under-reports `offscreen`, which is the safe direction: silence when content is
 * visible beats a message over content that is.
 */
export function contentVisibility(
    bounds: Box,
    focus: Focus,
    viewportWidth: number,
    viewportHeight: number,
): Visibility {
    // Nothing measured to be off the edge of, and nothing to frame.
    if (!(viewportWidth > 0) || !(viewportHeight > 0)) return 'visible';
    if (bounds.right - bounds.left <= 0 && bounds.top - bounds.bottom <= 0)
        return 'visible';

    // The projection is a uniform scale plus a translate, so two opposite corners bound the
    // whole box. `stageToScreen` measures from the viewport's centre, and flips y.
    const a = stageToScreen(bounds.left, bounds.top, focus.x, focus.y, focus.z);
    const b = stageToScreen(
        bounds.right,
        bounds.bottom,
        focus.x,
        focus.y,
        focus.z,
    );
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    const halfWidth = viewportWidth / 2;
    const halfHeight = viewportHeight / 2;

    if (
        right < -halfWidth ||
        left > halfWidth ||
        bottom < -halfHeight ||
        top > halfHeight
    )
        return 'offscreen';
    if (right - left < MinVisiblePixels && bottom - top < MinVisiblePixels)
        return 'infinitesimal';
    return 'visible';
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

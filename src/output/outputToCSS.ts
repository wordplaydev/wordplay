import type Place from './Place';
import type Pose from './Pose';

export const PX_PER_METER = 16;
/** This is a scaling factor: for every 1m of z distance, we scale this much. */
export const FOCAL_LENGTH = 16;
/**
 * This is an extra scaling factor added to all output, creating a slight perspective shift from nesting.
 * This accounts for CSS transforms, which uniformly scale child content, but do not perspective scale it.
 * This is a bit of a hack, but does create a nice sense of depth.
 */
export const INCREMENTAL_SCALING_FACTOR = 0.01;

export function sizeToPx(size: number): string {
    return `${size * PX_PER_METER}px`;
}

export function toCSS(values: Record<string, string | undefined>) {
    return Object.keys(values)
        .map((key) => {
            const val = values[key];
            return val === undefined ? '' : `${key}: ${values[key]};`;
        })
        .join(' ');
}

function translateXY(x: number, y: number) {
    return `translate(${x}px, ${y}px)`;
}

function scaleXY(x: number, y: number) {
    return `scale(${x}, ${y})`;
}

function rotateDeg(deg: number) {
    return `rotate(${deg}deg)`;
}

export function rootScale(z: number, focusZ: number) {
    // Compute the delta between this phrase and the focus.
    const dz = z - focusZ;
    // Compute a scale proportional to the focal length and inversely proporitional to the difference.
    return dz < 0 ? 0 : dz === 0 ? 1 : FOCAL_LENGTH / dz;
}

export function incrementalScale(z: number) {
    return Math.max(0, 1 + INCREMENTAL_SCALING_FACTOR - z / FOCAL_LENGTH);
}

export function centerTransform(viewportWidth: number, viewportHeight: number) {
    return translateXY(viewportWidth / 2, viewportHeight / 2);
}

export default function outputToCSS(
    family: string | undefined,
    size: number | undefined,
    primaryPose: Pose,
    secondaryPose: Pose,
    place: Place,
    width: number | undefined,
    height: number | undefined,
    focus: Place,
    parentAscent: number,
    metrics: { width: number; fontAscent: number; actualAscent: number },
    viewport: { width: number; height: number } | undefined = undefined
) {
    return toCSS({
        width: width ? sizeToPx(width) : undefined,
        height: height ? sizeToPx(height) : undefined,
        transform: toOutputTransform(
            primaryPose,
            secondaryPose,
            place,
            focus,
            parentAscent,
            metrics,
            viewport
        ),
        // This disables translation around the center; we want to translate around the focus.
        'transform-origin': '0 0',
        color: (primaryPose.color ?? secondaryPose.color)?.toCSS(),
        opacity: (primaryPose.opacity ?? primaryPose.opacity)?.toString(),
        'font-family': family,
        // The font size is whatever it's normal size is, but adjusted for perspective, then translated into pixels.
        'font-size': size ? sizeToPx(size) : undefined,
    });
}

export function toOutputTransform(
    primaryPose: Pose,
    secondaryPose: Pose,
    place: Place,
    focus: Place,
    parentAscent: number,
    metrics: { width: number; fontAscent: number; actualAscent: number },
    viewport: { width: number; height: number } | undefined = undefined
) {
    const root = viewport !== undefined;

    // Compute rendered scale based on scale and and flip
    const scale = primaryPose.scale ?? secondaryPose.scale ?? 1;
    const xScale = scale * (primaryPose.flipx ?? secondaryPose.flipx ? -1 : 1);
    const yScale = scale * (primaryPose.flipy ?? secondaryPose.flipy ? -1 : 1);
    const offset = primaryPose.offset ?? secondaryPose.offset;
    const xOffset = offset ? offset.x * PX_PER_METER : 0;
    const yOffset = offset ? offset.y * PX_PER_METER : 0;
    const zOffset = offset ? offset.z : 0;
    const rotation = primaryPose.rotation ?? secondaryPose.rotation ?? 0;

    // Compute the final z position of the output based on it's place and it's offset.
    const z = place.z + zOffset;

    // We compute two different types of perspectve: if this the root, we do
    // perspective scaling proportional to the distance from the focus to this output.
    // If it's not the root, then we add to that some scaling factor proportional to the
    // additional z of the output. This accounts for the cumulative nature of CSS transforms,
    // where parents affect their children.
    const perspectiveScale = root ? rootScale(z, focus.z) : incrementalScale(z);

    // Find the center of the stage, around which we will rotate and scale.
    let centerXOffset = root ? 0 : metrics.width / 2;
    let centerYOffset = root ? 0 : metrics.actualAscent / 2;

    // Translate the place to screen coordinates.
    let placeX = place.x * PX_PER_METER;
    let placeY =
        // Negate y to account for flipped y axis.
        -place.y * PX_PER_METER -
        // If this isn't the root, subtract the height to render from the bottom
        (root ? 0 : metrics.actualAscent) +
        // Add the height of the parent to compensate for HTML rendering local coordinates from the top.
        parentAscent * PX_PER_METER;

    // Translate the focus to focus coordinates.
    // Negate y to account for flipped y axis.
    let focusX = focus.x * PX_PER_METER;
    let focusY = -focus.y * PX_PER_METER;

    // These are applied in reverse.
    const transform = [
        // If we're perspective scaling this output, translate around the focus center
        // in the local coordinate system, scale according to distance from focus,
        // then translate back. Remember that this all happens after everything below.

        // If the root, we don't undo the focus translation, because this is where we want it.
        // Otherwise we undo it, since we've already done it for the root.
        viewport
            ? translateXY(viewport.width / 2, viewport.height / 2)
            : translateXY(-focusX, -focusY),
        // Scale around the focus
        scaleXY(perspectiveScale, perspectiveScale),
        // Translate to the focus
        translateXY(focusX, focusY),
        // Translate to its position
        translateXY(placeX, placeY),
        // 5. Move back to the top left of the output.
        translateXY(centerXOffset, centerYOffset),
        // 4. Scale around the center and its offset
        scaleXY(xScale, yScale),
        // 3. Offset around the center
        translateXY(xOffset, -yOffset),
        // 2. Rotate around it's center
        // translateXY(0, phrase ? metrics.actualAscent : 0),
        rotateDeg(rotation),
        // translateXY(0, -(phrase ? metrics.actualAscent : 0)),
        // 1. Translate to the center of the output.
        translateXY(-centerXOffset, -centerYOffset),
    ];

    return transform.join(' ');
}

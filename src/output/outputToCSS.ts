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

export function focusToTransform(
    viewportWidth: number,
    viewportHeight: number
) {
    return translateXY(viewportWidth / 2, viewportHeight / 2);
}

export default function outputToCSS(
    family: string | undefined,
    size: number | undefined,
    rotation: number | undefined,
    pose: Pose,
    place: Place,
    width: number | undefined,
    height: number | undefined,
    focus: Place,
    root: boolean,
    parentAscent: number,
    metrics: { width: number; ascent: number }
) {
    return toCSS({
        // left: sizeToPx(place.x.toNumber()),
        // top: sizeToPx(place.y.toNumber()),
        width: width ? sizeToPx(width) : undefined,
        height: height ? sizeToPx(height) : undefined,
        transform: toOutputTransform(
            pose,
            place,
            rotation,
            focus,
            root,
            parentAscent,
            metrics
        ),
        // This disables translation around the center; we want to translate around the focus.
        'transform-origin': '0 0',
        color: pose?.color?.toCSS(),
        opacity: pose?.opacity?.toString(),
        'font-family': family,
        // The font size is whatever it's normal size is, but adjusted for perspective, then translated into pixels.
        'font-size': size ? sizeToPx(size) : undefined,
    });
}

export function toOutputTransform(
    pose: Pose,
    place: Place,
    rotation: number | undefined,
    focus: Place,
    root: boolean,
    parentAscent: number,
    metrics: { width: number; ascent: number }
) {
    // Compute rendered scale based on scale and and flip
    let xScale = 1;
    let yScale = 1;
    let xOffset = 0;
    let yOffset = 0;
    let zOffset = 0;
    let rotationOffset = 0;
    if (pose) {
        if (pose.scale !== undefined) {
            xScale = pose.scale;
            yScale = pose.scale;
        }
        if (pose.flipx === true) xScale = xScale * -1;
        if (pose.flipy === true) yScale = yScale * -1;
        if (pose.offset !== undefined) {
            xOffset = pose.offset.x * PX_PER_METER;
            yOffset = pose.offset.y * PX_PER_METER;
            zOffset = pose.offset.z;
        }
        rotationOffset = pose.tilt ?? 0;
    }

    // Compute the final z position of the output based on it's place and it's offset.
    const z = place.z + zOffset;

    // We compute two different types of perspectve: if this the root, we do
    // perspective scaling proportional to the distance from the focus to this output.
    // If it's not the root, then we add to that some scaling factor proportional to the
    // additional z of the output. This accounts for the cumulative nature of CSS transforms,
    // where parents affect their children.
    const perspectiveScale = root ? rootScale(z, focus.z) : incrementalScale(z);

    // When computing the center, account for scale
    // Negate ascent to account for flipped y axis.
    let centerXOffset = metrics.width / 2;
    let centerYOffset = metrics.ascent / 2;

    // Translate the place to screen coordinates.
    let placeX = place.x * PX_PER_METER;
    let placeY =
        // Negate y to account for flipped y axis.
        -place.y * PX_PER_METER -
        // If this isn't the root, subtract the height to render from the bottom
        (root ? 0 : metrics.ascent) +
        // Add the height of the parent to compensate for HTML rendering local coordinates from the top.
        parentAscent * PX_PER_METER;

    // Translate the focus to focus coordinates.
    // Negate y to account for flipped y axis.
    let focusX = focus.x * PX_PER_METER;
    let focusY = -focus.y * PX_PER_METER;

    // These are applied in reverse.
    return [
        // If we're perspective scaling this output, translate around the focus center
        // in the local coordinate system, scale according to distance from focus,
        // then translate back. Remember that this all happens after everything below.
        // Undo the focus translation
        translateXY(-focusX, -focusY),
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
        rotateDeg((rotation ?? 0) + rotationOffset),
        // 1. Translate to the center of the output.
        translateXY(-centerXOffset, -centerYOffset),
    ].join(' ');
}

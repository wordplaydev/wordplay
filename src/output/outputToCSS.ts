import Decimal from 'decimal.js';
import type Place from './Place';
import type Pose from './Pose';

export const PX_PER_METER = 16;
export const FOCAL_LENGTH = new Decimal(20);

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

export function zScale(z: Decimal, focusZ: Decimal) {
    // Compute the delta between this phrase and the focus.
    const dz = z.sub(focusZ);
    // Compute a scale proportional to the focal length and inversely proporitional to the difference.
    return FOCAL_LENGTH.div(dz);
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
    pose: Pose,
    place: Place,
    width: number | undefined,
    height: number | undefined,
    focus: Place,
    metrics: { width: number; ascent: number },
    perspective: boolean
) {
    return toCSS({
        // left: sizeToPx(place.x.toNumber()),
        // top: sizeToPx(place.y.toNumber()),
        width: width ? sizeToPx(width) : undefined,
        height: height ? sizeToPx(height) : undefined,
        transform: toOutputTransform(pose, place, focus, metrics, perspective),
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
    focus: Place,
    metrics: { width: number; ascent: number },
    perspective: boolean
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
            xOffset = pose.offset.x.toNumber() * PX_PER_METER;
            yOffset = pose.offset.y.toNumber() * PX_PER_METER;
            zOffset = pose.offset.z.toNumber();
            rotationOffset = pose.offset.rotation.toNumber();
        }
    }

    // Get the z scale using the z place and it's offset.
    const perspectiveScale = zScale(place.z.add(zOffset), focus.z).toNumber();

    // When computing the center, account for scale
    let centerXOffset = metrics.width / 2;
    let centerYOffset = metrics.ascent / 2;

    let placeX = place.x.toNumber() * PX_PER_METER;
    let placeY = place.y.toNumber() * PX_PER_METER;

    let focusX = focus.x.toNumber() * PX_PER_METER;
    let focusY = focus.y.toNumber() * PX_PER_METER;

    // These are applied in reverse.
    return [
        // If we're perspective scaling this output, translate around the focus center
        // in the local coordinate system, scale according to distance from focus,
        // then translate back. Remember that this all happens after everything below.
        perspective
            ? [
                  // Undo the focus translation
                  translateXY(-focusX, -focusY),
                  // Scale around the focus
                  scaleXY(perspectiveScale, perspectiveScale),
                  // Translate to the focus
                  translateXY(focusX, focusY),
              ].join(' ')
            : '',
        // Translate to its position
        translateXY(placeX, placeY),
        // 5. Move back to the top left of the output.
        translateXY(centerXOffset, centerYOffset),
        // 4. Scale around the center and its offset
        scaleXY(xScale, yScale),
        // 3. Offset around the center
        translateXY(xOffset, yOffset),
        // 2. Rotate around it's center
        rotateDeg(place.rotation.toNumber() + rotationOffset),
        // 1. Translate to the center of the output.
        translateXY(-centerXOffset, -centerYOffset),
    ].join(' ');
}

import Decimal from 'decimal.js';
import type Place from './Place';
import type Pose from './Pose';

export const PX_PER_METER = 16;
export const MAGNIFIER = 12;
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

export default function outputToCSS(
    family: string | undefined,
    size: number,
    pose: Pose,
    place: Place,
    focus: Place,
    viewportWidth: number,
    viewportHeight: number,
    metrics: { width: number; ascent: number }
) {
    return toCSS({
        left: '0px',
        top: '0px',
        transform: toOutputTransform(
            pose,
            place,
            focus,
            viewportWidth,
            viewportHeight,
            metrics
        ),
        // This disables translation around the center; we want to translate around the focus.
        'transform-origin': '0 0',
        color: pose?.color?.toCSS(),
        opacity: pose?.opacity?.toString(),
        'font-family': family,
        // The font size is whatever it's normal size is, but adjusted for perspective, then translated into pixels.
        'font-size': sizeToPx(size),
    });
}

export function toOutputTransform(
    pose: Pose,
    place: Place,
    focus: Place,
    viewportWidth: number,
    viewportHeight: number,
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
            xOffset = pose.offset.x.toNumber();
            yOffset = pose.offset.y.toNumber();
            zOffset = pose.offset.z.toNumber();
            rotationOffset = pose.offset.rotation.toNumber();
        }
    }

    // Get the z scale using the z place and it's offset.
    const perspectiveScale = zScale(place.z.add(zOffset), focus.z);

    const centerXOffset =
        place.x.times(PX_PER_METER).toNumber() + metrics.width / 2;
    const centerYOffset =
        place.y.times(PX_PER_METER).toNumber() + metrics.ascent / 2;

    // These are applied in reverse
    return [
        // Lastly, center around the viewport center.
        translateXY(viewportWidth / 2, viewportHeight / 2),
        // Undo the focus translation
        translateXY(
            -focus.x.toNumber() * PX_PER_METER,
            -focus.y.toNumber() * PX_PER_METER
        ),
        // Scale around the focus
        scaleXY(perspectiveScale.toNumber(), perspectiveScale.toNumber()),
        // Translate to the focus
        translateXY(
            focus.x.toNumber() * PX_PER_METER,
            focus.y.toNumber() * PX_PER_METER
        ),
        // Translate to the center
        translateXY(centerXOffset, centerYOffset),
        // Scale around the center
        scaleXY(xScale, yScale),
        // Offset around the center
        translateXY(xOffset * PX_PER_METER, yOffset * PX_PER_METER),
        // Rotate around the center
        rotateDeg(place.rotation.toNumber() + rotationOffset),
        // Translate to the center
        translateXY(-centerXOffset, -centerYOffset),
        // Translate to its position
        translateXY(
            place.x.toNumber() * PX_PER_METER,
            place.y.toNumber() * PX_PER_METER
        ),
    ].join(' ');
}

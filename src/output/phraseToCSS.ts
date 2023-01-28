import Decimal from 'decimal.js';
import type Phrase from './Phrase';
import type Place from './Place';

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

export default function phraseToCSS(
    phrase: Phrase,
    place: Place,
    focus: Place,
    viewportWidth: number,
    viewportHeight: number,
    metrics: { width: number; ascent: number }
) {
    // Get the z scale.
    const perspectiveScale = zScale(place.z, focus.z);

    const centerXOffset =
        place.x.times(PX_PER_METER).toNumber() + metrics.width / 2;
    const centerYOffset =
        place.y.times(PX_PER_METER).toNumber() + metrics.ascent / 2;

    // These are applied in reverse
    const transform = [
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
        scaleXY(phrase.scalex ?? 1, phrase.scaley ?? 1),
        // Offset around the center
        translateXY(
            (phrase.offset?.x.toNumber() ?? 0) * PX_PER_METER,
            (phrase.offset?.y.toNumber() ?? 0) * PX_PER_METER
        ),
        // Rotate around the center
        rotateDeg(phrase.rotation ?? 0),
        // Translate to the center
        translateXY(-centerXOffset, -centerYOffset),
        // Translate to its position
        translateXY(
            place.x.add(phrase.offset?.x ?? 0).toNumber() * PX_PER_METER,
            place.y.add(phrase.offset?.y ?? 0).toNumber() * PX_PER_METER
        ),
    ];

    return toCSS({
        left: '0px',
        top: '0px',
        transform: transform.join(' '),
        // This disables translation around the center; we want to translate around the focus.
        'transform-origin': '0 0',
        color: phrase.color?.toCSS(),
        opacity:
            phrase.opacity !== undefined
                ? phrase.opacity.toString()
                : undefined,
        'font-family': phrase.font,
        // The font size is whatever it's normal size is, but adjusted for perspective, then translated into pixels.
        'font-size': sizeToPx(phrase.size),
    });
}

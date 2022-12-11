import type Phrase from "./Phrase";
import type Place from "./Place";

export const PX_PER_METER = 16;
export const MAGNIFIER = 12;

export function sizeToPx(size: number): string { return `${size * PX_PER_METER}px`; }

export function sizeToFontSize(size: number, z: number, focus: number) {
    return sizeToPx(MAGNIFIER * (size / (z - focus)));
}

export function toCSS(values: Record<string,string|undefined>) {
    return Object.keys(values).map(key => {
        const val = values[key];
        return val === undefined ? "" : `${key}: ${values[key]};`;
    }).join(" ");
}

export default function phraseToCSS(phrase: Phrase, place: Place, focus: Place) {

    return toCSS({
        left: sizeToPx(place.x.toNumber()),
        top: sizeToPx(place.y.toNumber()),
        transform: 
            phrase.offset || phrase.rotation || phrase.scalex || phrase.scaley ? 
            `${phrase.offset ? `translate(${sizeToPx(phrase.offset.x.toNumber())}, ${sizeToPx(phrase.offset.y.toNumber())})`: ""} ${phrase.rotation ? `rotate(${phrase.rotation}deg)` : ""} ${phrase.scalex || phrase.scaley ? `scale(${phrase.scalex}, ${phrase.scaley})` : ""}` : 
            undefined,
        color: phrase.color?.toCSS(),
        opacity: phrase.opacity ? phrase.opacity.toString() : undefined,
        "font-family": phrase.font,
        // The font size is whatever it's normal size is, but adjusted for perspective, then translated into pixels.
        "font-size": sizeToFontSize(phrase.size, place.z.toNumber(), focus.z.toNumber()),
    })

}
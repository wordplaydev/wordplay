import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import Fade, { FadeType } from "./Fade";
import Scale, { ScaleType } from "./Scale";
import { toDecimal } from "./Verse";


export function toTransition(value: Value | undefined) {

    if (!(value instanceof Structure))
        return undefined;

    const duration = toDecimal(value.resolve("duration"));
    const delay = toDecimal(value.resolve("delay"));

    switch (value.type) {
        case FadeType: return new Fade(value, duration, delay);
        case ScaleType: return new Scale(value, duration, delay);
    }
    return undefined;

}

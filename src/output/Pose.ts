import toStructure from "../native/toStructure";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import FunctionValue from "../runtime/FunctionValue";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import type Color from "./Color";
import Output from "./Output";
import { toTextLang } from "./Phrase";
import type Place from "./Place";
import { toPlace } from "./Place";
import type TextLang from "./TextLang";
import { toDecimal } from "./Verse";
import Text from "../runtime/Text";
import { toColor } from "./Color";
import { TRANSLATE } from "../nodes/Translations";
import { SupportedFontsType } from "../native/Fonts";
import Sequence from "./Sequence";

export const PoseType = toStructure(`
    •Pose/eng(
        duration/eng•#s: 0.5s
        style/eng•ƒ(complete•%) %: fast
        text/eng,✍︎/😀•""|[""]|ø: ø
        size/eng,${TRANSLATE}size/😀•#m|ø: ø
        font/eng,🔡/😀•${SupportedFontsType}|ø: ø
        color/eng,${TRANSLATE}color/😀•Color|ø: ø
        opacity/eng,${TRANSLATE}opacity/😀•%|ø: ø
        place/eng,${TRANSLATE}place/😀•Place|ø: ø
        offset/eng,${TRANSLATE}offset/😀•Place|ø: ø
        rotation/eng,${TRANSLATE}rotation/😀•#°|ø: ø
        scalex/eng,${TRANSLATE}scalex/😀•#|ø: ø
        scaley/eng,${TRANSLATE}scaley/😀•#|ø: ø
    )
`);

export default class Pose extends Output {

    readonly duration: number;
    readonly style: FunctionDefinition;
    readonly text?: TextLang[];
    readonly size?: number;
    readonly font?: string;
    readonly color?: Color;
    readonly opacity?: number;
    readonly place?: Place;
    readonly offset?: Place;
    readonly rotation?: number;
    readonly scalex?: number;
    readonly scaley?: number;

    constructor(
        value: Value, 
        duration: number, 
        style: FunctionDefinition,
        text?: TextLang[],
        size?: number,
        font?: string,
        color?: Color,
        opacity?: number,
        place?: Place,
        offset?: Place,
        rotation?: number,
        scalex?: number,
        scaley?: number
    ) {
        super(value);

        this.duration = duration;
        this.style = style;
        this.text = text;
        this.size = size;
        this.font = font;
        this.color = color;
        this.opacity = opacity;
        this.place = place;
        this.offset = offset;
        this.rotation = rotation;
        this.scalex = scalex;
        this.scaley = scaley;

    }

    asSequence() {
        return new Sequence(this.value, 1, [ this ]);
    }

}

export function toPose(value: Value | undefined): Pose | undefined {

    if(!(value instanceof Structure && value.type === PoseType)) return undefined;

    const duration = toDecimal(value.resolve("duration"));
    const style = toFunction(value.resolve("style"));
    const text = toTextLang(value.resolve("text"));
    const size = toDecimal(value.resolve("size"))?.toNumber();
    const font = value.resolve("font");
    const color = toColor(value.resolve("color"));
    const opacity = toDecimal(value.resolve("opacity"))?.toNumber();
    const place = toPlace(value.resolve("place"));
    const offset = toPlace(value.resolve("offset"));
    const rotation = toDecimal(value.resolve("rotation"))?.toNumber();
    const scalex = toDecimal(value.resolve("scalex"))?.toNumber();
    const scaley = toDecimal(value.resolve("scaley"))?.toNumber();

    return duration && style ? 
        new Pose(value, duration.toNumber(), style, text, size, font instanceof Text ? font.text : undefined, color, opacity, place, offset, rotation, scalex, scaley) : undefined;

}

function toFunction(value: Value | undefined): FunctionDefinition | undefined {

    return value instanceof FunctionValue ? value.definition : undefined;

}
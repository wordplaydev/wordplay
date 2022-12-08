import Decimal from "decimal.js";
import toStructure from "../native/toStructure";
import type Value from "../runtime/Value";
import Output from "./Output";
import { toDecimal } from "./Verse";
import ColorJS from "colorjs.io";

export const ColorType = toStructure(`
    •Color/eng,🌈/😀(
        lightness/eng,l/😀•#
        chroma/eng,c/😀•#
        hue/eng,h/😀•#°
    )
`);

export default class Color extends Output {

    readonly lightness: Decimal;
    readonly chroma: Decimal;
    readonly hue: Decimal;

    constructor(value: Value, l: Decimal, c: Decimal, h: Decimal, a: Decimal) {

        super(value);
        
        this.lightness = l;
        this.chroma = c;
        this.hue = h;

    }

    toCSS() {

        return new ColorJS(
            ColorJS.spaces.lch, 
            [ this.lightness.toNumber() * 100, this.chroma.toNumber(), this.hue.toNumber() ], 1
        ).to("srgb").toString();

    }

}

export function toColor(value: Value | undefined) {

    if(value === undefined) return undefined;

    const l = toDecimal(value.resolve("lightness"));
    const c = toDecimal(value.resolve("chroma"));
    const h = toDecimal(value.resolve("hue"));
    const t = toDecimal(value.resolve("transparency")) ?? new Decimal(100);

    return l && c && h && t ? new Color(value, l, c, h, t) : undefined;

}
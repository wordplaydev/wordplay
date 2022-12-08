import Decimal from "decimal.js";
import toStructure from "../native/toStructure";
import { TRANSLATE } from "../nodes/Translations";
import type Value from "../runtime/Value";
import Output from "./Output";
import { toDecimal } from "./Verse";

export const ColorType = toStructure(`
    •Color/eng,${TRANSLATE}Color/😀(
        lightness/eng,${TRANSLATE}l/😀•#%
        chroma/eng,${TRANSLATE}c/😀•#
        hue/eng,${TRANSLATE}h/😀•#°
        transparency/eng,${TRANSLATE}a•#%: 100
    )
`);

export default class Color extends Output {

    readonly lightness: Decimal;
    readonly chroma: Decimal;
    readonly hue: Decimal;
    readonly transparency: Decimal;

    constructor(value: Value, l: Decimal, c: Decimal, h: Decimal, a: Decimal) {

        super(value);
        
        this.lightness = l;
        this.chroma = c;
        this.hue = h;
        this.transparency = a;

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
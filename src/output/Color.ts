import Decimal from 'decimal.js';
import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import Valued, { getOutputInputs } from './Valued';
import { toDecimal } from './Stage';
import { TYPE_SYMBOL } from '@parser/Symbols';
import { getBind } from '@locale/getBind';
import Evaluate from '../nodes/Evaluate';
import NumberLiteral from '../nodes/NumberLiteral';
import Reference from '../nodes/Reference';
import Unit from '../nodes/Unit';
import type Project from '../db/projects/Project';
import StructureValue from '../values/StructureValue';
import type Locales from '../locale/Locales';

export function createColorType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Color, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Color.lightness)}•%
        ${getBind(locales, (locale) => locale.output.Color.chroma)}•#
        ${getBind(locales, (locale) => locale.output.Color.hue)}•#°
    )
`);
}

export default class Color extends Valued {
    /** 0-1 */
    readonly lightness: Decimal;
    /** 0-∞ */
    readonly chroma: Decimal;
    /** 0-360 */
    readonly hue: Decimal;

    constructor(value: Value, l: Decimal, c: Decimal, h: Decimal) {
        super(value);

        this.lightness = l;
        this.chroma = c;
        this.hue = h;
    }

    contrasting() {
        return new Color(
            this.value,
            new Decimal(this.lightness.greaterThan(0.5) ? 0 : 1),
            new Decimal(100),
            new Decimal(0),
        );
    }

    hash() {
        return `${this.lightness}${this.chroma}${this.hue}`;
    }

    toCSS() {
        // We should be able to return a direct LCH value, but Safari doesn't handle CSS opacity on LCH colors of symbols well.
        // return opaque === true ? color.to('srgb').toString() : color.display();
        return LCHtoRGB(
            this.lightness.toNumber(),
            this.chroma.toNumber(),
            this.hue.toNumber(),
        );
    }

    equals(color: Color) {
        return (
            this.lightness.equals(color.lightness) &&
            this.chroma.equals(color.chroma) &&
            this.hue.equals(color.hue)
        );
    }
}

export function createColorLiteral(
    project: Project,
    locales: Locales,
    lightness: number,
    chroma: number,
    hue: number,
) {
    const ColorType = project.shares.output.Color;
    return Evaluate.make(
        Reference.make(locales.getName(ColorType.names), ColorType),
        [
            NumberLiteral.make(lightness),
            NumberLiteral.make(chroma),
            NumberLiteral.make(hue, Unit.reuse(['°'])),
        ],
    );
}

export function toColor(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;

    const [lVal, cVal, hVal] = getOutputInputs(value);
    const l = toDecimal(lVal);
    const c = toDecimal(cVal);
    const h = toDecimal(hVal);

    return l && c && h ? new Color(value, l, c, h) : undefined;
}

/** l: 0-1, c: 0-infinity, h=0-360 */
export function LCHtoRGB(l: number, c: number, h: number) {
    return `lch(${l * 100}% ${c} ${h}deg)`;
    // The previous way we converted to rgb prior to LCH support.
    // const color = new ColorJS(ColorJS.spaces.lch, [l * 100, c, h], 1);
    // return color.to('srgb').toString();
}

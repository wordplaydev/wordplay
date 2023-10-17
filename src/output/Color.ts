import Decimal from 'decimal.js';
import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import Valued, { getOutputInputs } from './Valued';
import { toDecimal } from './Stage';
import ColorJS from 'colorjs.io';
import { TYPE_SYMBOL } from '@parser/Symbols';
import { getBind } from '@locale/getBind';
import Evaluate from '../nodes/Evaluate';
import NumberLiteral from '../nodes/NumberLiteral';
import Reference from '../nodes/Reference';
import Unit from '../nodes/Unit';
import type Project from '../models/Project';
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
    readonly lightness: Decimal;
    readonly chroma: Decimal;
    readonly hue: Decimal;

    constructor(value: Value, l: Decimal, c: Decimal, h: Decimal) {
        super(value);

        this.lightness = l;
        this.chroma = c;
        this.hue = h;
    }

    complement() {
        return new Color(
            this.value,
            new Decimal(1).sub(this.lightness),
            this.chroma,
            new Decimal(360).sub(this.hue)
        );
    }

    hash() {
        return `${this.lightness}${this.chroma}${this.hue}`;
    }

    toCSS() {
        const color = new ColorJS(
            ColorJS.spaces.lch,
            [
                this.lightness.toNumber() * 100,
                this.chroma.toNumber(),
                this.hue.toNumber(),
            ],
            1
        );
        return color.to('srgb').toString();
        // We should be able to return a direct LCH value, but Safari doesn't handle CSS opacity on LCH colors of symbols well.
        // return opaque === true ? color.to('srgb').toString() : color.display();
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
    hue: number
) {
    const ColorType = project.shares.output.Color;
    return Evaluate.make(
        Reference.make(locales.getName(ColorType.names), ColorType),
        [
            NumberLiteral.make(lightness),
            NumberLiteral.make(chroma),
            NumberLiteral.make(hue, Unit.reuse(['°'])),
        ]
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

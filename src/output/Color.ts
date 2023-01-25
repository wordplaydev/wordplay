import type Decimal from 'decimal.js';
import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import Output from './Output';
import { toDecimal } from './Verse';
import ColorJS from 'colorjs.io';
import { TYPE_SYMBOL } from '@parser/Symbols';
import { getBind } from '@translation/getBind';

export const ColorType = toStructure(`
    ${getBind((t) => t.output.color.definition, TYPE_SYMBOL)}(
        ${getBind((t) => t.output.color.lightness)}•%
        ${getBind((t) => t.output.color.chroma)}•#
        ${getBind((t) => t.output.color.hue)}•#°
    )
`);

export default class Color extends Output {
    readonly lightness: Decimal;
    readonly chroma: Decimal;
    readonly hue: Decimal;

    constructor(value: Value, l: Decimal, c: Decimal, h: Decimal) {
        super(value);

        this.lightness = l;
        this.chroma = c;
        this.hue = h;
    }

    toCSS() {
        return new ColorJS(
            ColorJS.spaces.lch,
            [
                this.lightness.toNumber() * 100,
                this.chroma.toNumber(),
                this.hue.toNumber(),
            ],
            1
        )
            .to('srgb')
            .toString();
    }
}

export function toColor(value: Value | undefined) {
    if (value === undefined) return undefined;

    const l = toDecimal(value.resolve('lightness'));
    const c = toDecimal(value.resolve('chroma'));
    const h = toDecimal(value.resolve('hue'));

    return l && c && h ? new Color(value, l, c, h) : undefined;
}

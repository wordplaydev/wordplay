import type Decimal from 'decimal.js';
import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import Output from './Output';
import { toDecimal } from './Stage';
import ColorJS from 'colorjs.io';
import { TYPE_SYMBOL } from '@parser/Symbols';
import { getBind } from '@locale/getBind';
import Evaluate from '../nodes/Evaluate';
import NumberLiteral from '../nodes/NumberLiteral';
import Reference from '../nodes/Reference';
import type LanguageCode from '../locale/LanguageCode';
import Unit from '../nodes/Unit';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';

export function createColorType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (t) => t.output.Color, TYPE_SYMBOL)}(
        ${getBind(locales, (t) => t.output.Color.lightness)}•%
        ${getBind(locales, (t) => t.output.Color.chroma)}•#
        ${getBind(locales, (t) => t.output.Color.hue)}•#°
    )
`);
}

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
    languages: LanguageCode[],
    lightness: number,
    chroma: number,
    hue: number
) {
    const ColorType = project.shares.output.color;
    return Evaluate.make(
        Reference.make(ColorType.names.getLocaleText(languages), ColorType),
        [
            NumberLiteral.make(lightness),
            NumberLiteral.make(chroma),
            NumberLiteral.make(hue, Unit.make(['°'])),
        ]
    );
}

export function toColor(value: Value | undefined) {
    if (value === undefined) return undefined;

    const l = toDecimal(value.resolve('lightness'));
    const c = toDecimal(value.resolve('chroma'));
    const h = toDecimal(value.resolve('hue'));

    return l && c && h ? new Color(value, l, c, h) : undefined;
}

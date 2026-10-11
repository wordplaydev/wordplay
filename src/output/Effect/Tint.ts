import toStructure from '#basis/toStructure.ts';
import { getBind } from '#locale/getBind.ts';
import { getTypeName } from '#locale/getNameLocales.ts';
import type Locales from '#locale/Locales.ts';
import type OutputTexts from '#locale/OutputTexts.ts';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import StructureValue from '#values/StructureValue.ts';
import type Value from '#values/Value.ts';
import type Color from '#output/Color/Color.ts';
import { toColor } from '#output/Color/Color.ts';
import { toNumber } from '#output/Output/Stage.ts';
import { getOutputInputs } from '#output/Output/Valued.ts';
import { clampSetting, Effect } from '#output/Effect/Effect.ts';

export function createTintType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Tint, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Tint.color)}•${getTypeName(locales, (l) => l.output.Color.names)}
        ${getBind(locales, (locale) => locale.output.Tint.amount)}•%: 50%
    )
`);
}

/** Washes everything beneath it in one color, keeping its light and dark. */
export class Tint extends Effect {
    readonly color: Color;
    readonly amount: number;

    constructor(value: Value, color: Color, amount: number) {
        super(value);
        this.color = color;
        this.amount = amount;
    }

    getLayer(adapting: boolean) {
        return {
            kind: 'fill' as const,
            background: this.color.toCSS(adapting),
            // Takes the tint's hue and saturation and keeps the stage's lightness,
            // so text stays as readable as it was.
            blend: 'color',
            opacity: this.amount,
        };
    }

    getNames(texts: OutputTexts) {
        return texts.Tint.names;
    }
}

export function toTint(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [color, amount] = getOutputInputs(value);
    const tint = toColor(color);
    return tint
        ? new Tint(value, tint, clampSetting(toNumber(amount), 0.5, 0, 1))
        : undefined;
}

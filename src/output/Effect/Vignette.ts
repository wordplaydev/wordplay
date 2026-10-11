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
import { clampSetting, Effect, effectColor } from '#output/Effect/Effect.ts';

export function createVignetteType(locales: Locales) {
    const colorName = getTypeName(locales, (l) => l.output.Color.names);
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Vignette, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Vignette.amount)}•%: 50%
        ${getBind(locales, (locale) => locale.output.Vignette.color)}•${colorName}|ø: ø
    )
`);
}

/** Darkens the edges of the stage, leaving the middle clear. */
export class Vignette extends Effect {
    readonly amount: number;
    /** The color the edges fade to; undefined is black. */
    readonly color: Color | undefined;

    constructor(value: Value, amount: number, color: Color | undefined) {
        super(value);
        this.amount = amount;
        this.color = color;
    }

    getLayer(adapting: boolean) {
        const edge =
            this.color?.toCSS(adapting) ?? effectColor(0, 0, 0, 1, adapting);
        // The clear middle shrinks as the amount grows, so a strong vignette closes in.
        const clear = Math.round(70 - this.amount * 50);
        return {
            kind: 'fill' as const,
            background: `radial-gradient(ellipse at center, transparent ${clear}%, ${edge} 100%)`,
            blend: undefined,
            opacity: Math.min(1, this.amount * 1.5),
        };
    }

    getNames(texts: OutputTexts) {
        return texts.Vignette.names;
    }
}

export function toVignette(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [amount, color] = getOutputInputs(value);
    return new Vignette(
        value,
        clampSetting(toNumber(amount), 0.5, 0, 1),
        toColor(color),
    );
}

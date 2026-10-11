import toStructure from '#basis/toStructure.ts';
import { getBind } from '#locale/getBind.ts';
import { getTypeName } from '#locale/getNameLocales.ts';
import type Locales from '#locale/Locales.ts';
import type OutputTexts from '#locale/OutputTexts.ts';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import StructureValue from '#values/StructureValue.ts';
import type Value from '#values/Value.ts';
import { toNumber } from '#output/Output/Stage.ts';
import { getOutputInputs } from '#output/Output/Valued.ts';
import { PX_PER_METER } from '#output/Output/outputToCSS.ts';
import { clampSetting, Effect } from '#output/Effect/Effect.ts';

export function createBlurType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Blur, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Blur.amount)}•#m: 0.05m
    )
`);
}

/** Softens everything beneath it. */
export class Blur extends Effect {
    /** How far the blur spreads, in meters. */
    readonly amount: number;

    constructor(value: Value, amount: number) {
        super(value);
        this.amount = amount;
    }

    getLayer() {
        return {
            kind: 'backdrop' as const,
            filter: `blur(${this.amount * PX_PER_METER}px)`,
        };
    }

    getNames(texts: OutputTexts) {
        return texts.Blur.names;
    }
}

export function toBlur(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [amount] = getOutputInputs(value);
    return new Blur(value, clampSetting(toNumber(amount), 0.05, 0, 2));
}

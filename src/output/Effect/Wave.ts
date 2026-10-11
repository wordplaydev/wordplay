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

export function createWaveType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Wave, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Wave.amount)}•#m: 0.2m
        ${getBind(locales, (locale) => locale.output.Wave.scale)}•#m: 2m
        ${getBind(locales, (locale) => locale.output.Wave.speed)}•#: 1
    )
`);
}

/** Ripples the output on stage, as if seen through water or rising heat. */
export class Wave extends Effect {
    /** How far the ripples push output, in meters. */
    readonly amount: number;
    /** How far apart the ripples are, in meters. */
    readonly scale: number;
    /** How fast the ripples move; 0 holds them still. */
    readonly speed: number;

    constructor(value: Value, amount: number, scale: number, speed: number) {
        super(value);
        this.amount = amount;
        this.scale = scale;
        this.speed = speed;
    }

    getLayer() {
        return {
            kind: 'ripple' as const,
            amount: this.amount * PX_PER_METER,
            scale: this.scale * PX_PER_METER,
            speed: this.speed,
        };
    }

    getNames(texts: OutputTexts) {
        return texts.Wave.names;
    }
}

export function toWave(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [amount, scale, speed] = getOutputInputs(value);
    return new Wave(
        value,
        clampSetting(toNumber(amount), 0.2, 0, 2),
        clampSetting(toNumber(scale), 2, 0.1, 20),
        clampSetting(toNumber(speed), 1, -10, 10),
    );
}

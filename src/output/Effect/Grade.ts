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
import { clampSetting, Effect } from '#output/Effect/Effect.ts';

export function createGradeType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Grade, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Grade.brightness)}•%: 100%
        ${getBind(locales, (locale) => locale.output.Grade.contrast)}•%: 100%
        ${getBind(locales, (locale) => locale.output.Grade.saturation)}•%: 100%
        ${getBind(locales, (locale) => locale.output.Grade.hue)}•#°: 0°
    )
`);
}

/** Adjusts the brightness, contrast, saturation, and hue of everything beneath it, like a film's color grade. */
export class Grade extends Effect {
    readonly brightness: number;
    readonly contrast: number;
    readonly saturation: number;
    /** Degrees to turn every hue around the color wheel. */
    readonly hue: number;

    constructor(
        value: Value,
        brightness: number,
        contrast: number,
        saturation: number,
        hue: number,
    ) {
        super(value);
        this.brightness = brightness;
        this.contrast = contrast;
        this.saturation = saturation;
        this.hue = hue;
    }

    getLayer() {
        return {
            kind: 'backdrop' as const,
            filter: `brightness(${this.brightness}) contrast(${this.contrast}) saturate(${this.saturation}) hue-rotate(${this.hue}deg)`,
        };
    }

    getNames(texts: OutputTexts) {
        return texts.Grade.names;
    }
}

export function toGrade(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [brightness, contrast, saturation, hue] = getOutputInputs(value);
    return new Grade(
        value,
        clampSetting(toNumber(brightness), 1, 0, 5),
        clampSetting(toNumber(contrast), 1, 0, 5),
        clampSetting(toNumber(saturation), 1, 0, 5),
        clampSetting(toNumber(hue), 0, -3600, 3600),
    );
}

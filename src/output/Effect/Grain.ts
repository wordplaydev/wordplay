import toStructure from '#basis/toStructure.ts';
import { getBind } from '#locale/getBind.ts';
import { getTypeName } from '#locale/getNameLocales.ts';
import type Locales from '#locale/Locales.ts';
import type OutputTexts from '#locale/OutputTexts.ts';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import StructureValue from '#values/StructureValue.ts';
import type Value from '#values/Value.ts';
import { toBoolean, toNumber } from '#output/Output/Stage.ts';
import { getOutputInputs } from '#output/Output/Valued.ts';
import type { PhotosensitivityRisk } from '#output/PhotosensitivityAnalysis.ts';
import { clampSetting, Effect } from '#output/Effect/Effect.ts';

/** Above this much grain the whole stage is a field of high-contrast speckle, a pattern risk. */
export const HeavyGrain = 0.5;

export function createGrainType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Grain, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Grain.amount)}•%: 30%
        ${getBind(locales, (locale) => locale.output.Grain.size)}•#: 1
        ${getBind(locales, (locale) => locale.output.Grain.color)}•?: ⊥
    )
`);
}

/** Speckles the stage with flickering noise, from fine film grain to a TV with no signal. */
export class Grain extends Effect {
    readonly amount: number;
    /** How big each speck is, in stage pixels. */
    readonly size: number;
    /** Whether the noise is colored rather than gray. */
    readonly color: boolean;

    constructor(value: Value, amount: number, size: number, color: boolean) {
        super(value);
        this.amount = amount;
        this.size = size;
        this.color = color;
    }

    getLayer() {
        const alpha = Math.round(this.amount * 255);
        const color = this.color;
        return {
            kind: 'paint' as const,
            resolution: 1 / this.size,
            blend: undefined,
            smooth: false,
            moving: true,
            painter: (
                context: CanvasRenderingContext2D,
                _: number,
                width: number,
                height: number,
            ) => {
                const image = context.createImageData(width, height);
                const data = image.data;
                for (let i = 0; i < data.length; i += 4) {
                    const gray = Math.random() * 255;
                    data[i] = color ? Math.random() * 255 : gray;
                    data[i + 1] = color ? Math.random() * 255 : gray;
                    data[i + 2] = color ? Math.random() * 255 : gray;
                    data[i + 3] = alpha;
                }
                context.putImageData(image, 0, 0);
            },
        };
    }

    getRisks(): PhotosensitivityRisk[] {
        return this.amount >= HeavyGrain ? ['pattern'] : [];
    }

    getNames(texts: OutputTexts) {
        return texts.Grain.names;
    }
}

export function toGrain(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [amount, size, color] = getOutputInputs(value);
    return new Grain(
        value,
        clampSetting(toNumber(amount), 0.3, 0, 1),
        clampSetting(toNumber(size), 1, 1, 32),
        toBoolean(color) ?? false,
    );
}

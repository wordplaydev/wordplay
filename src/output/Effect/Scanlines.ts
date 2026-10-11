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
import type { PhotosensitivityRisk } from '#output/PhotosensitivityAnalysis.ts';
import { clampSetting, Effect, effectColor } from '#output/Effect/Effect.ts';

/** Dark, closely spaced lines over the whole stage are a pattern risk. */
const HeavyScanlines = 0.5;

export function createScanlinesType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Scanlines, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Scanlines.amount)}•%: 30%
        ${getBind(locales, (locale) => locale.output.Scanlines.spacing)}•#m: 0.1m
        ${getBind(locales, (locale) => locale.output.Scanlines.speed)}•#: 0
    )
`);
}

/** Draws the horizontal lines of an old television screen across the stage. */
export class Scanlines extends Effect {
    readonly amount: number;
    /** The distance from one line to the next, in meters. */
    readonly spacing: number;
    /** How many line spacings the lines roll down per second. */
    readonly speed: number;

    constructor(value: Value, amount: number, spacing: number, speed: number) {
        super(value);
        this.amount = amount;
        this.spacing = spacing;
        this.speed = speed;
    }

    getLayer(adapting: boolean) {
        const spacing = Math.max(2, this.spacing * PX_PER_METER);
        const amount = this.amount;
        const speed = this.speed;
        return {
            kind: 'paint' as const,
            resolution: 1,
            blend: undefined,
            smooth: false,
            moving: speed !== 0,
            painter: (
                context: CanvasRenderingContext2D,
                seconds: number,
                width: number,
                height: number,
            ) => {
                context.clearRect(0, 0, width, height);
                context.fillStyle = effectColor(0, 0, 0, amount, adapting);
                const start = (((seconds * speed) % 1) + 1) % 1;
                for (let y = (start - 1) * spacing; y < height; y += spacing)
                    context.fillRect(0, y, width, spacing / 2);
            },
        };
    }

    getRisks(): PhotosensitivityRisk[] {
        return this.amount >= HeavyScanlines ? ['pattern'] : [];
    }

    getNames(texts: OutputTexts) {
        return texts.Scanlines.names;
    }
}

export function toScanlines(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [amount, spacing, speed] = getOutputInputs(value);
    return new Scanlines(
        value,
        clampSetting(toNumber(amount), 0.3, 0, 1),
        clampSetting(toNumber(spacing), 0.1, 0, 2),
        clampSetting(toNumber(speed), 0, -10, 10),
    );
}

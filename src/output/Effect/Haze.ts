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

/** How many soft clouds drift through the haze. */
const Clouds = 7;

export function createHazeType(locales: Locales) {
    const colorName = getTypeName(locales, (l) => l.output.Color.names);
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Haze, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Haze.amount)}•%: 50%
        ${getBind(locales, (locale) => locale.output.Haze.color)}•${colorName}|ø: ø
        ${getBind(locales, (locale) => locale.output.Haze.speed)}•#: 1
    )
`);
}

/** Veils the stage in drifting fog or smoke. */
export class Haze extends Effect {
    readonly amount: number;
    /** The color of the haze; undefined is white. */
    readonly color: Color | undefined;
    /** How fast the clouds drift; 0 holds them still. */
    readonly speed: number;

    constructor(
        value: Value,
        amount: number,
        color: Color | undefined,
        speed: number,
    ) {
        super(value);
        this.amount = amount;
        this.color = color;
        this.speed = speed;
    }

    getLayer(adapting: boolean) {
        const amount = this.amount;
        const speed = this.speed;
        const color =
            this.color?.toCSS(adapting) ?? effectColor(1, 0, 0, 1, adapting);
        return {
            kind: 'paint' as const,
            // Fog has no edges, so a coarse canvas stretched over the stage is softer and cheaper.
            resolution: 1 / 8,
            blend: undefined,
            smooth: true,
            moving: speed !== 0,
            painter: (
                context: CanvasRenderingContext2D,
                seconds: number,
                width: number,
                height: number,
            ) => {
                context.clearRect(0, 0, width, height);
                // An even veil, then clouds thickening it in places.
                context.globalAlpha = amount * 0.5;
                context.fillStyle = color;
                context.fillRect(0, 0, width, height);
                const radius = Math.max(width, height) * 0.45;
                for (let i = 0; i < Clouds; i++) {
                    const drift = seconds * speed * (0.02 + i * 0.006);
                    const x = (((i * 0.37 + drift) % 1.4) - 0.2) * width;
                    const y =
                        (0.5 + 0.4 * Math.sin(i * 1.9 + drift * 3)) * height;
                    const cloud = context.createRadialGradient(
                        x,
                        y,
                        0,
                        x,
                        y,
                        radius,
                    );
                    cloud.addColorStop(0, color);
                    cloud.addColorStop(1, 'transparent');
                    context.globalAlpha = amount * 0.35;
                    context.fillStyle = cloud;
                    context.fillRect(0, 0, width, height);
                }
                context.globalAlpha = 1;
            },
        };
    }

    getNames(texts: OutputTexts) {
        return texts.Haze.names;
    }
}

export function toHaze(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [amount, color, speed] = getOutputInputs(value);
    return new Haze(
        value,
        clampSetting(toNumber(amount), 0.5, 0, 1),
        toColor(color),
        clampSetting(toNumber(speed), 1, -10, 10),
    );
}

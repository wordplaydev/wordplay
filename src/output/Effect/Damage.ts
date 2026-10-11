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
import { clampSetting, Effect, effectColor } from '#output/Effect/Effect.ts';

/** The most scratches and specks of dust on screen at once, at full amount. */
const MostScratches = 6;
const MostDust = 40;

export function createDamageType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Damage, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Damage.scratches)}•%: 50%
        ${getBind(locales, (locale) => locale.output.Damage.dust)}•%: 50%
    )
`);
}

/** Scatters the scratches and dust of old, worn film over the stage, different on every frame. */
export class Damage extends Effect {
    readonly scratches: number;
    readonly dust: number;

    constructor(value: Value, scratches: number, dust: number) {
        super(value);
        this.scratches = scratches;
        this.dust = dust;
    }

    getLayer(adapting: boolean) {
        const scratches = Math.round(this.scratches * MostScratches);
        const dust = Math.round(this.dust * MostDust);
        return {
            kind: 'paint' as const,
            resolution: 0.5,
            blend: undefined,
            smooth: true,
            moving: true,
            painter: (
                context: CanvasRenderingContext2D,
                _: number,
                width: number,
                height: number,
            ) => {
                context.clearRect(0, 0, width, height);
                // Scratches are thin, pale, and run the height of the frame, wandering a little.
                context.lineWidth = 1;
                for (let i = 0; i < scratches; i++) {
                    if (Math.random() < 0.4) continue;
                    const x = Math.random() * width;
                    context.strokeStyle = effectColor(
                        0.98,
                        5,
                        90,
                        0.3 + Math.random() * 0.4,
                        adapting,
                    );
                    context.beginPath();
                    context.moveTo(x, 0);
                    context.quadraticCurveTo(
                        x + (Math.random() - 0.5) * 6,
                        height / 2,
                        x + (Math.random() - 0.5) * 4,
                        height,
                    );
                    context.stroke();
                }
                // Dust is dark, small, and irregular.
                for (let i = 0; i < dust; i++) {
                    if (Math.random() < 0.5) continue;
                    context.fillStyle = effectColor(
                        0.06,
                        5,
                        60,
                        0.4 + Math.random() * 0.4,
                        adapting,
                    );
                    context.beginPath();
                    context.ellipse(
                        Math.random() * width,
                        Math.random() * height,
                        0.5 + Math.random() * 2,
                        0.5 + Math.random() * 1.5,
                        Math.random() * Math.PI,
                        0,
                        Math.PI * 2,
                    );
                    context.fill();
                }
            },
        };
    }

    getNames(texts: OutputTexts) {
        return texts.Damage.names;
    }
}

export function toDamage(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [scratches, dust] = getOutputInputs(value);
    return new Damage(
        value,
        clampSetting(toNumber(scratches), 0.5, 0, 1),
        clampSetting(toNumber(dust), 0.5, 0, 1),
    );
}

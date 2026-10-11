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

/** The fastest a flicker may dim and brighten, safely under the photosensitive band
 *  (MinFlashHz) however a creator sets it, since a whole-stage flicker is a strobe. A literal
 *  rather than derived because the analysis imports Stage, which imports this. */
export const MaxFlickerRate = 2.5;

export function createFlickerType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Flicker, TYPE_SYMBOL)} ${getTypeName(locales, (l) => l.output.Effect.names)}(
        ${getBind(locales, (locale) => locale.output.Flicker.amount)}•%: 20%
        ${getBind(locales, (locale) => locale.output.Flicker.rate)}•#: 2
    )
`);
}

/** The longest a dip lasts, in seconds. */
const LongestDip = 0.15;
/** How far into its time slot a dip may start, as a fraction of the slot. A dip is
 *  then at least 1 − this of a slot from the next, which at MaxFlickerRate keeps
 *  dips to three in any second. */
const LatestDipStart = 0.2;

/** A repeatable random number in [0, 1) for a slot of time and a purpose, so a moment's
 *  flicker is the same every time it is painted. */
function hash(slot: number, salt: number): number {
    const x = Math.sin(slot * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
}

/**
 * How dim a flicker is at a moment, from 0 (full brightness) to 1 (its deepest dip).
 * A bulb holds steady and then stutters, so most of the time this is 0, broken by brief
 * dips at uneven times, at most one in each 1/rate seconds. The first slot never dips,
 * so the still frame reduced motion paints at 0 seconds is undimmed.
 */
export function flickerDip(seconds: number, rate: number): number {
    if (rate <= 0) return 0;
    const slot = Math.floor(seconds * rate);
    if (slot <= 0 || hash(slot, 1) > 0.6) return 0;
    const within = seconds - slot / rate;
    const start = (hash(slot, 2) * LatestDipStart) / rate;
    const length = 0.05 + hash(slot, 3) * (LongestDip - 0.05);
    return within >= start && within < start + length
        ? 0.5 + 0.5 * hash(slot, 4)
        : 0;
}

/** Dims the whole stage in brief, uneven stutters, like a projector bulb or a failing screen. */
export class Flicker extends Effect {
    readonly amount: number;
    /** Dimmings per second, never faster than {@link MaxFlickerRate}. */
    readonly rate: number;

    constructor(value: Value, amount: number, rate: number) {
        super(value);
        this.amount = amount;
        this.rate = rate;
    }

    getLayer(adapting: boolean) {
        const amount = this.amount;
        const rate = this.rate;
        return {
            kind: 'paint' as const,
            // One pixel is enough: the whole layer is one shade.
            resolution: 0,
            blend: undefined,
            smooth: true,
            moving: rate > 0,
            painter: (
                context: CanvasRenderingContext2D,
                seconds: number,
                width: number,
                height: number,
            ) => {
                context.clearRect(0, 0, width, height);
                context.fillStyle = effectColor(
                    0,
                    0,
                    0,
                    amount * flickerDip(seconds, rate),
                    adapting,
                );
                context.fillRect(0, 0, width, height);
            },
        };
    }

    getNames(texts: OutputTexts) {
        return texts.Flicker.names;
    }
}

export function toFlicker(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;
    const [amount, rate] = getOutputInputs(value);
    return new Flicker(
        value,
        clampSetting(toNumber(amount), 0.2, 0, 1),
        clampSetting(toNumber(rate), 2, 0, MaxFlickerRate),
    );
}

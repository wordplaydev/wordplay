import type Project from '#db/projects/Project.ts';
import ListValue from '#values/ListValue.ts';
import StructureValue from '#values/StructureValue.ts';
import type Value from '#values/Value.ts';
import type { Effect } from '#output/Effect/Effect.ts';
import { toBlur } from '#output/Effect/Blur.ts';
import { toDamage } from '#output/Effect/Damage.ts';
import { toFlicker } from '#output/Effect/Flicker.ts';
import { toGrade } from '#output/Effect/Grade.ts';
import { toGrain } from '#output/Effect/Grain.ts';
import { toHaze } from '#output/Effect/Haze.ts';
import { toScanlines } from '#output/Effect/Scanlines.ts';
import { toTint } from '#output/Effect/Tint.ts';
import { toVignette } from '#output/Effect/Vignette.ts';
import { toWave } from '#output/Effect/Wave.ts';

/** Turn an effect structure value into its matching {@link Effect} wrapper, dispatching by type. */
export function toEffect(
    project: Project,
    value: Value | undefined,
): Effect | undefined {
    if (!(value instanceof StructureValue)) return undefined;
    const types = project.shares.output;
    if (value.is(types.Blur)) return toBlur(value);
    else if (value.is(types.Grade)) return toGrade(value);
    else if (value.is(types.Tint)) return toTint(value);
    else if (value.is(types.Haze)) return toHaze(value);
    else if (value.is(types.Grain)) return toGrain(value);
    else if (value.is(types.Scanlines)) return toScanlines(value);
    else if (value.is(types.Wave)) return toWave(value);
    else if (value.is(types.Damage)) return toDamage(value);
    else if (value.is(types.Flicker)) return toFlicker(value);
    else if (value.is(types.Vignette)) return toVignette(value);
    else return undefined;
}

/** The effects in a list of effect values, in order, skipping anything that isn't one. */
export function toEffects(
    project: Project,
    value: Value | undefined,
): Effect[] {
    if (!(value instanceof ListValue)) return [];
    const effects: Effect[] = [];
    for (const item of value.values) {
        const effect = toEffect(project, item);
        if (effect) effects.push(effect);
    }
    return effects;
}

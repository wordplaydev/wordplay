import toStructure from '../native/toStructure';
import Place from '../output/Place';
import { toDecimal } from '../output/Verse';
import type Value from '../runtime/Value';
import { getBind } from '../translation/getBind';

export const SpeedType = toStructure(`
    ${getBind((t) => t.input.speed, '•')}(
        ${getBind((t) => t.input.speed.vx)}•#m/s: 0m/s
        ${getBind((t) => t.input.speed.vy)}•#m/s: 0m/s
        ${getBind((t) => t.input.speed.vz)}•#m/s: 0m/s
        ${getBind((t) => t.input.speed.va)}•#°/s: 0°/s
    )
`);

export function toSpeed(value: Value | undefined): Place | undefined {
    if (value === undefined) return undefined;

    const x = toDecimal(value.resolve('vx'));
    const y = toDecimal(value.resolve('vy'));
    const z = toDecimal(value.resolve('vz'));
    const rotation = toDecimal(value.resolve('va'));
    return x && y && z && rotation
        ? new Place(value, x, y, z, rotation)
        : undefined;
}

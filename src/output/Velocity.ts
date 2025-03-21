import { getBind } from '@locale/getBind';
import type Value from '@values/Value';
import toStructure from '../basis/toStructure';
import type Locales from '../locale/Locales';
import StructureValue from '../values/StructureValue';
import { toNumber } from './Stage';
import Valued, { getOutputInputs } from './Valued';

export function createVelocityType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Velocity, '•')}(
        ${getBind(locales, (locale) => locale.output.Velocity.x)}•#m/s|ø: ø
        ${getBind(locales, (locale) => locale.output.Velocity.y)}•#m/s|ø: ø
        ${getBind(locales, (locale) => locale.output.Velocity.angle)}•#°/s|ø: ø
    )
`);
}

export default class Velocity extends Valued {
    readonly x: number | undefined;
    readonly y: number | undefined;
    readonly angle: number | undefined;

    constructor(
        value: Value,
        x: number | undefined,
        y: number | undefined,
        rotation: number | undefined,
    ) {
        super(value);

        this.x = x;
        this.y = y;
        this.angle = rotation;
    }
}

export function toVelocity(value: Value | undefined): Velocity | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const [xVal, yVal, rotationVal] = getOutputInputs(value);
    const x = toNumber(xVal);
    const y = toNumber(yVal);
    const rotation = toNumber(rotationVal);
    return new Velocity(value, x, y, rotation);
}

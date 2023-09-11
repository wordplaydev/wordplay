import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import { getBind } from '@locale/getBind';
import Output, { getOutputInputs } from './Output';
import { toNumber } from './Stage';
import StructureValue from '../values/StructureValue';
import type Locale from '../locale/Locale';

export const DefaultBounciness = 0.5;

export function createMatterType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Matter, '•')}(
        ${getBind(locales, (locale) => locale.output.Matter.mass)}•#kg: 1kg
        ${getBind(locales, (locale) => locale.output.Matter.bounciness)}•#: 0
        ${getBind(locales, (locale) => locale.output.Matter.friction)}•#: 0.8
    )
`);
}

export default class Matter extends Output {
    readonly mass: number;
    readonly bounciness: number;
    readonly friction: number;

    constructor(
        value: Value,
        mass: number,
        bounciness: number,
        friction: number
    ) {
        super(value);

        this.mass = mass;
        this.bounciness = bounciness;
        this.friction = friction;
    }
}

export function toMatter(value: Value | undefined): Matter | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const [massVal, bounceVal, frictionVal] = getOutputInputs(value);
    const mass = toNumber(massVal);
    const bounce = toNumber(bounceVal);
    const friction = toNumber(frictionVal);
    return mass !== undefined && bounce !== undefined && friction !== undefined
        ? new Matter(value, mass, bounce, friction)
        : undefined;
}

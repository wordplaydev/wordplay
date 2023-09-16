import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import { getBind } from '@locale/getBind';
import Valued, { getOutputInputs } from './Valued';
import { toBoolean, toNumber } from './Stage';
import StructureValue from '../values/StructureValue';
import type Locale from '../locale/Locale';
import { TRUE_SYMBOL } from '../parser/Symbols';

export const DefaultBounciness = 0.5;

export function createMatterType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Matter, '•')}(
        ${getBind(locales, (locale) => locale.output.Matter.mass)}•#kg: 1kg
        ${getBind(locales, (locale) => locale.output.Matter.bounciness)}•#: 0
        ${getBind(locales, (locale) => locale.output.Matter.friction)}•#: 0.8
        ${getBind(
            locales,
            (locale) => locale.output.Matter.text
        )}•?: ${TRUE_SYMBOL}
        ${getBind(
            locales,
            (locale) => locale.output.Matter.ground
        )}•?: ${TRUE_SYMBOL}
        ${getBind(
            locales,
            (locale) => locale.output.Matter.barriers
        )}•?: ${TRUE_SYMBOL}
    )
`);
}

export default class Matter extends Valued {
    readonly mass: number;
    readonly bounciness: number;
    readonly friction: number;
    readonly text: boolean;
    readonly ground: boolean;
    readonly barriers: boolean;

    constructor(
        value: Value,
        mass: number,
        bounciness: number,
        friction: number,
        text: boolean,
        ground: boolean,
        barriers: boolean
    ) {
        super(value);

        this.mass = mass;
        this.bounciness = bounciness;
        this.friction = friction;
        this.text = text;
        this.ground = ground;
        this.barriers = barriers;
    }
}

export function toMatter(value: Value | undefined): Matter | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const [massVal, bounceVal, frictionVal, textVal, groundVal, barriersVal] =
        getOutputInputs(value);
    const mass = toNumber(massVal);
    const bounce = toNumber(bounceVal);
    const friction = toNumber(frictionVal);
    const text = toBoolean(textVal);
    const ground = toBoolean(groundVal);
    const barriers = toBoolean(barriersVal);
    return mass !== undefined && bounce !== undefined && friction !== undefined
        ? new Matter(
              value,
              mass,
              bounce,
              friction,
              text ?? true,
              ground ?? true,
              barriers ?? true
          )
        : undefined;
}

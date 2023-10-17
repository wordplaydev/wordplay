import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import { getBind } from '@locale/getBind';
import Valued, { getOutputInputs } from './Valued';
import { toBoolean, toNumber } from './Stage';
import StructureValue from '../values/StructureValue';
import { TRUE_SYMBOL } from '../parser/Symbols';
import type Locales from '../locale/Locales';

export const DefaultBounciness = 0.5;

export function createMatterType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Matter, '•')}(
        ${getBind(locales, (locale) => locale.output.Matter.mass)}•#kg: 1kg
        ${getBind(locales, (locale) => locale.output.Matter.bounciness)}•#: 0
        ${getBind(locales, (locale) => locale.output.Matter.friction)}•#: 0.8
        ${getBind(locales, (locale) => locale.output.Matter.roundedness)}•#: 0.1
        ${getBind(
            locales,
            (locale) => locale.output.Matter.text
        )}•?: ${TRUE_SYMBOL}
        ${getBind(
            locales,
            (locale) => locale.output.Matter.shapes
        )}•?: ${TRUE_SYMBOL}
    )
`);
}

export default class Matter extends Valued {
    readonly mass: number;
    readonly bounciness: number;
    readonly friction: number;
    readonly roundedness: number;
    readonly text: boolean;
    readonly shapes: boolean;

    constructor(
        value: Value,
        mass: number,
        bounciness: number,
        friction: number,
        roundedness: number,
        text: boolean,
        shapes: boolean
    ) {
        super(value);

        this.mass = mass;
        this.bounciness = bounciness;
        this.friction = friction;
        this.roundedness = roundedness;
        this.text = text;
        this.shapes = shapes;
    }
}

export function toMatter(value: Value | undefined): Matter | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const [
        massVal,
        bounceVal,
        frictionVal,
        roundednessVal,
        textVal,
        shapesVal,
    ] = getOutputInputs(value);
    const mass = toNumber(massVal);
    const bounce = toNumber(bounceVal);
    const friction = toNumber(frictionVal);
    const roundedness = toNumber(roundednessVal);
    const text = toBoolean(textVal);
    const shapes = toBoolean(shapesVal);
    return mass !== undefined &&
        bounce !== undefined &&
        friction !== undefined &&
        roundedness !== undefined
        ? new Matter(
              value,
              mass,
              bounce,
              friction,
              roundedness,
              text ?? true,
              shapes ?? true
          )
        : undefined;
}

import type Decimal from 'decimal.js';
import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import { getBind } from '@translation/getBind';
import Output from './Output';
import { toDecimal } from './Verse';

export const PlaceType = toStructure(`
    ${getBind((t) => t.output.place.definition, '•')}(
        ${getBind((t) => t.output.place.x)}•#m: 0m
        ${getBind((t) => t.output.place.y)}•#m: 0m
        ${getBind((t) => t.output.place.z)}•#m: 0m
    )
`);

export default class Place extends Output {
    readonly x: Decimal;
    readonly y: Decimal;
    readonly z: Decimal;

    constructor(value: Value, x: Decimal, y: Decimal, z: Decimal) {
        super(value);

        this.x = x;
        this.y = y;
        this.z = z;
    }

    offset(place: Place) {
        return new Place(
            this.value,
            this.x.add(place.x),
            this.y.add(place.y),
            this.z.add(place.z)
        );
    }

    toString() {
        return `Place(${this.x.toString()}m ${this.y.toString()}m ${this.z.toString()}m)`;
    }
}

export function toPlace(value: Value | undefined): Place | undefined {
    if (value === undefined) return undefined;

    const x = toDecimal(value.resolve('x'));
    const y = toDecimal(value.resolve('y'));
    const z = toDecimal(value.resolve('z'));

    return x && y && z ? new Place(value, x, y, z) : undefined;
}

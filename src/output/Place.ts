import Decimal from 'decimal.js';
import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import { getBind } from '@translation/getBind';
import Output from './Output';
import { toDecimal } from './Verse';
import type Evaluator from '../runtime/Evaluator';
import type Names from '../nodes/Names';
import Measurement from '../runtime/Measurement';
import Evaluation from '../runtime/Evaluation';
import Structure from '../runtime/Structure';

export const PlaceType = toStructure(`
    ${getBind((t) => t.output.place.definition, '•')}(
        ${getBind((t) => t.output.place.x)}•#m: 0m
        ${getBind((t) => t.output.place.y)}•#m: 0m
        ${getBind((t) => t.output.place.z)}•#m: 0m
        ${getBind((t) => t.output.place.rotation)}•#°: 0°
    )
`);

export default class Place extends Output {
    readonly x: Decimal;
    readonly y: Decimal;
    readonly z: Decimal;
    readonly rotation: Decimal;

    constructor(
        value: Value,
        x: Decimal,
        y: Decimal,
        z: Decimal,
        rotation: Decimal
    ) {
        super(value);

        this.x = x;
        this.y = y;
        this.z = z;
        this.rotation = rotation;
    }

    /** Adds the given place's x and y to this Place's x and y (but leaves z and rotation alone) */
    offset(place: Place) {
        return new Place(
            this.value,
            this.x.add(place.x),
            this.y.add(place.y),
            this.z,
            this.rotation
        );
    }

    subtract(place: Place) {
        return new Place(
            this.value,
            this.x.sub(place.x),
            this.y.sub(place.y),
            this.z,
            this.rotation
        );
    }

    equals(place: Place) {
        return (
            this.x.equals(place.x) &&
            this.y.equals(place.y) &&
            this.z.equals(place.z) &&
            this.rotation.equals(place.rotation)
        );
    }

    toString() {
        return `Place(${this.x.toString()}m ${this.y.toString()}m ${this.z.toString()}m ${this.rotation.toString()}°)`;
    }
}

export function toPlace(value: Value | undefined): Place | undefined {
    if (value === undefined) return undefined;

    const x = toDecimal(value.resolve('x'));
    const y = toDecimal(value.resolve('y'));
    const z = toDecimal(value.resolve('z'));
    const rotation = toDecimal(value.resolve('rotation'));
    return x && y && z && rotation
        ? new Place(value, x, y, z, rotation)
        : undefined;
}

export function createPlace(
    evaluator: Evaluator,
    x: number,
    y: number,
    z: number
): Place {
    const creator = evaluator.getMain();

    const place = new Map<Names, Value>();
    place.set(PlaceType.inputs[0].names, new Measurement(creator, x));
    place.set(PlaceType.inputs[1].names, new Measurement(creator, y));
    place.set(PlaceType.inputs[2].names, new Measurement(creator, z));

    const evaluation = new Evaluation(
        evaluator,
        creator,
        PlaceType,
        undefined,
        place
    );

    const structure = new Structure(creator, evaluation);
    return new Place(
        structure,
        new Decimal(x),
        new Decimal(y),
        new Decimal(z),
        new Decimal(0)
    );
}

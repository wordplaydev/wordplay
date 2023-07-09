import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import { getBind } from '@locale/getBind';
import Output from './Output';
import { toDecimal } from './Stage';
import type Evaluator from '../runtime/Evaluator';
import type Names from '../nodes/Names';
import Measurement from '../runtime/Measurement';
import Evaluation from '../runtime/Evaluation';
import Structure from '../runtime/Structure';
import Unit from '../nodes/Unit';
import type Locale from '../locale/Locale';

export function createPlaceType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (t) => t.output.Place, '•')}(
        ${getBind(locales, (t) => t.output.Place.x)}•#m: 0m
        ${getBind(locales, (t) => t.output.Place.y)}•#m: 0m
        ${getBind(locales, (t) => t.output.Place.z)}•#m: 0m
    )
`);
}

export default class Place extends Output {
    readonly x: number;
    readonly y: number;
    readonly z: number;

    constructor(value: Value, x: number, y: number, z: number) {
        super(value);

        this.x = x;
        this.y = y;
        this.z = z;
    }

    /** Adds the given place's x and y to this Place's x and y (but leaves z and rotation alone) */
    offset(place: Place) {
        return new Place(
            this.value,
            this.x + place.x,
            this.y - place.y,
            this.z
        );
    }

    subtract(place: Place) {
        return new Place(
            this.value,
            this.x - place.x,
            this.y + place.y,
            this.z
        );
    }

    equals(place: Place) {
        return this.x === place.x && this.y === place.y && this.z === place.z;
    }

    toString() {
        return `Place(${this.x.toString()}m ${this.y.toString()}m ${this.z.toString()}m)`;
    }
}

export function toPlace(value: Value | undefined): Place | undefined {
    if (value === undefined) return undefined;

    const x = toDecimal(value.resolve('x'))?.toNumber();
    const y = toDecimal(value.resolve('y'))?.toNumber();
    const z = toDecimal(value.resolve('z'))?.toNumber();
    return x !== undefined && y !== undefined && z !== undefined
        ? new Place(value, x, y, z)
        : undefined;
}

export function createPlace(
    evaluator: Evaluator,
    x: number,
    y: number,
    z: number
): Place {
    return new Place(createPlaceStructure(evaluator, x, y, z), x, y, z);
}

export function createPlaceStructure(
    evaluator: Evaluator,
    x: number,
    y: number,
    z: number
): Structure {
    const creator = evaluator.getMain();

    const place = new Map<Names, Value>();
    const PlaceType = evaluator.project.shares.output.place;
    place.set(
        PlaceType.inputs[0].names,
        new Measurement(creator, x, Unit.make(['m']))
    );
    place.set(
        PlaceType.inputs[1].names,
        new Measurement(creator, y, Unit.make(['m']))
    );
    place.set(
        PlaceType.inputs[2].names,
        new Measurement(creator, z, Unit.make(['m']))
    );

    const evaluation = new Evaluation(
        evaluator,
        creator,
        PlaceType,
        undefined,
        place
    );

    const structure = new Structure(creator, evaluation);

    return structure;
}

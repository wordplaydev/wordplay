import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import { getBind } from '@locale/getBind';
import Valued, { getOutputInputs } from './Valued';
import { toNumber } from './Stage';
import type Evaluator from '@runtime/Evaluator';
import type Names from '../nodes/Names';
import NumberValue from '@values/NumberValue';
import Evaluation from '@runtime/Evaluation';
import StructureValue from '../values/StructureValue';
import Unit from '../nodes/Unit';
import NoneValue from '../values/NoneValue';
import type Locales from '../locale/Locales';

export function createPlaceType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Place, '•')}(
        ${getBind(locales, (locale) => locale.output.Place.x)}•#m: 0m
        ${getBind(locales, (locale) => locale.output.Place.y)}•#m: 0m
        ${getBind(locales, (locale) => locale.output.Place.z)}•#m: 0m
        ${getBind(locales, (locale) => locale.output.Place.rotation)}•#°|ø: ø
    )
`);
}

export default class Place extends Valued {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly rotation: number | undefined;

    constructor(
        value: Value,
        x: number,
        y: number,
        z: number,
        rotation?: number | undefined
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
            this.x + place.x,
            this.y - place.y,
            this.z,
            this.rotation
        );
    }

    subtract(place: Place) {
        return new Place(
            this.value,
            this.x - place.x,
            this.y + place.y,
            this.z,
            this.rotation
        );
    }

    distanceFrom(place: Place) {
        return Math.sqrt(
            Math.pow(place.x - this.x, 2) +
                Math.pow(place.y - this.y, 2) +
                Math.pow(place.z - this.z, 2)
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
    if (!(value instanceof StructureValue)) return undefined;

    const [xVal, yVal, zVal, rotationVal] = getOutputInputs(value);
    const x = toNumber(xVal);
    const y = toNumber(yVal);
    const z = toNumber(zVal);
    const rotation = toNumber(rotationVal);
    return x !== undefined && y !== undefined && z !== undefined
        ? new Place(value, x, y, z, rotation)
        : undefined;
}

export function createPlace(
    evaluator: Evaluator,
    x: number,
    y: number,
    z: number
): Place {
    return new Place(createPlaceStructure(evaluator, x, y, z), x, y, z, 0);
}

export function createPlaceStructure(
    evaluator: Evaluator,
    x: number,
    y: number,
    z: number,
    rotation?: number | undefined
): StructureValue {
    const creator = evaluator.getMain();

    const place = new Map<Names, Value>();
    const PlaceType = evaluator.project.shares.output.Place;
    place.set(
        PlaceType.inputs[0].names,
        new NumberValue(creator, x, Unit.reuse(['m']))
    );
    place.set(
        PlaceType.inputs[1].names,
        new NumberValue(creator, y, Unit.reuse(['m']))
    );
    place.set(
        PlaceType.inputs[2].names,
        new NumberValue(creator, z, Unit.reuse(['m']))
    );
    place.set(
        PlaceType.inputs[3].names,
        rotation !== undefined
            ? new NumberValue(creator, rotation, Unit.reuse(['°']))
            : new NoneValue(creator)
    );

    const evaluation = new Evaluation(
        evaluator,
        creator,
        PlaceType,
        undefined,
        place
    );

    const structure = new StructureValue(creator, evaluation);

    return structure;
}

import type Evaluator from '@runtime/Evaluator';
import { createPlaceStructure } from '@output/Place';
import TemporalStream from '@runtime/TemporalStream';
import Bind from '@nodes/Bind';
import Evaluate from '@nodes/Evaluate';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import MeasurementType from '@nodes/MeasurementType';
import Reference from '@nodes/Reference';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import Unit from '@nodes/Unit';
import { createPlace, PlaceType, toPlace } from '@output/Place';
import Measurement from '@runtime/Measurement';
import Structure from '@runtime/Structure';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import toStructure from '../native/toStructure';
import Place from '@output/Place';
import { toDecimal } from '@output/Verse';
import type Value from '@runtime/Value';
import { getBind } from '@translation/getBind';
import createStreamEvaluator from './createStreamEvaluator';

const DEFAULT_MASS = 1;

// Global gravity
const GRAVITY = 15;

export default class Motion extends TemporalStream<Structure> {
    /** The initial values, so we can decide whether to reset them when the program changes them. */
    ix: number;
    iy: number;
    iz: number;
    iangle: number;
    ivx: number;
    ivy: number;
    ivz: number;
    iva: number;
    imass: number;

    /** The current location and angle of the object. */
    x: number;
    y: number;
    z: number;
    angle: number;

    /** The current velocity the object.  */
    vx: number;
    vy: number;
    vz: number;
    va: number;

    /* The current mass of the object. */
    mass: number;

    constructor(
        evaluator: Evaluator,
        place: Place,
        speed: Place,
        mass: number = DEFAULT_MASS
    ) {
        super(evaluator, MotionDefinition, place.value as Structure);

        this.x = place.x.toNumber();
        this.y = place.y.toNumber();
        this.z = place.z.toNumber();
        this.angle = place.rotation.toNumber();

        this.vx = speed.x.toNumber();
        this.vy = speed.y.toNumber();
        this.vz = speed.z.toNumber();
        this.va = speed.rotation.toNumber();

        this.mass = mass;

        this.ix = this.x;
        this.iy = this.y;
        this.iz = this.z;
        this.iangle = this.angle;
        this.ivx = this.vx;
        this.ivy = this.vy;
        this.ivz = this.vz;
        this.iva = this.va;
        this.imass = this.mass;
    }

    // No setup or teardown, the Evaluator handles the requestAnimationFrame loop.
    start() {}
    stop() {}

    setPlace(place: Place) {
        const newX = place.x.toNumber();
        if (newX !== this.ix) this.x = newX;
        const newY = place.y.toNumber();
        if (newY !== this.iy) this.y = newY;
        const newZ = place.z.toNumber();
        if (newZ !== this.iz) this.z = newY;
        const newAngle = place.rotation.toNumber();
        if (newAngle !== this.iangle) this.angle = newAngle;
    }

    setSpeed(speed: Place) {
        const newX = speed.x.toNumber();
        if (newX !== this.ivx) this.vx = newX;
        const newY = speed.y.toNumber();
        if (newY !== this.ivy) this.vy = newY;
        const newZ = speed.z.toNumber();
        if (newZ !== this.ivz) this.vz = newY;
        const newAngle = speed.rotation.toNumber();
        if (newAngle !== this.iva) this.va = newAngle;
    }

    setMass(mass: number | undefined) {
        if (mass !== undefined && mass !== this.imass)
            this.mass = mass ?? DEFAULT_MASS;
    }

    /** Given some change in time in milliseconds, move the object. */
    tick(_: DOMHighResTimeStamp, delta: number) {
        // Compute how many seconds have elapsed.
        const seconds = delta / 1000;

        // First, apply gravity to the y velocity proporitional to elapsed time.
        this.vy -= GRAVITY * seconds;

        // Then, apply velocity to place.
        this.x += this.vx * seconds;
        this.y += this.vy * seconds;
        this.z += this.vz * seconds;
        this.angle += this.va * seconds;

        // If we collide with 0, negate y velocity.
        if (this.y < 0) {
            this.y = 0;
            this.vy = -this.vy * 0.5;
            this.vx = this.vx * 0.5;
            this.va = this.va * 0.5;
        }

        // Finally, add the new place to the stream.
        this.add(
            createPlaceStructure(
                this.evaluator,
                this.x,
                this.y,
                this.z,
                this.angle
            )
        );
    }

    getType() {
        return StreamType.make(MeasurementType.make(Unit.unit(['ms'])));
    }
}

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

const PlaceBind = Bind.make(
    getDocTranslations((t) => t.input.motion.place.doc),
    getNameTranslations((t) => t.input.motion.place.name),
    new StructureDefinitionType(PlaceType),
    Evaluate.make(Reference.make(PlaceType.names.getNames()[0], PlaceType), [])
);

const SpeedBind = Bind.make(
    getDocTranslations((t) => t.input.motion.speed.doc),
    getNameTranslations((t) => t.input.motion.speed.name),
    new StructureDefinitionType(SpeedType),
    Evaluate.make(Reference.make(SpeedType.names.getNames()[0], SpeedType), [])
);

const MassBind = Bind.make(
    getDocTranslations((t) => t.input.motion.mass.doc),
    getNameTranslations((t) => t.input.motion.mass.name),
    MeasurementType.make(Unit.unit(['kg'])),
    // Default to 1kg.
    MeasurementLiteral.make(1, Unit.unit(['kg']))
);

const type = new StructureDefinitionType(PlaceType);

export const MotionDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.motion.doc),
    getNameTranslations((t) => t.input.motion.name),
    [PlaceBind, SpeedBind, MassBind],
    createStreamEvaluator(
        type.clone(),
        Motion,
        (evaluation) =>
            new Motion(
                evaluation.getEvaluator(),
                toPlace(evaluation.get(PlaceBind.names, Structure)) ??
                    createPlace(evaluation.getEvaluator(), 0, 0, 0, 0),
                toSpeed(evaluation.get(SpeedBind.names, Structure)) ??
                    createPlace(evaluation.getEvaluator(), 0, 0, 0, 0),
                evaluation.get(MassBind.names, Measurement)?.toNumber()
            ),
        (stream, evaluation) => {
            const place = toPlace(evaluation.get(PlaceBind.names, Structure));
            const speed = toSpeed(evaluation.get(SpeedBind.names, Structure));
            const mass = evaluation
                .get(MassBind.names, Measurement)
                ?.toNumber();
            if (place !== undefined) stream.setPlace(place);
            if (speed !== undefined) stream.setSpeed(speed);
            if (mass !== undefined) stream.setMass(mass);
        }
    ),
    type.clone()
);

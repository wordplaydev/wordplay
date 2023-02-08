import MeasurementType from '@nodes/MeasurementType';
import StreamType from '@nodes/StreamType';
import Unit from '@nodes/Unit';
import type Evaluator from '@runtime/Evaluator';
import Stream from '@runtime/Stream';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import type Place from '../output/Place';
import type Structure from '../runtime/Structure';
import { createPlaceStructure } from '../output/Place';

const DEFAULT_MASS = 1;

// Global gravity, 9.8 m/s^2.
const GRAVITY = 9.8;

export default class Motion extends Stream<Structure> {
    running = false;
    previous: DOMHighResTimeStamp | undefined;

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
        super(evaluator, place.value as Structure);

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

    computeDocs() {
        return getDocTranslations((t) => t.input.time.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.time.name);
    }

    start() {
        if (this.running) return;
        this.running = true;
        if (typeof window !== 'undefined')
            window.requestAnimationFrame((time) => this.tick(time));
    }

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

    tick(time: DOMHighResTimeStamp) {
        if (this.previous === undefined) this.previous = time;
        const delta = time - this.previous;

        this.move(delta);

        this.previous = time;

        // If still running, tick again later again in the next animation frame.
        if (this.running)
            window.requestAnimationFrame((time) => this.tick(time));
    }

    stop() {
        this.running = false;
    }

    getType() {
        return StreamType.make(MeasurementType.make(Unit.unit(['ms'])));
    }

    /** Given some change in time in milliseconds, move the object. */
    move(delta: number) {
        // Compute how many seconds have elapsed.
        const seconds = delta / 1000;

        // First, apply gravity to the y velocity proporitional to elapsed time.
        this.vy += GRAVITY * seconds;

        // Then, apply velocity to place.
        this.x += this.vx * seconds;
        this.y += this.vy * seconds;
        this.z += this.vz * seconds;
        this.angle += this.va * seconds;

        // If we collide with 0, negative y velocity.
        if (this.y > 0) {
            this.y = 0;
            this.vy = -this.vy;
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
}

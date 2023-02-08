import MeasurementType from '@nodes/MeasurementType';
import StreamType from '@nodes/StreamType';
import Unit from '@nodes/Unit';
import type Evaluator from '@runtime/Evaluator';
import Measurement from '@runtime/Measurement';
import Stream from '@runtime/Stream';
import type Node from '@nodes/Node';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';

const DEFAULT_VELOCITY = 0;
const DEFAULT_MASS = 1;

export default class Motion extends Stream<Measurement> {
    running = false;

    vx: number;
    vy: number;
    vz: number;
    va: number;
    mass: number;

    constructor(
        evaluator: Evaluator,
        vx: number = DEFAULT_VELOCITY,
        vy: number = DEFAULT_VELOCITY,
        vz: number = DEFAULT_VELOCITY,
        va: number = DEFAULT_VELOCITY,
        mass: number = DEFAULT_MASS
    ) {
        super(
            evaluator,
            new Measurement(evaluator.getMain(), 0, Unit.unit(['ms']))
        );
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;
        this.va = va;
        this.mass = mass;
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

    setVX(vx: number | undefined) {
        this.vx = vx ?? DEFAULT_VELOCITY;
    }

    setVY(vy: number | undefined) {
        this.vy = vy ?? DEFAULT_VELOCITY;
    }

    setVZ(vz: number | undefined) {
        this.vz = vz ?? DEFAULT_VELOCITY;
    }

    setVA(va: number | undefined) {
        this.va = va ?? DEFAULT_VELOCITY;
    }

    setMass(mass: number | undefined) {
        this.mass = mass ?? DEFAULT_MASS;
    }

    tick(time: DOMHighResTimeStamp) {
        // If still running, tick again later again in the next animation frame.
        if (this.running)
            window.requestAnimationFrame((time) => this.tick(time));
    }

    static make(creator: Node, time: number) {
        return new Measurement(creator, time, Unit.unit(['ms']));
    }

    stop() {
        this.running = false;
    }

    getType() {
        return StreamType.make(MeasurementType.make(Unit.unit(['ms'])));
    }
}

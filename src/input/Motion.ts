import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Bind from '@nodes/Bind';
import StreamDefinition from '@nodes/StreamDefinition';
import Place, { createPlaceStructure, toPlace } from '@output/Place';
import type Evaluation from '@runtime/Evaluation';
import StructureValue from '@values/StructureValue';
import TemporalStreamValue from '@values/TemporalStreamValue';
import type Locales from '@locale/Locales';
import type Context from '@nodes/Context';
import NoneLiteral from '@nodes/NoneLiteral';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import type { OutputBody } from '@output/Physics';
import { VelocityPxPerSecond } from '@output/physicsCalibration';
import type Velocity from '@output/Velocity';
import { toVelocity } from '@output/Velocity';
import NoneValue from '@values/NoneValue';
import type Value from '@values/Value';
import createStreamEvaluator from '@input/createStreamEvaluator';

/** The raw payload Motion records for each value: the elapsed delta that
 *  triggered it plus the engine-produced placement. Recording the placement
 *  (rather than just the delta) makes replaying raw inputs on a new Evaluator
 *  (Evaluator.mirror, on program edits) engine-independent: reconstruction
 *  reads the recorded placement instead of re-querying live physics state. */
export type MotionPayload = {
    delta: number;
    x: number;
    y: number;
    z: number;
    angle: number;
};

export default class Motion extends TemporalStreamValue<Value, MotionPayload> {
    private initialPlace: Place | undefined;

    private place: Place | undefined;
    private velocity: Velocity | undefined;

    constructor(evaluation: Evaluation, place: Value, velocity: Value) {
        const initial = toPlace(place);
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Motion,
            place,
            {
                delta: 0,
                x: initial?.x ?? 0,
                y: initial?.y ?? 0,
                z: initial?.z ?? 0,
                angle: initial?.rotation ?? 0,
            },
        );

        this.initialPlace = this.place = toPlace(place);
        this.velocity = toVelocity(velocity);

        this.updateBodies();
    }

    // No setup or teardown, the Evaluator handles the requestAnimationFrame loop.
    start() {
        return;
    }
    stop() {
        return;
    }

    update(place: Value | undefined, velocity: Value | undefined) {
        this.place = toPlace(place);
        this.velocity = toVelocity(velocity);

        // Immediately update the bodies.
        this.updateBodies();
    }

    /** Find all of the bodies that this motion stream influences and update them. */
    updateBodies() {
        if (this.evaluator.scene === undefined) return;

        for (const output of this.getOutputs()) {
            const body = this.evaluator.scene.physics.getOutputBody(
                output.getName(),
            );

            if (body) this.updateBody(body);
        }
    }

    updateBody(rect: OutputBody) {
        // Only called from Physics.sync / updateBodies once a body exists, i.e.
        // after Physics loaded Rapier, so the rigid body is guaranteed present.
        const body = rect.rigidBody;
        if (this.velocity !== undefined) {
            // Are either of the velocities non-zero? Update the body's velocity.
            if (
                this.velocity.x !== undefined ||
                this.velocity.y !== undefined
            ) {
                const current = body.linvel();
                // Velocities scale by VelocityPxPerSecond to match the speeds
                // projects were tuned to under Matter.js (see Physics.ts).
                const velocity = {
                    x:
                        this.velocity.x !== undefined
                            ? this.velocity.x * VelocityPxPerSecond
                            : current.x,
                    // Flip the axis (engine y is negated stage y)
                    y:
                        this.velocity.y !== undefined
                            ? -this.velocity.y * VelocityPxPerSecond
                            : current.y,
                };
                body.setLinvel(velocity, true);
            }
            // Is the rotational velocity defined? Update the body's. Same
            // 60× calibration: Matter treated rad-per-frame as the unit.
            if (this.velocity.angle !== undefined)
                body.setAngvel(
                    ((this.velocity.angle * Math.PI) / 180) *
                        VelocityPxPerSecond,
                    true,
                );
        }

        // Did the place of the stream change? Reposition the body.
        if (this.place)
            body.setTranslation(
                rect.getPosition(
                    this.place.x,
                    this.place.y,
                    rect.width,
                    rect.height,
                ),
                true,
            );
    }

    getOutputs() {
        // Find the latest place in the scene
        const latest = this.latest();
        if (this.evaluator.scene)
            // Ask the scene for the output corresponding to the latest value this stream generated.
            return latest
                ? (this.evaluator.scene.getOutputByPlace(latest) ?? [])
                : [];
        else return [];
    }

    /** Replaying a recorded payload (Evaluator.mirror): reconstruct the Place
     *  from the recorded placement, without touching the physics engine. */
    react(payload: MotionPayload) {
        this.add(
            createPlaceStructure(
                this.evaluator,
                payload.x,
                payload.y,
                payload.z,
                payload.angle,
            ),
            payload,
        );
    }

    /** Live path: read each influenced body's placement out of the physics
     *  engine and record it (with the delta) as a new stream value. */
    private reactToPhysics(delta: number) {
        if (this.evaluator.scene === undefined) return;
        for (const output of this.getOutputs()) {
            const name = output.getName();
            // Ask the scene for the latest x, y, z, and angle from the physics engine.
            const placement = this.evaluator.scene.physics
                .getOutputBody(name)
                ?.getPlace();
            if (placement) {
                const z = this.place?.z ?? this.initialPlace?.z ?? 0;
                this.add(
                    createPlaceStructure(
                        this.evaluator,
                        placement.x,
                        placement.y,
                        z,
                        placement.angle,
                    ),
                    {
                        delta,
                        x: placement.x,
                        y: placement.y,
                        z,
                        angle: placement.angle,
                    },
                );
            }
        }
    }

    /** Given some change in time in milliseconds, move the object. */
    tick(_: DOMHighResTimeStamp, delta: number, multiplier: number) {
        if (multiplier === 0) return;

        // React to how many seconds have elapsed.
        this.reactToPhysics(delta / 1000 / Math.max(1, multiplier));
    }

    getType(context: Context): Type {
        return context.project.shares.output.Place.getTypeReference();
    }
}

export function createMotionDefinition(
    locales: Locales,
    placeType: StructureDefinition,
    velocityType: StructureDefinition,
) {
    const StartPlace = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.place.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.place.names),
        UnionType.orNone(placeType.getTypeReference()),
        NoneLiteral.make(),
    );

    const StartVelocity = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.velocity.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.velocity.names),
        UnionType.orNone(velocityType.getTypeReference()),
        NoneLiteral.make(),
    );

    const NextPlace = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.nextplace.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Motion.nextplace.names,
        ),
        UnionType.orNone(placeType.getTypeReference()),
        NoneLiteral.make(),
    );

    const NextVelocity = Bind.make(
        getDocLocales(
            locales,
            (locale) => locale.input.Motion.nextvelocity.doc,
        ),
        getNameLocales(
            locales,
            (locale) => locale.input.Motion.nextvelocity.names,
        ),
        UnionType.orNone(velocityType.getTypeReference()),
        NoneLiteral.make(),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Motion.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.names),
        [StartPlace, StartVelocity, NextPlace, NextVelocity],
        createStreamEvaluator<Motion>(
            placeType.getTypeReference(),
            Motion,
            (evaluation) => {
                return new Motion(
                    evaluation,
                    evaluation.get(StartPlace.names, StructureValue) ??
                        createPlaceStructure(
                            evaluation.getEvaluator(),
                            0,
                            0,
                            0,
                        ),
                    evaluation.get(StartVelocity.names, StructureValue) ??
                        new NoneValue(evaluation.getCreator()),
                );
            },
            (stream, evaluation) => {
                stream.update(
                    evaluation.get(NextPlace.names, StructureValue),
                    evaluation.get(NextVelocity.names, StructureValue),
                );
            },
        ),
        placeType.getTypeReference(),
    );
}

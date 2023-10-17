import type Evaluator from '@runtime/Evaluator';
import Place, { createPlaceStructure, toPlace } from '@output/Place';
import TemporalStreamValue from '@values/TemporalStreamValue';
import Bind from '@nodes/Bind';
import StreamDefinition from '@nodes/StreamDefinition';
import StructureValue from '@values/StructureValue';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import createStreamEvaluator from './createStreamEvaluator';
import UnionType from '../nodes/UnionType';
import NoneLiteral from '../nodes/NoneLiteral';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Value from '../values/Value';
import type Context from '../nodes/Context';
import type Type from '../nodes/Type';
import Matter from 'matter-js';
import type { OutputBody } from '../output/Physics';
import type Velocity from '../output/Velocity';
import { toVelocity } from '../output/Velocity';
import NoneValue from '../values/NoneValue';
import type Locales from '../locale/Locales';

export default class Motion extends TemporalStreamValue<Value, number> {
    private initialPlace: Place | undefined;

    private place: Place | undefined;
    private velocity: Velocity | undefined;

    constructor(evaluator: Evaluator, place: Value, velocity: Value) {
        super(evaluator, evaluator.project.shares.input.Motion, place, 0);

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
                output.getName()
            );

            if (body) this.updateBody(body);
        }
    }

    updateBody(rect: OutputBody) {
        const body = rect.body;
        if (this.velocity !== undefined) {
            // Are either of the velocities non-zero? Update the body's velocity.
            if (
                this.velocity.x !== undefined ||
                this.velocity.y !== undefined
            ) {
                const velocity = {
                    x:
                        this.velocity.x !== undefined
                            ? this.velocity.x
                            : body.velocity.x,
                    // Flip the axis
                    y:
                        this.velocity.y !== undefined
                            ? -this.velocity.y
                            : body.velocity.y,
                };
                Matter.Body.setVelocity(body, velocity);
            }
            // Is the rotational velocity defined? Update the body's.
            if (this.velocity.angle !== undefined)
                Matter.Body.setAngularVelocity(
                    body,
                    (this.velocity.angle * Math.PI) / 180
                );
        }

        // Did the place of the stream change? Reposition the body.
        if (this.place)
            Matter.Body.setPosition(
                body,
                rect.getPosition(
                    this.place.x,
                    this.place.y,
                    rect.width,
                    rect.height
                )
            );
    }

    getOutputs() {
        // Find the latest place in the scene
        const latest = this.latest();
        if (this.evaluator.scene)
            // Ask the scene for the output corresponding to the latest value this stream generated.
            return latest
                ? this.evaluator.scene.getOutputByPlace(latest) ?? []
                : [];
        else return [];
    }

    react(delta: number) {
        if (this.evaluator.scene === undefined) return;
        for (const output of this.getOutputs()) {
            const name = output.getName();
            // Ask the scene for the latest x, y, z, and angle from the physics engine.
            const placement = this.evaluator.scene.physics
                .getOutputBody(name)
                ?.getPlace();
            if (placement) {
                this.add(
                    createPlaceStructure(
                        this.evaluator,
                        placement.x,
                        placement.y,
                        this.place?.z ?? this.initialPlace?.z ?? 0,
                        placement.angle
                    ),
                    delta
                );
            }
        }
    }

    /** Given some change in time in milliseconds, move the object. */
    tick(_: DOMHighResTimeStamp, delta: number, multiplier: number) {
        if (multiplier === 0) return;

        // React to how many seconds have elapsed.
        this.react(delta / 1000 / Math.max(1, multiplier));
    }

    getType(context: Context): Type {
        return context.project.shares.output.Place.getTypeReference();
    }
}

export function createMotionDefinition(
    locales: Locales,
    placeType: StructureDefinition,
    velocityType: StructureDefinition
) {
    const StartPlace = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.place.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.place.names),
        UnionType.orNone(placeType.getTypeReference()),
        NoneLiteral.make()
    );

    const StartVelocity = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.velocity.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.velocity.names),
        UnionType.orNone(velocityType.getTypeReference()),
        NoneLiteral.make()
    );

    const NextPlace = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.nextplace.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Motion.nextplace.names
        ),
        UnionType.orNone(placeType.getTypeReference()),
        NoneLiteral.make()
    );

    const NextVelocity = Bind.make(
        getDocLocales(
            locales,
            (locale) => locale.input.Motion.nextvelocity.doc
        ),
        getNameLocales(
            locales,
            (locale) => locale.input.Motion.nextvelocity.names
        ),
        UnionType.orNone(velocityType.getTypeReference()),
        NoneLiteral.make()
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
                    evaluation.getEvaluator(),
                    evaluation.get(StartPlace.names, StructureValue) ??
                        createPlaceStructure(
                            evaluation.getEvaluator(),
                            0,
                            0,
                            0
                        ),
                    evaluation.get(StartVelocity.names, StructureValue) ??
                        new NoneValue(evaluation.getCreator())
                );
            },
            (stream, evaluation) => {
                stream.update(
                    evaluation.get(NextPlace.names, StructureValue),
                    evaluation.get(NextVelocity.names, StructureValue)
                );
            }
        ),
        placeType.getTypeReference()
    );
}

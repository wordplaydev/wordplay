import type Evaluator from '@runtime/Evaluator';
import Place, { createPlaceStructure, toPlace } from '@output/Place';
import TemporalStreamValue from '@values/TemporalStreamValue';
import Bind from '@nodes/Bind';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import Unit from '@nodes/Unit';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import createStreamEvaluator from './createStreamEvaluator';
import UnionType from '../nodes/UnionType';
import NoneLiteral from '../nodes/NoneLiteral';
import type Locale from '../locale/Locale';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Value from '../values/Value';
import { getFirstName } from '../locale/Locale';
import NameType from '../nodes/NameType';
import type Context from '../nodes/Context';
import type Type from '../nodes/Type';
import Matter from 'matter-js';
import type { OutputRectangle } from '../output/Scene';

export default class Motion extends TemporalStreamValue<Value, number> {
    private place: Place | undefined;
    private vx: number | undefined;
    private vy: number | undefined;
    private vrotation: number | undefined;

    constructor(
        evaluator: Evaluator,
        place: Value,
        vx: number | undefined,
        vy: number | undefined,
        vrotation: number | undefined
    ) {
        super(evaluator, evaluator.project.shares.input.Motion, place, 0);

        this.place = toPlace(place);
        this.vx = vx;
        this.vy = vy;
        this.vrotation = vrotation;

        this.updateBodies();
    }

    // No setup or teardown, the Evaluator handles the requestAnimationFrame loop.
    start() {
        return;
    }
    stop() {
        return;
    }

    update(
        place: StructureValue | undefined,
        vx: number | undefined,
        vy: number | undefined,
        vrotation: number | undefined
    ) {
        this.place = toPlace(place);
        this.vx = vx;
        this.vy = vy;
        this.vrotation = vrotation;

        this.updateBodies();
    }

    /** Find all of the bodies that this motion stream influences and update them. */
    updateBodies() {
        if (this.evaluator.scene === undefined) return;

        for (const output of this.getOutputs()) {
            const body = this.evaluator.scene.getOutputBody(output.getName());

            if (body) this.updateBody(body);
        }
    }

    updateBody(rect: OutputRectangle) {
        const body = rect.body;
        // Are either of the velocities non-zero? Update the body's velocity.
        if (this.vx !== undefined || this.vy !== undefined)
            Matter.Body.setVelocity(body, {
                x: this.vx !== undefined ? this.vx : body.velocity.x,
                // Flip the axis
                y: this.vy !== undefined ? -this.vy : body.velocity.y,
            });
        // Is the rotational velocity defined? Update the body's.
        if (this.vrotation !== undefined)
            Matter.Body.setAngularVelocity(
                body,
                (this.vrotation * Math.PI) / 180
            );

        // Did the place of the stream change? Reposition the body.
        if (this.place)
            Matter.Body.setPosition(
                body,
                rect.getPhysicsPositionFromPlace(
                    this.place.x,
                    this.place.y,
                    rect.width,
                    rect.height
                )
            );
    }

    getOutputs() {
        // Find the l
        const latest = this.latest();
        if (this.evaluator.scene)
            // Ask the scene for the output corresponding to the latest value this stream generated.
            return latest
                ? this.evaluator.scene.getOutputByValue(latest) ?? []
                : [];
        else return [];
    }

    react(delta: number) {
        if (this.evaluator.scene === undefined) return;
        for (const output of this.getOutputs()) {
            const name = output.getName();
            // Ask the scene for the latest x, y, z, and angle from the physics engine.
            const placement = this.evaluator.scene
                .getOutputBody(name)
                ?.getPlacement();
            if (placement) {
                this.add(
                    createPlaceStructure(
                        this.evaluator,
                        placement.x,
                        placement.y,
                        this.place?.z ?? 0,
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
        return NameType.make(
            context.project.shares.output.Place.names.getNames()[0]
        );
    }
}

const SpeedUnit = Unit.reuse(['m'], ['s']);
const SpeedType = NumberType.make(SpeedUnit);
const AngleSpeedUnit = Unit.reuse(['°'], ['s']);
const AngleSpeedType = NumberType.make(AngleSpeedUnit);

export function createMotionDefinition(
    locales: Locale[],
    phraseType: StructureDefinition
) {
    const PlaceName = getFirstName(locales[0].output.Place.names);

    const Place = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.place.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.place.names),
        UnionType.orNone(NameType.make(PlaceName)),
        NoneLiteral.make()
    );

    const VX = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.vx.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.vx.names),
        UnionType.orNone(SpeedType.clone()),
        NoneLiteral.make()
    );

    const VY = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.vy.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.vy.names),
        UnionType.orNone(SpeedType.clone()),
        NoneLiteral.make()
    );

    const VAngle = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.vrotation.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Motion.vrotation.names
        ),
        UnionType.orNone(AngleSpeedType.clone()),
        NoneLiteral.make()
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Motion.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.names),
        [Place, VX, VY, VAngle],
        createStreamEvaluator<Motion>(
            NameType.make(phraseType.getNames()[0], phraseType),
            Motion,
            (evaluation) => {
                return new Motion(
                    evaluation.getEvaluator(),
                    evaluation.get(Place.names, StructureValue) ??
                        createPlaceStructure(
                            evaluation.getEvaluator(),
                            0,
                            0,
                            0
                        ),
                    evaluation.get(VX.names, NumberValue)?.toNumber(),
                    evaluation.get(VY.names, NumberValue)?.toNumber(),
                    evaluation.get(VAngle.names, NumberValue)?.toNumber()
                );
            },
            (stream, evaluation) => {
                stream.update(
                    evaluation.get(Place.names, StructureValue),
                    evaluation.get(VX.names, NumberValue)?.toNumber(),
                    evaluation.get(VY.names, NumberValue)?.toNumber(),
                    evaluation.get(VAngle.names, NumberValue)?.toNumber()
                );
            }
        ),
        NameType.make(phraseType.getNames()[0], phraseType)
    );
}

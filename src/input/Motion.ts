import type Evaluator from '@runtime/Evaluator';
import { createPlaceStructure } from '@output/Place';
import TemporalStreamValue from '@values/TemporalStreamValue';
import Bind from '@nodes/Bind';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import StructureType from '@nodes/StructureType';
import Unit from '@nodes/Unit';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import createStreamEvaluator from './createStreamEvaluator';
import Evaluate from '../nodes/Evaluate';
import ValueException from '../values/ValueException';
import UnionType from '../nodes/UnionType';
import NoneLiteral from '../nodes/NoneLiteral';
import type Locale from '../locale/Locale';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Value from '../values/Value';
import Decimal from 'decimal.js';
import { getFirstName } from '../locale/Locale';
import NameType from '../nodes/NameType';
import type Context from '../nodes/Context';
import type Type from '../nodes/Type';
import { toTypeOutput } from '../output/toTypeOutput';
import { NameGenerator } from '../output/Stage';

export default class Motion extends TemporalStreamValue<Value, number> {
    /** The most recent structure given to this stream to replicate with a position */
    value: StructureValue;

    /** The current location and angle of the object. */
    x: Decimal;
    y: Decimal;
    z: Decimal;
    angle: Decimal;

    /** The current velocity the object.  */
    vx: Decimal;
    vy: Decimal;
    vz: Decimal;
    va: Decimal;

    constructor(
        evaluator: Evaluator,
        value: StructureValue,
        startplace: Value | undefined,
        startvx: number | undefined,
        startvy: number | undefined,
        startvz: number | undefined,
        startvangle: number | undefined
    ) {
        super(evaluator, evaluator.project.shares.input.Motion, value, 0);

        this.value = value;

        const place =
            startplace instanceof StructureValue &&
            startplace.is(evaluator.project.shares.output.Place)
                ? startplace
                : undefined;
        const startX = place?.getInput(0);
        const startY = place?.getInput(1);
        const startZ = place?.getInput(2);

        // Convert to a phrase to extract some initial values.
        const output = toTypeOutput(
            evaluator.project,
            value,
            new NameGenerator()
        );

        this.x = new Decimal(
            (startX instanceof NumberValue ? startX.toNumber() : undefined) ??
                output?.place?.x ??
                0
        );
        this.y = new Decimal(
            (startY instanceof NumberValue ? startY.toNumber() : undefined) ??
                output?.place?.y ??
                0
        );
        this.z = new Decimal(
            (startZ instanceof NumberValue ? startZ.toNumber() : undefined) ??
                output?.place?.z ??
                0
        );
        this.angle = new Decimal(output?.pose.rotation ?? 0);

        this.vx = new Decimal(startvx ?? 0);
        this.vy = new Decimal(startvy ?? 0);
        this.vz = new Decimal(startvz ?? 0);
        this.va = new Decimal(startvangle ?? 0);
    }

    // No setup or teardown, the Evaluator handles the requestAnimationFrame loop.
    start() {
        return;
    }
    stop() {
        return;
    }

    update(
        value: StructureValue | undefined,
        vx: number | undefined,
        vy: number | undefined,
        vz: number | undefined,
        vangle: number | undefined
    ) {
        if (value) {
            const output = toTypeOutput(
                this.evaluator.project,
                value,
                new NameGenerator()
            );
            if (output) {
                this.value = value;
                // this.x = new Decimal(output.place?.x ?? this.x);
                // this.y = new Decimal(output.place?.y ?? this.y);
                // this.z = new Decimal(output.place?.z ?? this.z);
                // this.angle = new Decimal(output.pose.rotation ?? this.angle);
            }
        }

        this.vx = new Decimal(vx ?? this.vx);
        this.vy = new Decimal(vy ?? this.vy);
        this.vz = new Decimal(vz ?? this.vz);
        this.va = new Decimal(vangle ?? this.va);
    }

    react(delta: number) {
        // Was there a collision? Update velocities.
        const latest = this.latest();
        if (this.evaluator.scene) {
            // Ask the scene for the output corresponding to the latest value this stream generated.
            const name = latest
                ? this.evaluator.scene.getOutputByValue(latest)?.getName()
                : undefined;
            if (name) {
                // Ask the scene for the latest x, y, z, and angle from the physics engine.
                const placement = this.evaluator.scene.getOutputPlacement(name);
                if (placement) {
                    this.x = new Decimal(placement.x);
                    this.y = new Decimal(placement.y);
                    this.angle = new Decimal(placement.angle);
                }
            }
        }
        // if (name) {
        //     const collisions = this.evaluator.scene?.getCollisionsWith(name);
        //     if (collisions) {
        //         const collision = collisions[0];

        //         if (!isNaN(collision.place.x) && !isNaN(collision.place.y)) {
        //             this.x = new Decimal(collision.place.x);
        //             this.y = new Decimal(collision.place.y);
        //         }
        //         this.vx = new Decimal(collision.velocity.vx);
        //         this.vy = new Decimal(collision.velocity.vy);
        //         this.va = new Decimal(
        //             Math.sqrt(
        //                 Math.pow(collision.velocity.vx, 2) +
        //                     Math.pow(collision.velocity.vy, 2)
        //             ) * 60
        //         );
        //     }
        // }

        // // First, apply gravity to the y velocity proporitional to elapsed time.
        // this.vy = this.vy.sub(this.gravity * delta);

        // // Then, apply velocity to place.
        // this.x = this.x.plus(this.vx.times(delta));
        // this.y = this.y.plus(this.vy.times(delta));
        // this.z = this.z.plus(this.vz.times(delta));
        // this.angle = this.angle.plus(this.va.times(delta));

        // // If we collide with 0, negate y velocity.
        // if (this.y.lessThanOrEqualTo(0)) {
        //     this.y = new Decimal(0);
        //     this.vy = this.vy.neg().times(this.bounciness);
        //     this.vx = this.vx.times(this.bounciness);
        //     this.va = this.va.times(this.bounciness);
        // }

        // Get the type so we can clone and modify it.
        const output = this.value;
        if (output instanceof StructureValue) {
            const creator =
                output.creator instanceof Evaluate
                    ? output.creator
                    : this.definition;

            const en = this.evaluator.project.basis.locales[0];
            const PlaceName =
                typeof en.output.Phrase.place.names === 'string'
                    ? en.output.Phrase.place.names
                    : en.output.Phrase.place.names[0];

            const RotationName =
                typeof en.output.Phrase.rotation.names === 'string'
                    ? en.output.Phrase.rotation.names
                    : en.output.Phrase.rotation.names[0];

            // Create a new type output with an updated place.
            const revised = output
                .withValue(
                    creator,
                    PlaceName,
                    createPlaceStructure(
                        this.evaluator,
                        this.x.toNumber(),
                        this.y.toNumber(),
                        this.z.toNumber()
                    )
                )
                ?.withValue(
                    creator,
                    RotationName,
                    new NumberValue(
                        this.definition,
                        this.angle,
                        Unit.reuse(['°'])
                    )
                );

            // Finally, add the new phrase to the stream.
            if (revised) this.add(revised, delta);
        }
    }

    /** Given some change in time in milliseconds, move the object. */
    tick(_: DOMHighResTimeStamp, delta: number, multiplier: number) {
        if (multiplier === 0) return;

        // React to how many seconds have elapsed.
        this.react(delta / 1000 / Math.max(1, multiplier));
    }

    getType(context: Context): Type {
        return StreamType.make(
            NameType.make(
                context.project.shares.output.Phrase.names.getNames()[0]
            )
        );
    }
}

const SpeedUnit = Unit.reuse(['m'], ['s']);
const SpeedType = NumberType.make(SpeedUnit);
const AngleSpeedUnit = Unit.reuse(['°'], ['s']);
const AngleSpeedType = NumberType.make(AngleSpeedUnit);

export function createMotionDefinition(
    locales: Locale[],
    TypeType: StructureDefinition,
    PhraseType: StructureDefinition
) {
    const PlaceName = getFirstName(locales[0].output.Place.names);

    const TypeBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.type.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.type.names),
        new StructureType(TypeType)
    );

    const StartPlace = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.startplace.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Motion.startplace.names
        ),
        UnionType.orNone(NameType.make(PlaceName)),
        NoneLiteral.make()
    );

    const StartVX = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.startvx.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.startvx.names),
        UnionType.orNone(SpeedType.clone()),
        NoneLiteral.make()
    );

    const StartVY = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.startvy.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.startvy.names),
        UnionType.orNone(SpeedType.clone()),
        NoneLiteral.make()
    );

    const StartVZ = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.startvz.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.startvz.names),
        UnionType.orNone(SpeedType.clone()),
        NoneLiteral.make()
    );

    const StartVAngle = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.startvangle.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Motion.startvangle.names
        ),
        UnionType.orNone(AngleSpeedType.clone()),
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

    const VZ = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.vz.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.vz.names),
        UnionType.orNone(SpeedType.clone()),
        NoneLiteral.make()
    );

    const VAngle = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.vangle.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.vangle.names),
        UnionType.orNone(AngleSpeedType.clone()),
        NoneLiteral.make()
    );

    const type = new StructureType(PhraseType);

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Motion.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.names),
        [
            TypeBind,
            StartPlace,
            StartVX,
            StartVY,
            StartVZ,
            StartVAngle,
            VX,
            VY,
            VZ,
            VAngle,
        ],
        createStreamEvaluator<Motion>(
            type.clone(),
            Motion,
            (evaluation) => {
                const value = evaluation.get(TypeBind.names, StructureValue);
                return value
                    ? new Motion(
                          evaluation.getEvaluator(),
                          value,
                          evaluation.get(StartPlace.names, StructureValue),
                          evaluation
                              .get(StartVX.names, NumberValue)
                              ?.toNumber(),
                          evaluation
                              .get(StartVY.names, NumberValue)
                              ?.toNumber(),
                          evaluation
                              .get(StartVZ.names, NumberValue)
                              ?.toNumber(),
                          evaluation
                              .get(StartVAngle.names, NumberValue)
                              ?.toNumber()
                      )
                    : new ValueException(
                          evaluation.getEvaluator(),
                          evaluation.getCreator()
                      );
            },
            (stream, evaluation) => {
                stream.update(
                    // Not valid type output? Revert to the current value.
                    evaluation.get(TypeBind.names, StructureValue),
                    evaluation.get(VX.names, NumberValue)?.toNumber(),
                    evaluation.get(VY.names, NumberValue)?.toNumber(),
                    evaluation.get(VZ.names, NumberValue)?.toNumber(),
                    evaluation.get(VAngle.names, NumberValue)?.toNumber()
                );
            }
        ),
        type.clone()
    );
}

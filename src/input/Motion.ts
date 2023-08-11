import type Evaluator from '@runtime/Evaluator';
import { createPlaceStructure } from '@output/Place';
import TemporalStreamValue from '@values/TemporalStreamValue';
import Bind from '@nodes/Bind';
import NumberLiteral from '@nodes/NumberLiteral';
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
import type TypeOutput from '../output/TypeOutput';
import { toTypeOutput } from '../output/toTypeOutput';
import Evaluate from '../nodes/Evaluate';
import ValueException from '../values/ValueException';
import UnionType from '../nodes/UnionType';
import NoneLiteral from '../nodes/NoneLiteral';
import type Locale from '../locale/Locale';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Value from '../values/Value';
import Decimal from 'decimal.js';

const Bounciness = 0.5;
const Gravity = 9.8;

export default class Motion extends TemporalStreamValue<Value, number> {
    output: TypeOutput;

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

    /* Collision and gravity properties.. */
    mass: number;
    bounciness: number;
    gravity: number;

    constructor(
        evaluator: Evaluator,
        type: TypeOutput,
        vx: number | undefined,
        vy: number | undefined,
        vz: number | undefined,
        vangle: number | undefined,
        mass: number | undefined,
        bounciness: number | undefined,
        gravity: number | undefined
    ) {
        super(evaluator, evaluator.project.shares.input.Motion, type.value, 0);

        this.output = type;

        this.x = new Decimal(type.place?.x ?? 0);
        this.y = new Decimal(type.place?.y ?? 0);
        this.z = new Decimal(type.place?.z ?? 0);
        this.angle = new Decimal(type.pose.rotation ?? 0);

        this.vx = new Decimal(vx ?? 0);
        this.vy = new Decimal(vy ?? 0);
        this.vz = new Decimal(vz ?? 0);
        this.va = new Decimal(vangle ?? 0);

        this.mass = mass ?? 1;
        this.bounciness = bounciness ?? Bounciness;
        this.gravity = gravity ?? Gravity;
    }

    // No setup or teardown, the Evaluator handles the requestAnimationFrame loop.
    start() {}
    stop() {}

    update(
        output: TypeOutput | undefined,
        vx: number | undefined,
        vy: number | undefined,
        vz: number | undefined,
        vangle: number | undefined,
        mass: number | undefined,
        bounciness: number | undefined,
        gravity: number | undefined
    ) {
        if (output) {
            this.output = output;
            this.x = new Decimal(output.place?.x ?? this.x);
            this.y = new Decimal(output.place?.y ?? this.y);
            this.z = new Decimal(output.place?.z ?? this.z);
            this.angle = new Decimal(output.pose.rotation ?? this.angle);
        }

        this.vx = new Decimal(vx ?? this.vx);
        this.vy = new Decimal(vy ?? this.vy);
        this.vz = new Decimal(vz ?? this.vz);
        this.va = new Decimal(vangle ?? this.va);

        if (mass !== undefined) this.mass = mass;
        if (bounciness !== undefined) this.bounciness = bounciness;
        if (gravity !== undefined) this.gravity = gravity;
    }

    react(delta: number) {
        // First, apply gravity to the y velocity proporitional to elapsed time.
        this.vy = this.vy.sub(this.gravity * delta);

        // Then, apply velocity to place.
        this.x = this.x.plus(this.vx.times(delta));
        this.y = this.y.plus(this.vy.times(delta));
        this.z = this.z.plus(this.vz.times(delta));
        this.angle = this.angle.plus(this.va.times(delta));

        // If we collide with 0, negate y velocity.
        if (this.y.lessThanOrEqualTo(0)) {
            this.y = new Decimal(0);
            this.vy = this.vy.neg().times(this.bounciness);
            this.vx = this.vx.times(this.bounciness);
            this.va = this.va.times(this.bounciness);
        }

        // Get the type so we can clone and modify it.
        const output = this.output.value;
        if (output instanceof StructureValue) {
            const creator =
                output.creator instanceof Evaluate
                    ? output.creator
                    : this.definition;

            const en = this.evaluator.project.basis.locales[0];
            const PlaceName =
                typeof en.output.Type.place.names === 'string'
                    ? en.output.Type.place.names
                    : en.output.Type.place.names[0];

            const RotationName =
                typeof en.output.Type.rotation.names === 'string'
                    ? en.output.Type.rotation.names
                    : en.output.Type.rotation.names[0];

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

            // Finally, add the new place to the stream.
            if (revised) this.add(revised, delta);
        }
    }

    /** Given some change in time in milliseconds, move the object. */
    tick(_: DOMHighResTimeStamp, delta: number, multiplier: number) {
        if (multiplier === 0) return;

        // React to how many seconds have elapsed.
        this.react(delta / 1000 / Math.max(1, multiplier));
    }

    getType() {
        return StreamType.make(NumberType.make(Unit.reuse(['ms'])));
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
    const TypeBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.type.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.type.names),
        new StructureType(TypeType)
    );

    const VXBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.vx.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.vx.names),
        UnionType.orNone(SpeedType.clone()),
        NoneLiteral.make()
    );

    const VYBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.vy.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.vy.names),
        UnionType.orNone(SpeedType.clone()),
        NoneLiteral.make()
    );

    const VZBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.vz.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.vz.names),
        UnionType.orNone(SpeedType.clone()),
        NoneLiteral.make()
    );

    const VAngleBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.vangle.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.vangle.names),
        UnionType.orNone(AngleSpeedType.clone()),
        NoneLiteral.make()
    );

    const MassBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.mass.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.mass.names),
        UnionType.orNone(NumberType.make(Unit.reuse(['kg']))),
        // Default to 1kg.
        NumberLiteral.make(1, Unit.reuse(['kg']))
    );

    const BouncinessBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.bounciness.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Motion.bounciness.names
        ),
        UnionType.orNone(NumberType.make()),
        NumberLiteral.make(Bounciness)
    );

    const GravityBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.gravity.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.gravity.names),
        UnionType.orNone(NumberType.make(Unit.reuse(['m'], ['s', 's']))),
        NumberLiteral.make(9.8, Unit.reuse(['m'], ['s', 's']))
    );

    const type = new StructureType(PhraseType);

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Motion.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.names),
        [
            TypeBind,
            VXBind,
            VYBind,
            VZBind,
            VAngleBind,
            MassBind,
            BouncinessBind,
            GravityBind,
        ],
        createStreamEvaluator<Motion>(
            type.clone(),
            Motion,
            (evaluation) => {
                const type = toTypeOutput(
                    evaluation.getEvaluator().project,
                    evaluation.get(TypeBind.names, StructureValue)
                );
                return type
                    ? new Motion(
                          evaluation.getEvaluator(),
                          type,
                          evaluation.get(VXBind.names, NumberValue)?.toNumber(),
                          evaluation.get(VYBind.names, NumberValue)?.toNumber(),
                          evaluation.get(VZBind.names, NumberValue)?.toNumber(),
                          evaluation
                              .get(VAngleBind.names, NumberValue)
                              ?.toNumber(),
                          evaluation
                              .get(MassBind.names, NumberValue)
                              ?.toNumber(),
                          evaluation
                              .get(BouncinessBind.names, NumberValue)
                              ?.toNumber(),
                          evaluation
                              .get(GravityBind.names, NumberValue)
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
                    toTypeOutput(
                        evaluation.getEvaluator().project,
                        evaluation.get(TypeBind.names, StructureValue)
                    ),
                    evaluation.get(VXBind.names, NumberValue)?.toNumber(),
                    evaluation.get(VYBind.names, NumberValue)?.toNumber(),
                    evaluation.get(VZBind.names, NumberValue)?.toNumber(),
                    evaluation.get(VAngleBind.names, NumberValue)?.toNumber(),
                    evaluation.get(MassBind.names, NumberValue)?.toNumber(),
                    evaluation
                        .get(BouncinessBind.names, NumberValue)
                        ?.toNumber(),
                    evaluation.get(GravityBind.names, NumberValue)?.toNumber()
                );
            }
        ),
        type.clone()
    );
}

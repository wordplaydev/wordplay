import type Evaluator from '@runtime/Evaluator';
import { createPlaceStructure } from '@output/Place';
import TemporalStream from '@runtime/TemporalStream';
import Bind from '@nodes/Bind';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import Unit from '@nodes/Unit';
import Number from '@runtime/Number';
import Structure from '@runtime/Structure';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import createStreamEvaluator from './createStreamEvaluator';
import type TypeOutput from '../output/TypeOutput';
import type Value from '../runtime/Value';
import { toTypeOutput } from '../output/toTypeOutput';
import Evaluate from '../nodes/Evaluate';
import ValueException from '../runtime/ValueException';
import UnionType from '../nodes/UnionType';
import NoneLiteral from '../nodes/NoneLiteral';
import type Locale from '../locale/Locale';
import type StructureDefinition from '../nodes/StructureDefinition';

export default class Motion extends TemporalStream<Value> {
    type: TypeOutput;

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
        super(evaluator, evaluator.project.shares.input.Motion, type.value);

        this.type = type;

        this.x = type.place?.x ?? 0;
        this.y = type.place?.y ?? 0;
        this.z = type.place?.z ?? 0;
        this.angle = type.pose.rotation ?? 0;

        this.vx = vx ?? 0;
        this.vy = vy ?? 0;
        this.vz = vz ?? 0;
        this.va = vangle ?? 0;

        this.mass = mass ?? 1;
        this.bounciness = bounciness ?? 0.75;
        this.gravity = gravity ?? 9.8;
    }

    // No setup or teardown, the Evaluator handles the requestAnimationFrame loop.
    start() {}
    stop() {}

    update(
        type: TypeOutput | undefined,
        vx: number | undefined,
        vy: number | undefined,
        vz: number | undefined,
        vangle: number | undefined,
        mass: number | undefined,
        bounciness: number | undefined,
        gravity: number | undefined
    ) {
        if (type) {
            this.x = type.place?.x ?? this.x;
            this.y = type.place?.y ?? this.y;
            this.z = type.place?.z ?? this.z;
            this.angle = type.pose.rotation ?? this.angle;
        }

        this.vx = vx ?? this.vx;
        this.vy = vy ?? this.vy;
        this.vz = vz ?? this.vz;
        this.va = vangle ?? this.va;

        if (mass !== undefined) this.mass = mass;
        if (bounciness !== undefined) this.bounciness = bounciness;
        if (gravity !== undefined) this.gravity = gravity;
    }

    /** Given some change in time in milliseconds, move the object. */
    tick(_: DOMHighResTimeStamp, delta: number, multiplier: number) {
        if (multiplier === 0) return;

        // Compute how many seconds have elapsed.
        const seconds = delta / 1000 / Math.max(1, multiplier);

        // First, apply gravity to the y velocity proporitional to elapsed time.
        this.vy -= this.gravity * seconds;

        // Then, apply velocity to place.
        this.x += this.vx * seconds;
        this.y += this.vy * seconds;
        this.z += this.vz * seconds;
        this.angle += this.va * seconds;

        // If we collide with 0, negate y velocity.
        if (this.y < 0) {
            this.y = 0;
            this.vy = -this.vy * this.bounciness;
            this.vx = this.vx * this.bounciness;
            this.va = this.va * this.bounciness;
        }

        // Get the type so we can clone and modify it.
        const type = this.type.value;
        if (type instanceof Structure) {
            const creator =
                type.creator instanceof Evaluate
                    ? type.creator
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
            const revised = type
                .withValue(
                    creator,
                    PlaceName,
                    createPlaceStructure(this.evaluator, this.x, this.y, this.z)
                )
                ?.withValue(
                    creator,
                    RotationName,
                    new Number(this.definition, this.angle, Unit.make(['°']))
                );

            // Finally, add the new place to the stream.
            if (revised) this.add(revised);
        }
    }

    getType() {
        return StreamType.make(NumberType.make(Unit.make(['ms'])));
    }
}

const SpeedUnit = Unit.make(['m'], ['s']);
const SpeedType = NumberType.make(SpeedUnit);
const AngleSpeedUnit = Unit.make(['°'], ['s']);
const AngleSpeedType = NumberType.make(AngleSpeedUnit);

export function createMotionDefinition(
    locales: Locale[],
    TypeType: StructureDefinition,
    PhraseType: StructureDefinition
) {
    const TypeBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.type.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.type.names),
        new StructureDefinitionType(TypeType)
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
        UnionType.orNone(NumberType.make(Unit.make(['kg']))),
        // Default to 1kg.
        NumberLiteral.make(1, Unit.make(['kg']))
    );

    const BouncinessBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.bounciness.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Motion.bounciness.names
        ),
        UnionType.orNone(NumberType.make()),
        NumberLiteral.make(0.75)
    );

    const GravityBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Motion.gravity.doc),
        getNameLocales(locales, (locale) => locale.input.Motion.gravity.names),
        UnionType.orNone(NumberType.make(Unit.make(['m'], ['s', 's']))),
        NumberLiteral.make(15, Unit.make(['m'], ['s', 's']))
    );

    const type = new StructureDefinitionType(PhraseType);

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
                    evaluation.get(TypeBind.names, Structure)
                );
                return type
                    ? new Motion(
                          evaluation.getEvaluator(),
                          type,
                          evaluation.get(VXBind.names, Number)?.toNumber(),
                          evaluation.get(VYBind.names, Number)?.toNumber(),
                          evaluation.get(VZBind.names, Number)?.toNumber(),
                          evaluation.get(VAngleBind.names, Number)?.toNumber(),
                          evaluation.get(MassBind.names, Number)?.toNumber(),
                          evaluation
                              .get(BouncinessBind.names, Number)
                              ?.toNumber(),
                          evaluation.get(GravityBind.names, Number)?.toNumber()
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
                        evaluation.get(TypeBind.names, Structure)
                    ),
                    evaluation.get(VXBind.names, Number)?.toNumber(),
                    evaluation.get(VYBind.names, Number)?.toNumber(),
                    evaluation.get(VZBind.names, Number)?.toNumber(),
                    evaluation.get(VAngleBind.names, Number)?.toNumber(),
                    evaluation.get(MassBind.names, Number)?.toNumber(),
                    evaluation.get(BouncinessBind.names, Number)?.toNumber(),
                    evaluation.get(GravityBind.names, Number)?.toNumber()
                );
            }
        ),
        type.clone()
    );
}

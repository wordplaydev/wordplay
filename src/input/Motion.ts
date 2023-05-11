import type Evaluator from '@runtime/Evaluator';
import { createPlaceStructure } from '@output/Place';
import TemporalStream from '@runtime/TemporalStream';
import Bind from '@nodes/Bind';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import MeasurementType from '@nodes/MeasurementType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import Unit from '@nodes/Unit';
import Measurement from '@runtime/Measurement';
import Structure from '@runtime/Structure';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import createStreamEvaluator from './createStreamEvaluator';
import TypeOutput, { TypeType } from '../output/TypeOutput';
import type Value from '../runtime/Value';
import { toTypeOutput } from '../output/toTypeOutput';
import en from '../locale/locales/en';
import Evaluate from '../nodes/Evaluate';
import TextLiteral from '../nodes/TextLiteral';
import Reference from '../nodes/Reference';
import ValueException from '../runtime/ValueException';
import UnionType from '../nodes/UnionType';
import NoneLiteral from '../nodes/NoneLiteral';
import { PhraseType } from '../output/Phrase';
import { animationFactor } from '../models/stores';
import { get } from 'svelte/store';

const PlaceName =
    typeof en.output.type.place.names === 'string'
        ? en.output.type.place.names
        : en.output.type.place.names[0];

const RotationName =
    typeof en.output.type.rotation.names === 'string'
        ? en.output.type.rotation.names
        : en.output.type.rotation.names[0];

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
        super(evaluator, MotionDefinition, type.value);

        this.type = type;

        this.x = type.place?.x ?? 0;
        this.y = type.place?.y ?? 0;
        this.z = type.place?.z ?? 0;
        this.angle = type.rotation ?? 0;

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
            this.angle = type.rotation ?? this.angle;
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
    tick(_: DOMHighResTimeStamp, delta: number) {
        // Compute how many seconds have elapsed.
        const seconds = delta / 1000 / Math.max(1, get(animationFactor));

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
                    new Measurement(
                        this.definition,
                        this.angle,
                        Unit.make(['°'])
                    )
                );

            // Finally, add the new place to the stream.
            if (revised) this.add(revised);
        }
    }

    getType() {
        return StreamType.make(MeasurementType.make(Unit.make(['ms'])));
    }
}

const SpeedUnit = Unit.make(['m'], ['s']);
const SpeedType = MeasurementType.make(SpeedUnit);
const AngleSpeedUnit = Unit.make(['°'], ['s']);
const AngleSpeedType = MeasurementType.make(AngleSpeedUnit);

const TypeBind = Bind.make(
    getDocLocales((t) => t.input.motion.type.doc),
    getNameLocales((t) => t.input.motion.type.names),
    new StructureDefinitionType(TypeType),
    Evaluate.make(Reference.make('Phrase'), [TextLiteral.make('⚽️')])
);

const VXBind = Bind.make(
    getDocLocales((t) => t.input.motion.vx.doc),
    getNameLocales((t) => t.input.motion.vx.names),
    UnionType.orNone(SpeedType.clone()),
    NoneLiteral.make()
);

const VYBind = Bind.make(
    getDocLocales((t) => t.input.motion.vy.doc),
    getNameLocales((t) => t.input.motion.vy.names),
    UnionType.orNone(SpeedType.clone()),
    NoneLiteral.make()
);

const VZBind = Bind.make(
    getDocLocales((t) => t.input.motion.vz.doc),
    getNameLocales((t) => t.input.motion.vz.names),
    UnionType.orNone(SpeedType.clone()),
    NoneLiteral.make()
);

const VAngleBind = Bind.make(
    getDocLocales((t) => t.input.motion.vangle.doc),
    getNameLocales((t) => t.input.motion.vangle.names),
    UnionType.orNone(AngleSpeedType.clone()),
    NoneLiteral.make()
);

const MassBind = Bind.make(
    getDocLocales((t) => t.input.motion.mass.doc),
    getNameLocales((t) => t.input.motion.mass.names),
    UnionType.orNone(MeasurementType.make(Unit.make(['kg']))),
    // Default to 1kg.
    MeasurementLiteral.make(1, Unit.make(['kg']))
);

const BouncinessBind = Bind.make(
    getDocLocales((t) => t.input.motion.bounciness.doc),
    getNameLocales((t) => t.input.motion.bounciness.names),
    UnionType.orNone(MeasurementType.make()),
    MeasurementLiteral.make(0.75)
);

const GravityBind = Bind.make(
    getDocLocales((t) => t.input.motion.gravity.doc),
    getNameLocales((t) => t.input.motion.gravity.names),
    UnionType.orNone(MeasurementType.make(Unit.make(['m'], ['s', 's']))),
    MeasurementLiteral.make(15, Unit.make(['m'], ['s', 's']))
);

const type = new StructureDefinitionType(PhraseType);

export const MotionDefinition = StreamDefinition.make(
    getDocLocales((t) => t.input.motion.doc),
    getNameLocales((t) => t.input.motion.names),
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
                evaluation.get(TypeBind.names, Structure)
            );
            return type
                ? new Motion(
                      evaluation.getEvaluator(),
                      type,
                      evaluation.get(VXBind.names, Measurement)?.toNumber(),
                      evaluation.get(VYBind.names, Measurement)?.toNumber(),
                      evaluation.get(VZBind.names, Measurement)?.toNumber(),
                      evaluation.get(VAngleBind.names, Measurement)?.toNumber(),
                      evaluation.get(MassBind.names, Measurement)?.toNumber(),
                      evaluation
                          .get(BouncinessBind.names, Measurement)
                          ?.toNumber(),
                      evaluation.get(GravityBind.names, Measurement)?.toNumber()
                  )
                : new ValueException(
                      evaluation.getEvaluator(),
                      evaluation.getCreator()
                  );
        },
        (stream, evaluation) => {
            stream.update(
                // Not valid type output? Revert to the current value.
                toTypeOutput(evaluation.get(TypeBind.names, Structure)),
                evaluation.get(VXBind.names, Measurement)?.toNumber(),
                evaluation.get(VYBind.names, Measurement)?.toNumber(),
                evaluation.get(VZBind.names, Measurement)?.toNumber(),
                evaluation.get(VAngleBind.names, Measurement)?.toNumber(),
                evaluation.get(MassBind.names, Measurement)?.toNumber(),
                evaluation.get(BouncinessBind.names, Measurement)?.toNumber(),
                evaluation.get(GravityBind.names, Measurement)?.toNumber()
            );
        }
    ),
    type.clone()
);

import NativeExpression from '../native/NativeExpression';
import Bind from '../nodes/Bind';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import MeasurementType from '../nodes/MeasurementType';
import type Names from '../nodes/Names';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import StructureDefinitionType from '../nodes/StructureDefinitionType';
import Unit from '../nodes/Unit';
import { PlaceType } from '../output/Place';
import type Evaluation from '../runtime/Evaluation';
import Measurement from '../runtime/Measurement';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';
import Motion from './Motion';

const vxBind = Bind.make(
    getDocTranslations((t) => t.input.motion.vx.doc),
    getNameTranslations((t) => t.input.motion.vx.name),
    MeasurementType.make(Unit.unit(['m/s'])),
    // Default to 0 m/s
    MeasurementLiteral.make(0, Unit.unit(['m/s']))
);

const vyBind = Bind.make(
    getDocTranslations((t) => t.input.motion.vx.doc),
    getNameTranslations((t) => t.input.motion.vy.name),
    MeasurementType.make(Unit.unit(['m/s'])),
    // Default to 0 m/s
    MeasurementLiteral.make(0, Unit.unit(['m/s']))
);

const vzBind = Bind.make(
    getDocTranslations((t) => t.input.motion.vz.doc),
    getNameTranslations((t) => t.input.motion.vz.name),
    MeasurementType.make(Unit.unit(['m/s'])),
    // Default to 0 m/s
    MeasurementLiteral.make(0, Unit.unit(['m/s']))
);

const vaBind = Bind.make(
    getDocTranslations((t) => t.input.motion.va.doc),
    getNameTranslations((t) => t.input.motion.va.name),
    MeasurementType.make(Unit.unit(['°/s'])),
    // Default to 0 m/s
    MeasurementLiteral.make(0, Unit.unit(['°/s']))
);

const massBind = Bind.make(
    getDocTranslations((t) => t.input.motion.mass.doc),
    getNameTranslations((t) => t.input.motion.mass.name),
    MeasurementType.make(Unit.unit(['kg'])),
    // Default to 0 m/s
    MeasurementLiteral.make(1, Unit.unit(['kg']))
);

const type = new StructureDefinitionType(PlaceType);

const MotionDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.motion.doc),
    getNameTranslations((t) => t.input.motion.name),
    [vxBind, vyBind, vaBind, massBind, vzBind],
    new NativeExpression(StreamType.make(type.clone()), (_, evaluation) => {
        const evaluator = evaluation.getEvaluator();

        // Get the given values of the inputs..
        const vx: number | undefined = toNumber(evaluation, vxBind.names);
        const vy: number | undefined = toNumber(evaluation, vyBind.names);
        const vz: number | undefined = toNumber(evaluation, vzBind.names);
        const va: number | undefined = toNumber(evaluation, vaBind.names);
        const mass: number | undefined = toNumber(evaluation, massBind.names);

        // Get the motion stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
        const stream = evaluator.getNativeStreamFor(evaluation.getCreator());

        // Update the configuration of the stream with the new frequency.
        if (stream instanceof Motion) {
            stream.setVX(vx);
            stream.setVY(vy);
            stream.setVZ(vz);
            stream.setVA(va);
            stream.setMass(mass);
            return stream;
        } else {
            const newStream = new Motion(evaluator, vx, vy, vz, va, mass);
            evaluator.addNativeStreamFor(evaluation.getCreator(), newStream);
            return newStream;
        }
    }),
    type.clone()
);

function toNumber(evaluation: Evaluation, names: Names) {
    const value = evaluation.resolve(names);
    return value instanceof Measurement ? value.toNumber() : undefined;
}

export default MotionDefinition;

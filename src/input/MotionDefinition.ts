import NativeExpression from '../native/NativeExpression';
import Bind from '../nodes/Bind';
import Evaluate from '../nodes/Evaluate';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import MeasurementType from '../nodes/MeasurementType';
import type Names from '../nodes/Names';
import Reference from '../nodes/Reference';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import StructureDefinitionType from '../nodes/StructureDefinitionType';
import Unit from '../nodes/Unit';
import { createPlace, PlaceType, toPlace } from '../output/Place';
import type Evaluation from '../runtime/Evaluation';
import Measurement from '../runtime/Measurement';
import Structure from '../runtime/Structure';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';
import Motion from './Motion';
import { SpeedType, toSpeed } from './Speed';

const placeBind = Bind.make(
    getDocTranslations((t) => t.input.motion.place.doc),
    getNameTranslations((t) => t.input.motion.place.name),
    new StructureDefinitionType(PlaceType),
    Evaluate.make(Reference.make(PlaceType.names.getNames()[0], PlaceType), [])
);

const speedBind = Bind.make(
    getDocTranslations((t) => t.input.motion.speed.doc),
    getNameTranslations((t) => t.input.motion.speed.name),
    new StructureDefinitionType(SpeedType),
    Evaluate.make(Reference.make(SpeedType.names.getNames()[0], SpeedType), [])
);

const massBind = Bind.make(
    getDocTranslations((t) => t.input.motion.mass.doc),
    getNameTranslations((t) => t.input.motion.mass.name),
    MeasurementType.make(Unit.unit(['kg'])),
    // Default to 1kg.
    MeasurementLiteral.make(1, Unit.unit(['kg']))
);

const type = new StructureDefinitionType(PlaceType);

const MotionDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.motion.doc),
    getNameTranslations((t) => t.input.motion.name),
    [placeBind, speedBind, massBind],
    new NativeExpression(StreamType.make(type.clone()), (_, evaluation) => {
        const evaluator = evaluation.getEvaluator();

        // Get the given values of the inputs..
        const place = toPlace(toStructure(evaluation, placeBind.names));
        const speed = toSpeed(toStructure(evaluation, speedBind.names));
        const mass: number | undefined = toNumber(evaluation, massBind.names);

        // Get the motion stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
        const stream = evaluator.getNativeStreamFor(evaluation.getCreator());

        // Update the configuration of the stream with the new frequency.
        if (stream instanceof Motion) {
            if (place) stream.setPlace(place);
            if (speed) stream.setSpeed(speed);
            if (mass) stream.setMass(mass);
            return stream;
        } else {
            const newStream = new Motion(
                evaluator,
                place ?? createPlace(evaluator, 0, 0, 0, 0),
                speed ?? createPlace(evaluator, 0, 0, 0, 0),
                mass
            );
            evaluator.addNativeStreamFor(evaluation.getCreator(), newStream);
            return newStream;
        }
    }),
    type.clone()
);

function toStructure(evaluation: Evaluation, names: Names) {
    const value = evaluation.resolve(names);
    if (value === undefined || !(value instanceof Structure)) return undefined;
    return value;
}

function toNumber(evaluation: Evaluation, names: Names) {
    const value = evaluation.resolve(names);
    return value instanceof Measurement ? value.toNumber() : undefined;
}

export default MotionDefinition;

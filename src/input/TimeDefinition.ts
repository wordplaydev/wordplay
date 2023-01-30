import NativeExpression from '../native/NativeExpression';
import Bind from '../nodes/Bind';
import MeasurementType from '../nodes/MeasurementType';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneType from '../nodes/NoneType';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import Measurement from '../runtime/Measurement';
import type Value from '../runtime/Value';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';
import Time from './Time';

const type = MeasurementType.make(Unit.unit(['ms']));

const frequencyBind = Bind.make(
    getDocTranslations((t) => t.input.time.frequency.doc),
    getNameTranslations((t) => t.input.time.frequency.name),
    UnionType.make(MeasurementType.make(Unit.unit(['ms'])), NoneType.make()),
    // Default to nothing
    NoneLiteral.make()
);

const TimeDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.time.doc),
    getNameTranslations((t) => t.input.time.name),
    [frequencyBind],
    new NativeExpression(StreamType.make(type.clone()), (_, evaluation) => {
        const evaluator = evaluation.getEvaluator();

        // Get the given frequency.
        const frequencyValue: Value | undefined = evaluation.resolve(
            frequencyBind.names
        );

        // Convert to a number
        const frequency =
            frequencyValue instanceof Measurement
                ? frequencyValue.toNumber()
                : undefined;

        // Get the time stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
        const stream = evaluator.getNativeStreamFor(evaluation.getCreator());

        // Update the configuration of the stream with the new frequency.
        if (stream instanceof Time) {
            stream.setFrequency(frequency);
            return stream;
        } else {
            const newStream = new Time(evaluator, frequency);
            evaluator.addNativeStreamFor(evaluation.getCreator(), newStream);
            return newStream;
        }
    }),
    type.clone()
);

export default TimeDefinition;

import StreamDefinition from '../nodes/StreamDefinition';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';
import MeasurementType from '../nodes/MeasurementType';
import Bind from '../nodes/Bind';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import NoneType from '../nodes/NoneType';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import NativeExpression from '../native/NativeExpression';
import StreamType from '../nodes/StreamType';
import Measurement from '../runtime/Measurement';
import Microphone from './Microphone';

const type = MeasurementType.make(Unit.unit(['ms']));

const frequencyBind = Bind.make(
    getDocTranslations((t) => t.input.microphone.frequency.doc),
    getNameTranslations((t) => t.input.microphone.frequency.name),
    UnionType.make(MeasurementType.make(Unit.unit(['ms'])), NoneType.make()),
    // Default to nothing
    MeasurementLiteral.make(33, Unit.unit(['ms']))
);

const MicrophoneDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.microphone.doc),
    getNameTranslations((t) => t.input.microphone.name),
    [frequencyBind],
    new NativeExpression(StreamType.make(type.clone()), (_, evaluation) => {
        const evaluator = evaluation.getEvaluator();

        // Get the given frequency.
        const frequencyValue = evaluation.resolve(frequencyBind.names);

        // Convert to a number
        const frequency =
            frequencyValue instanceof Measurement
                ? frequencyValue.toNumber()
                : undefined;

        // Get the time stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
        const stream = evaluator.getNativeStreamFor(evaluation.getCreator());

        // Update the configuration of the stream with the new frequency.
        if (stream instanceof Microphone) {
            stream.setFrequency(frequency);
            return stream;
        } else {
            const newStream = new Microphone(evaluator, frequency);
            evaluator.addNativeStreamFor(evaluation.getCreator(), newStream);
            return newStream;
        }
    }),
    MeasurementType.make()
);

export default MicrophoneDefinition;

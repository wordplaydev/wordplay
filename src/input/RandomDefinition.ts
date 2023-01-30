import StreamDefinition from '../nodes/StreamDefinition';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';
import MeasurementType from '../nodes/MeasurementType';
import Bind from '../nodes/Bind';
import UnionType from '../nodes/UnionType';
import NoneType from '../nodes/NoneType';
import NoneLiteral from '../nodes/NoneLiteral';
import NativeExpression from '../native/NativeExpression';
import StreamType from '../nodes/StreamType';
import Measurement from '../runtime/Measurement';
import Random from './Random';

const minBind = Bind.make(
    getDocTranslations((t) => t.input.random.min.doc),
    getNameTranslations((t) => t.input.random.min.name),
    UnionType.make(MeasurementType.make(), NoneType.make()),
    // Default to nothing
    NoneLiteral.make()
);

const maxBind = Bind.make(
    getDocTranslations((t) => t.input.random.max.doc),
    getNameTranslations((t) => t.input.random.max.name),
    UnionType.make(MeasurementType.make(), NoneType.make()),
    // Default to nothing
    NoneLiteral.make()
);

const RandomDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.random.doc),
    getNameTranslations((t) => t.input.random.name),
    [minBind, maxBind],
    new NativeExpression(
        StreamType.make(MeasurementType.make()),
        (_, evaluation) => {
            const evaluator = evaluation.getEvaluator();

            // Get the min and max
            const minValue = evaluation.resolve(minBind.names);
            const maxValue = evaluation.resolve(maxBind.names);
            const min =
                minValue instanceof Measurement
                    ? minValue.toNumber()
                    : undefined;
            const max =
                maxValue instanceof Measurement
                    ? maxValue.toNumber()
                    : undefined;

            // Get the time stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
            const stream = evaluator.getNativeStreamFor(
                evaluation.getCreator()
            );

            // Update the configuration of the stream with the new frequency.
            if (stream instanceof Random) {
                stream.setRange(min, max);
                return stream;
            } else {
                const newStream = new Random(evaluator, min, max);
                evaluator.addNativeStreamFor(
                    evaluation.getCreator(),
                    newStream
                );
                return newStream;
            }
        }
    ),
    MeasurementType.make()
);

export default RandomDefinition;

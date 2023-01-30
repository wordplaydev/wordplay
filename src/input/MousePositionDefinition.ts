import StreamDefinition from '../nodes/StreamDefinition';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';
import StructureDefinitionType from '../nodes/StructureDefinitionType';
import { PlaceType } from '../output/Place';
import NativeExpression from '../native/NativeExpression';
import MousePosition from './MousePosition';
import StreamType from '../nodes/StreamType';

const MousePositionDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.mouseposition.doc),
    getNameTranslations((t) => t.input.mouseposition.name),
    [],
    new NativeExpression(
        StreamType.make(new StructureDefinitionType(PlaceType, [])),
        (_, evaluation) => {
            const evaluator = evaluation.getEvaluator();

            // Get the stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
            const stream = evaluator.getNativeStreamFor(
                evaluation.getCreator()
            );

            // If there is one, update the configuration of the stream with the new frequency.
            if (stream instanceof MousePosition) {
                return stream;
            }
            // Otherwise, create one.
            else {
                const newStream = new MousePosition(evaluator);
                evaluator.addNativeStreamFor(
                    evaluation.getCreator(),
                    newStream
                );
                return newStream;
            }
        }
    ),
    new StructureDefinitionType(PlaceType, [])
);

export default MousePositionDefinition;

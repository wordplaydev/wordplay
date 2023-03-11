/** Evaluates a native stream type, given some callbacks */

import NativeExpression from '../native/NativeExpression';
import StreamType from '../nodes/StreamType';
import type Type from '../nodes/Type';
import type Evaluation from '../runtime/Evaluation';
import type Evaluator from '../runtime/Evaluator';
import Exception from '../runtime/Exception';
import type Stream from '../runtime/Stream';

export default function createStreamEvaluator<Kind extends Stream>(
    valueType: Type,
    streamType: new (...params: any[]) => Kind,
    create: (evaluation: Evaluation) => Kind | Exception,
    update: (stream: Kind, evaluation: Evaluation) => void
) {
    return new NativeExpression(StreamType.make(valueType), (_, evaluation) => {
        const evaluator: Evaluator = evaluation.getEvaluator();

        // Notify the evaluator that we're evaluating a native stream type so it can keep
        // track of the number of types the node has evaluated, identifying individual streams.
        evaluator.incrementNativeStreamEvaluationCount(evaluation.getCreator());

        // Get the stream corresponding to this node.
        const stream = evaluator.getNativeStreamFor(evaluation.getCreator());

        // If we found one of the expected type, update it with the latest values.
        if (stream instanceof streamType) {
            update(stream, evaluation);
            return stream;
        }
        // Otherwise, create a new stream.
        else {
            const newStream = create(evaluation);
            if (newStream instanceof Exception) return newStream;
            evaluator.addNativeStreamFor(evaluation.getCreator(), newStream);
            return newStream;
        }
    });
}

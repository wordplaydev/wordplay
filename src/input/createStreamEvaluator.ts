/** Evaluates a basis stream type, given some callbacks */

import InternalExpression from '../basis/InternalExpression';
import StreamType from '../nodes/StreamType';
import type Type from '../nodes/Type';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type StreamValue from '../values/StreamValue';

export default function createStreamEvaluator<Kind extends StreamValue>(
    valueType: Type,
    streamType: new (...params: any[]) => Kind,
    create: (evaluation: Evaluation) => Kind | ExceptionValue,
    update: (stream: Kind, evaluation: Evaluation) => void
) {
    return new InternalExpression(
        StreamType.make(valueType),
        [],
        (_, evaluation) => {
            const evaluator: Evaluator = evaluation.getEvaluator();

            // Notify the evaluator that we're evaluating a basis stream type so it can keep
            // track of the number of types the node has evaluated, identifying individual streams.
            evaluator.incrementBasisStreamEvaluationCount(
                evaluation.getCreator()
            );

            // Get the stream corresponding to this node.
            const stream = evaluator.getBasisStreamFor(evaluation.getCreator());

            // If we found one of the expected type, update it with the latest values.
            if (stream instanceof streamType) {
                update(stream, evaluation);
                return stream;
            }
            // Otherwise, create a new stream.
            else {
                const newStream = create(evaluation);
                if (newStream instanceof ExceptionValue) return newStream;
                evaluator.addBasisStreamFor(evaluation.getCreator(), newStream);
                return newStream;
            }
        }
    );
}

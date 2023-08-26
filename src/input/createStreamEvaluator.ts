/** Evaluates a basis stream type, given some callbacks */

import InternalExpression from '../basis/InternalExpression';
import StreamType from '../nodes/StreamType';
import type Type from '../nodes/Type';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type StreamValue from '../values/StreamValue';
import Evaluate from '../nodes/Evaluate';
import Reaction from '../nodes/Reaction';

export default function createStreamEvaluator<Kind extends StreamValue>(
    valueType: Type,
    streamType: new (...params: never[]) => Kind,
    create: (evaluation: Evaluation) => Kind | ExceptionValue,
    update: (stream: Kind, evaluation: Evaluation) => void
) {
    return new InternalExpression(
        StreamType.make(valueType),
        [],
        (_, evaluation) => {
            const evaluator: Evaluator = evaluation.getEvaluator();

            const creator = evaluation.getCreator();
            if (creator instanceof Evaluate || creator instanceof Reaction) {
                // Notify the evaluator that we're evaluating a stream so it can keep
                // track of the number of types the node has evaluated, identifying individual streams.
                evaluator.incrementStreamEvaluationCount(creator);

                // Get the stream corresponding to this node.
                const stream = evaluator.getStreamFor(creator);

                // If we found one of the expected type, update it with the latest values.
                if (stream instanceof streamType) {
                    update(stream, evaluation);
                    return stream;
                }
                // Otherwise, create a new stream.
                else {
                    const newStream = create(evaluation);
                    if (newStream instanceof ExceptionValue) return newStream;
                    evaluator.addStreamFor(creator, newStream);
                    return newStream;
                }
            }

            throw new Error(
                'Somehow, something other than an Evaluate or Reaction created a stream.'
            );
        }
    );
}

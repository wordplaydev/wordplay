/** Evaluates a basis stream type, given some callbacks */

import type Evaluation from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import InternalExpression from '#basis/InternalExpression.ts';
import Evaluate from '#nodes/Evaluate.ts';
import Reaction from '#nodes/Reaction.ts';
import StreamType from '#nodes/StreamType.ts';
import type Type from '#nodes/Type.ts';
import type StreamValue from '#values/StreamValue.ts';

export default function createStreamEvaluator<Kind extends StreamValue>(
    valueType: Type,
    streamType: new (...params: never[]) => Kind,
    create: (evaluation: Evaluation) => Kind | ExceptionValue,
    update: (stream: Kind, evaluation: Evaluation) => void,
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
                'Somehow, something other than an Evaluate or Reaction created a stream.',
            );
        },
    );
}

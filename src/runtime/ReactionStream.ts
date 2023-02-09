import type Context from '@nodes/Context';
import type Reaction from '@nodes/Reaction';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import AnyType from '../nodes/AnyType';
import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import StreamDefinition from '../nodes/StreamDefinition';
import type Evaluator from './Evaluator';
import Stream from './Stream';
import type Value from './Value';
import { STREAM_SYMBOL } from '../parser/Symbols';

export default class ReactionStream extends Stream {
    readonly reaction: Reaction;

    constructor(evaluator: Evaluator, reaction: Reaction, initialValue: Value) {
        super(evaluator, ReactionDefinition, initialValue);

        this.reaction = reaction;
    }

    start(): void {}
    stop() {}
    getType(context: Context) {
        return this.reaction.getType(context);
    }
}

/** This isn't ever actually used, it's just here to meet the requirements of the Stream interface. */
const ReactionDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.nodes.Reaction.doc),
    getNameTranslations((t) => STREAM_SYMBOL),
    [],
    ExpressionPlaceholder.make(),
    new AnyType()
);

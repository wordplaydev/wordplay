import type Context from '@nodes/Context';
import type Reaction from '@nodes/Reaction';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import AnyType from '../nodes/AnyType';
import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import StreamDefinition from '../nodes/StreamDefinition';
import type Evaluator from '@runtime/Evaluator';
import StreamValue from '@values/StreamValue';
import type Value from '@values/Value';
import { STREAM_SYMBOL } from '../parser/Symbols';

export default class ReactionStream extends StreamValue<Value, null> {
    readonly reaction: Reaction;

    constructor(evaluator: Evaluator, reaction: Reaction, initialValue: Value) {
        super(evaluator, ReactionDefinition, initialValue, null);

        this.reaction = reaction;
    }

    start(): void {}
    stop() {}
    react() {}
    getType(context: Context) {
        return this.reaction.getType(context);
    }
}

/** This isn't ever actually used, it's just here to meet the requirements of the Stream interface. */
const ReactionDefinition = StreamDefinition.make(
    getDocLocales([], (t) => t.node.Reaction.doc),
    getNameLocales([], (t) => STREAM_SYMBOL),
    [],
    ExpressionPlaceholder.make(),
    new AnyType()
);

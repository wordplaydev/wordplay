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
import type Locales from '../locale/Locales';

export default class ReactionStream extends StreamValue<Value, null> {
    readonly reaction: Reaction;

    constructor(evaluator: Evaluator, reaction: Reaction, initialValue: Value) {
        super(
            evaluator,
            evaluator.project.basis.shares.input.Reaction,
            initialValue,
            null
        );

        this.reaction = reaction;
    }

    start() {
        return;
    }
    stop() {
        return;
    }
    react() {
        return;
    }

    getType(context: Context) {
        return this.reaction.getType(context);
    }
}

/** This isn't ever actually used, it's just here to meet the requirements of the Stream interface. */
export function createReactionDefinition(locales: Locales) {
    return StreamDefinition.make(
        getDocLocales(locales, (t) => t.node.Reaction.doc),
        getNameLocales(locales, () => STREAM_SYMBOL),
        [],
        ExpressionPlaceholder.make(),
        new AnyType()
    );
}

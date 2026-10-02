import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import type Context from '#nodes/Context.ts';
import type Reaction from '#nodes/Reaction.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import StreamValue from '#values/StreamValue.ts';
import type Value from '#values/Value.ts';
import type Locales from '#locale/Locales.ts';
import AnyType from '#nodes/AnyType.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import StreamDefinition from '#nodes/StreamDefinition.ts';
import { STREAM_SYMBOL } from '#parser/Symbols.ts';
import type { StreamKind } from '#values/StreamValue.ts';

export default class ReactionStream extends StreamValue<Value, null> {
    readonly kind: StreamKind = 'reaction';

    readonly reaction: Reaction;

    constructor(
        evaluation: Evaluation,
        reaction: Reaction,
        initialValue: Value,
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.basis.shares.input.Reaction,
            initialValue,
            null,
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
        new AnyType(),
    );
}

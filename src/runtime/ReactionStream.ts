import type Context from '@nodes/Context';
import type Reaction from '@nodes/Reaction';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import type Evaluator from './Evaluator';
import Stream from './Stream';
import type Value from './Value';

export default class ReactionStream extends Stream {
    readonly reaction: Reaction;

    constructor(evaluator: Evaluator, reaction: Reaction, initialValue: Value) {
        super(evaluator, initialValue);

        this.reaction = reaction;
    }

    computeDocs() {
        return getDocTranslations((t) => t.input.reaction.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.reaction.name);
    }

    start(): void {}
    stop() {}
    getType(context: Context) {
        return this.reaction.getType(context);
    }
}

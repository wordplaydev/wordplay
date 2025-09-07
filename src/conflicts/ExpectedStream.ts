import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Locales from '../locale/Locales';
import type Reaction from '../nodes/Reaction';
import Conflict from './Conflict';

export default class ExpectedStream extends Conflict {
    readonly reaction: Reaction;

    constructor(reaction: Reaction) {
        super(true);

        this.reaction = reaction;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.reaction.condition,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Reaction.conflict.ExpectedStream,
                        new NodeRef(this.reaction.condition, locales, context),
                    ),
            },
        };
    }
}

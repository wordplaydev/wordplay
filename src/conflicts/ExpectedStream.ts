import Conflict from './Conflict';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import concretize from '../locale/concretize';
import type Reaction from '../nodes/Reaction';
import type Locales from '../locale/Locales';

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
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Reaction.conflict.ExpectedStream
                        ),
                        new NodeRef(this.reaction.condition, locales, context)
                    ),
            },
        };
    }
}

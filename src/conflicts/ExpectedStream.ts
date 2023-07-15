import Conflict from './Conflict';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import concretize from '../locale/concretize';
import type Reaction from '../nodes/Reaction';

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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Reaction.conflict.ExpectedStream,
                        new NodeRef(this.reaction.condition, locale, context)
                    ),
            },
        };
    }
}

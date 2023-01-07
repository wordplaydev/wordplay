import type Context from '../nodes/Context';
import type Previous from '../nodes/Previous';
import type Type from '../nodes/Type';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class NotAStreamIndex extends Conflict {
    readonly previous: Previous;
    readonly received: Type;

    constructor(access: Previous, received: Type) {
        super(false);

        this.previous = access;
        this.received = received;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.previous.index,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.NotAStreamIndex.primary(
                        new NodeLink(this.received, translation, context)
                    ),
            },
        };
    }
}

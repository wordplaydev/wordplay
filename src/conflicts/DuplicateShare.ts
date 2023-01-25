import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import NodeLink from '@translation/NodeLink';
import type Translation from '@translation/Translation';
import Conflict from './Conflict';

export class DuplicateShare extends Conflict {
    readonly share: Bind;
    readonly other: Bind;
    constructor(share: Bind, other: Bind) {
        super(false);
        this.share = share;
        this.other = other;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.share.names,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.DuplicateShare.primary(
                        new NodeLink(this.other, translation, context)
                    ),
            },
            secondary: {
                node: this.other.names,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.DuplicateShare.secondary(
                        new NodeLink(this.other, translation, context)
                    ),
            },
        };
    }
}

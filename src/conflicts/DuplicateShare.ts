import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Bind.conflict.DuplicateShare.primary
                        ),
                        new NodeRef(this.other, locales, context)
                    ),
            },
            secondary: {
                node: this.other.names,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Bind.conflict.DuplicateShare.secondary
                        ),
                        new NodeRef(this.other, locales, context)
                    ),
            },
        };
    }
}

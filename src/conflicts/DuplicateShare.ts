import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Bind.conflict.DuplicateShare.primary,
                        new NodeRef(this.other, locale, context)
                    ),
            },
            secondary: {
                node: this.other.names,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Bind.conflict.DuplicateShare.secondary,
                        new NodeRef(this.other, locale, context)
                    ),
            },
        };
    }
}

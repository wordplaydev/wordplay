import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class DuplicateShare extends Conflict {
    readonly share: Bind;
    readonly other: Bind;
    constructor(share: Bind, other: Bind) {
        super(false);
        this.share = share;
        this.other = other;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.DuplicateShare;

    getConflictingNodes() {
        return {
            primary: {
                node: this.share.names,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => DuplicateShare.LocalePath(l).primary,
                        new NodeRef(this.other, locales, context),
                    ),
            },
            secondary: {
                node: this.other.names,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => DuplicateShare.LocalePath(l).secondary,
                        new NodeRef(this.other, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return DuplicateShare.LocalePath;
    }
}

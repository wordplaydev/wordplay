import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Token from '@nodes/Token';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class MisplacedShare extends Conflict {
    readonly bind: Bind;
    readonly share: Token;
    constructor(bind: Bind, share: Token) {
        super(false);

        this.bind = bind;
        this.share = share;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.MisplacedShare;

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => MisplacedShare.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return MisplacedShare.LocalePath;
    }
}

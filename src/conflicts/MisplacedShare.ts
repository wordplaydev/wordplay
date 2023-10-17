import type Bind from '@nodes/Bind';
import type Token from '@nodes/Token';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export class MisplacedShare extends Conflict {
    readonly bind: Bind;
    readonly share: Token;
    constructor(bind: Bind, share: Token) {
        super(false);

        this.bind = bind;
        this.share = share;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind,
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get((l) => l.node.Bind.conflict.MisplacedShare)
                    ),
            },
        };
    }
}

import type Bind from '@nodes/Bind';
import type Token from '@nodes/Token';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class UnexpectedEtc extends Conflict {
    readonly etc: Token;
    readonly bind: Bind;
    constructor(etc: Token, bind: Bind) {
        super(false);
        this.etc = etc;
        this.bind = bind;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Bind.conflict.UnexpectedEtc,
                    ),
            },
        };
    }
}

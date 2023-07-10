import type Bind from '@nodes/Bind';
import type Token from '@nodes/Token';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(locale, locale.node.Bind.conflict.UnexpectedEtc),
            },
        };
    }
}

import type Bind from '@nodes/Bind';
import type Token from '@nodes/Token';
import type Translation from '@translation/Translation';
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
                node: this.etc,
                explanation: (translation: Translation) =>
                    translation.conflict.UnexpectedEtc.primary,
            },
        };
    }
}

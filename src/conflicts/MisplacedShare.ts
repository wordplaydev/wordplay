import type Bind from '../nodes/Bind';
import type Token from '../nodes/Token';
import type Translation from '../translation/Translation';
import Conflict from './Conflict';

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
                node: this.share,
                explanation: (translation: Translation) =>
                    translation.conflict.MisplacedShare.primary,
            },
        };
    }
}

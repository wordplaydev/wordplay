import type Bind from '@nodes/Bind';
import type Token from '@nodes/Token';
import type Locale from '@locale/Locale';
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
                explanation: (translation: Locale) =>
                    translation.conflict.MisplacedShare.primary,
            },
        };
    }
}

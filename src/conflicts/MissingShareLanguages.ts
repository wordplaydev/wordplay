import type Bind from '../nodes/Bind';
import type Translation from '../translation/Translation';
import Conflict from './Conflict';

export class MissingShareLanguages extends Conflict {
    readonly share: Bind;

    constructor(share: Bind) {
        super(false);
        this.share = share;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.share,
                explanation: (translation: Translation) =>
                    translation.conflict.MissingShareLanguages.primary,
            },
        };
    }
}

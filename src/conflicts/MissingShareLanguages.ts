import type Bind from '@nodes/Bind';
import type Locale from '@translation/Locale';
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
                explanation: (translation: Locale) =>
                    translation.conflict.MissingShareLanguages.primary,
            },
        };
    }
}

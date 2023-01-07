import type Bind from '../nodes/Bind';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class MissingShareLanguages extends Conflict {
    readonly share: Bind;

    constructor(share: Bind) {
        super(false);
        this.share = share;
    }

    getConflictingNodes() {
        return { primary: this.share };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.MissingShareLanguages.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}

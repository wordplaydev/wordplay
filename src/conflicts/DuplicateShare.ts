import type Bind from '../nodes/Bind';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class DuplicateShare extends Conflict {
    readonly share: Bind;
    readonly other: Bind;
    constructor(share: Bind, other: Bind) {
        super(false);
        this.share = share;
        this.other = other;
    }

    getConflictingNodes() {
        return { primary: this.share.names, secondary: [this.other.names] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.DuplicateShare.primary([
            this.share,
            this.other,
        ]);
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.DuplicateShare.secondary();
    }
}
